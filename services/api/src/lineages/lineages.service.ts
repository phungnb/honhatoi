import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LineageRole, Prisma } from '@prisma/client';
import { Actor, LineageAction, can } from '../common/permissions';
import { CreateLineageDto } from './dto/create-lineage.dto';
import { UpdateLineageDto } from './dto/update-lineage.dto';

/**
 * LineagesService — triển khai đầy đủ module Dòng họ & thành viên.
 *
 * - Mọi thao tác đọc/ghi đều gắn lineageId cụ thể; LineageGuard đảm bảo user là
 *   thành viên được duyệt (cô lập dữ liệu giữa các họ — HNT-T-010).
 * - 3 vai trò (MEMBER, EDITOR, ADMIN) + Trưởng tộc (lineages.owner_user_id),
 *   kiểm tra qua can() trong common/permissions.ts. Trưởng tộc luôn tồn tại
 *   đúng một người mỗi họ: không bị xóa/hạ, muốn rời phải chuyển giao trước.
 */

const ASSIGNABLE_ROLES: string[] = [
  LineageRole.MEMBER,
  LineageRole.EDITOR,
  LineageRole.ADMIN,
];

@Injectable()
export class LineagesService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- helpers

  private async membershipOrThrow(lineageId: string, userId: string) {
    const m = await this.prisma.lineageMembership.findFirst({
      where: { lineageId, userId, status: 'approved' },
    });
    if (!m)
      throw new ForbiddenException({
        code: 'NOT_LINEAGE_MEMBER',
        message:
          'Bạn không phải thành viên được duyệt của dòng họ này — không thể truy cập dữ liệu của họ khác',
      });
    return m;
  }

  /** Membership + vai trò hiệu lực (kèm cờ Trưởng tộc) của user trong họ. */
  private async actorOrThrow(lineageId: string, userId: string) {
    const [m, lineage] = await Promise.all([
      this.membershipOrThrow(lineageId, userId),
      this.prisma.lineage.findUnique({
        where: { id: lineageId },
        select: { ownerUserId: true },
      }),
    ]);
    const actor: Actor = {
      role: m.role,
      isOwner: lineage?.ownerUserId === userId,
    };
    return { membership: m, actor, ownerUserId: lineage?.ownerUserId ?? null };
  }

  private async requirePerm(
    lineageId: string,
    userId: string,
    action: LineageAction,
  ) {
    const ctx = await this.actorOrThrow(lineageId, userId);
    if (!can(ctx.actor, action))
      throw new ForbiddenException({
        code: 'REQUIRED_ROLE',
        message:
          action === 'owner'
            ? 'Thao tác này chỉ Trưởng tộc (người sở hữu dòng họ) được làm'
            : 'Bạn không có quyền thực hiện thao tác này trong dòng họ',
      });
    return ctx;
  }

  private assertValidRole(role: string) {
    if (!ASSIGNABLE_ROLES.includes(role))
      throw new BadRequestException({
        code: 'INVALID_ROLE',
        message: `Vai trò không hợp lệ: ${role} (chỉ nhận MEMBER, EDITOR, ADMIN)`,
      });
  }

  /**
   * Thu hồi mọi quyền còn sót khi một người không còn là thành viên họ:
   * bản ghi genealogy_permissions cũ và tư cách thành viên trong các nhóm
   * chat gắn với họ. Gọi trong cùng transaction với việc xóa membership.
   */
  private async revokeLineageAccess(
    tx: Prisma.TransactionClient,
    lineageId: string,
    userId: string,
  ) {
    await tx.genealogyPermission.deleteMany({ where: { lineageId, userId } });
    await tx.conversationMember.updateMany({
      where: { userId, leftAt: null, conversation: { lineageId } },
      data: { leftAt: new Date() },
    });
  }

  private ownerForbidden(): never {
    throw new ForbiddenException({
      code: 'OWNER_PROTECTED',
      message:
        'Không thể thay đổi hoặc xóa Trưởng tộc — Trưởng tộc cần chuyển giao quyền sở hữu trước',
    });
  }

  private async audit(
    lineageId: string,
    actorId: string,
    action: string,
    targetType?: string,
    targetId?: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        lineageId,
        actorId,
        action,
        targetType,
        targetId,
        metadata: (metadata ?? Prisma.DbNull) as Prisma.InputJsonValue,
      },
    });
  }

  // ---------------------------------------------------------------- create

  /**
   * POST /lineages — tạo dòng họ; người tạo thành ADMIN + Trưởng tộc
   * (ownerUserId), tất cả trong một transaction.
   */
  async create(userId: string, dto: CreateLineageDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const lineage = await tx.lineage.create({
        data: { ...dto, createdBy: userId, ownerUserId: userId },
      });
      await tx.lineageMembership.create({
        data: {
          lineageId: lineage.id,
          userId,
          role: LineageRole.ADMIN,
          status: 'approved',
          joinedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          lineageId: lineage.id,
          actorId: userId,
          action: 'lineage.create',
          targetType: 'lineage',
          targetId: lineage.id,
          metadata: { name: lineage.name } as Prisma.InputJsonValue,
        },
      });
      return lineage;
    });
    return { data: { lineage: result }, error: null };
  }

  /** GET /lineages — chỉ các họ mà user là thành viên được duyệt (cursor paging). */
  async findMine(userId: string, cursor?: string, limit = 30) {
    const take = Math.min(Math.max(limit || 30, 1), 100);
    const memberships = await this.prisma.lineageMembership.findMany({
      where: {
        userId,
        status: 'approved',
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      include: { lineage: true },
      orderBy: { id: 'asc' },
      take: take + 1,
    });
    const hasMore = memberships.length > take;
    const page = memberships.slice(0, take);
    return {
      data: {
        lineages: page.map((m) => ({
          ...(m.lineage as object),
          myRole: m.role,
          isOwner: m.lineage.ownerUserId === userId,
          joinedAt: m.joinedAt,
        })),
        next_cursor: hasMore ? page[page.length - 1].id : null,
      },
      error: null,
    };
  }

  /** GET /lineages/:id — chi tiết kèm thống kê (đã qua LineageGuard). */
  async findOne(lineageId: string) {
    const lineage = await this.prisma.lineage.findFirst({
      where: { id: lineageId, deletedAt: null },
    });
    if (!lineage)
      throw new NotFoundException({
        code: 'LINEAGE_NOT_FOUND',
        message: 'Không tìm thấy dòng họ',
      });
    const [memberCount, personCount] = await Promise.all([
      this.prisma.lineageMembership.count({
        where: { lineageId, status: 'approved' },
      }),
      this.prisma.familyPerson.count({
        where: { lineageId, deletedAt: null },
      }),
    ]);
    return {
      data: { lineage: { ...lineage, memberCount, personCount } },
      error: null,
    };
  }

  /** PATCH /lineages/:id — Ban quản trị trở lên. */
  async update(lineageId: string, userId: string, dto: UpdateLineageDto) {
    await this.requirePerm(lineageId, userId, 'members.manage');
    const lineage = await this.prisma.lineage.update({
      where: { id: lineageId },
      data: { ...dto },
    });
    await this.audit(lineageId, userId, 'lineage.update', 'lineage', lineageId, {});
    return { data: { lineage }, error: null };
  }

  /**
   * DELETE /lineages/:id — chỉ Trưởng tộc; xóa mềm.
   * Còn hồ sơ gia phả → 422 (bảo toàn dữ liệu, FK RESTRICT).
   */
  async remove(lineageId: string, userId: string) {
    await this.requirePerm(lineageId, userId, 'owner');
    const personCount = await this.prisma.familyPerson.count({
      where: { lineageId, deletedAt: null },
    });
    if (personCount > 0)
      throw new ConflictException({
        code: 'LINEAGE_HAS_PERSONS',
        message: `Dòng họ còn ${personCount} hồ sơ gia phả — không thể xóa. Hãy chuyển giao quản trị thay vì xóa.`,
      });
    const lineage = await this.prisma.lineage.update({
      where: { id: lineageId },
      data: { deletedAt: new Date() },
    });
    await this.audit(lineageId, userId, 'lineage.delete', 'lineage', lineageId, {});
    return { data: { lineage }, error: null };
  }

  // ---------------------------------------------------------------- members

  /** GET /lineages/:id/members — phân trang cursor, lọc theo chi. */
  async findMembers(
    lineageId: string,
    query: { cursor?: string; limit?: number; branch?: string },
  ) {
    const take = Math.min(Math.max(query.limit ?? 30, 1), 100);
    const lineage = await this.prisma.lineage.findUnique({
      where: { id: lineageId },
      select: { ownerUserId: true },
    });
    const members = await this.prisma.lineageMembership.findMany({
      where: {
        lineageId,
        status: 'approved',
        ...(query.branch ? { requestedBranch: query.branch } : {}),
        ...(query.cursor ? { id: { gt: query.cursor } } : {}),
      },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { id: 'asc' },
      take: take + 1,
    });
    const hasMore = members.length > take;
    const page = members.slice(0, take);
    return {
      data: {
        members: page.map((m) => ({
          userId: m.userId,
          role: m.role,
          isOwner: m.userId === lineage?.ownerUserId,
          branch: m.requestedBranch,
          joinedAt: m.joinedAt,
          user: m.user,
        })),
        next_cursor: hasMore ? page[page.length - 1].id : null,
      },
      error: null,
    };
  }

  /**
   * POST /lineages/:id/join-requests — gửi yêu cầu tham gia.
   * Dòng họ 'private' chỉ nhận qua mã mời.
   */
  async requestJoin(
    lineageId: string,
    userId: string,
    dto: { requestedBranch?: string; requestedRelation?: string },
  ) {
    const lineage = await this.prisma.lineage.findFirst({
      where: { id: lineageId, deletedAt: null },
    });
    if (!lineage)
      throw new NotFoundException({
        code: 'LINEAGE_NOT_FOUND',
        message: 'Không tìm thấy dòng họ',
      });
    if (lineage.visibility === 'private')
      throw new ForbiddenException({
        code: 'LINEAGE_PRIVATE',
        message: 'Dòng họ này chỉ nhận thành viên qua mã mời',
      });
    const existing = await this.prisma.lineageMembership.findUnique({
      where: { lineageId_userId: { lineageId, userId } },
    });
    if (existing)
      throw new ForbiddenException({
        code: 'ALREADY_MEMBER',
        message: 'Đã là thành viên hoặc đang chờ duyệt',
      });
    const membership = await this.prisma.lineageMembership.create({
      data: { lineageId, userId, status: 'pending', ...dto },
    });
    return { data: { membership }, error: null };
  }

  /** GET /lineages/:id/join-requests — hàng đợi chờ duyệt (Ban quản trị). */
  async listJoinRequests(lineageId: string, userId: string) {
    await this.requirePerm(lineageId, userId, 'members.manage');
    const requests = await this.prisma.lineageMembership.findMany({
      where: { lineageId, status: 'pending' },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    return { data: { requests }, error: null };
  }

  /**
   * POST /lineages/:id/join-requests/:rid/approve|reject — Ban quản trị.
   * Duyệt: gán MEMBER/EDITOR (gán ADMIN chỉ Trưởng tộc), ghi audit — trong
   * transaction. Quyền gia phả suy ra từ vai trò.
   */
  async reviewJoin(
    lineageId: string,
    requestId: string,
    reviewerId: string,
    approve: boolean,
    role?: string,
  ) {
    const reviewer = await this.requirePerm(
      lineageId,
      reviewerId,
      'members.manage',
    );

    const request = await this.prisma.lineageMembership.findUnique({
      where: { id: requestId },
    });
    if (!request || request.lineageId !== lineageId)
      throw new NotFoundException({
        code: 'JOIN_REQUEST_NOT_FOUND',
        message: 'Không tìm thấy yêu cầu tham gia',
      });
    if (request.status !== 'pending')
      throw new ConflictException({
        code: 'JOIN_REQUEST_NOT_PENDING',
        message: 'Yêu cầu đã được xử lý trước đó',
      });

    if (!approve) {
      const rejected = await this.prisma.lineageMembership.update({
        where: { id: requestId },
        data: { status: 'rejected', reviewedBy: reviewerId },
      });
      await this.audit(
        lineageId,
        reviewerId,
        'lineage.member.reject',
        'lineage_membership',
        requestId,
        { userId: request.userId },
      );
      return { data: { membership: rejected }, error: null };
    }

    const newRole = role ?? LineageRole.MEMBER;
    this.assertValidRole(newRole);
    if (newRole === LineageRole.ADMIN && !can(reviewer.actor, 'owner'))
      throw new ForbiddenException({
        code: 'ROLE_ESCALATION_FORBIDDEN',
        message: 'Chỉ Trưởng tộc được gán vai trò Ban quản trị',
      });

    const membership = await this.prisma.$transaction(async (tx) => {
      const m = await tx.lineageMembership.update({
        where: { id: requestId },
        data: {
          status: 'approved',
          reviewedBy: reviewerId,
          joinedAt: new Date(),
          role: newRole as LineageRole,
        },
      });
      await tx.auditLog.create({
        data: {
          lineageId,
          actorId: reviewerId,
          action: 'lineage.member.approve',
          targetType: 'lineage_membership',
          targetId: requestId,
          metadata: { userId: request.userId, role: newRole } as Prisma.InputJsonValue,
        },
      });
      return m;
    });
    return { data: { membership }, error: null };
  }

  /**
   * PATCH /lineages/:id/members/:userId/role — đổi vai trò.
   * - MEMBER ↔ EDITOR: Ban quản trị.
   * - Cấp/thu ADMIN: chỉ Trưởng tộc.
   * - Trưởng tộc không bị đổi vai trò (dùng chuyển quyền sở hữu).
   */
  async changeRole(
    lineageId: string,
    adminId: string,
    targetUserId: string,
    role: string,
  ) {
    this.assertValidRole(role);
    const { actor, ownerUserId } = await this.requirePerm(
      lineageId,
      adminId,
      'roles.editor',
    );
    const target = await this.prisma.lineageMembership.findUnique({
      where: { lineageId_userId: { lineageId, userId: targetUserId } },
    });
    if (!target || target.status !== 'approved')
      throw new NotFoundException({
        code: 'MEMBER_NOT_FOUND',
        message: 'Không tìm thấy thành viên',
      });
    if (targetUserId === ownerUserId) this.ownerForbidden();
    if (
      (role === LineageRole.ADMIN || target.role === LineageRole.ADMIN) &&
      !can(actor, 'owner')
    )
      throw new ForbiddenException({
        code: 'ROLE_ESCALATION_FORBIDDEN',
        message: 'Chỉ Trưởng tộc được cấp hoặc thu vai trò Ban quản trị',
      });
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.genealogyPermission.deleteMany({
        where: { lineageId, userId: targetUserId, personId: null },
      });
      return tx.lineageMembership.update({
        where: { id: target.id },
        data: { role: role as LineageRole },
      });
    });
    await this.audit(
      lineageId,
      adminId,
      'lineage.member.role_change',
      'lineage_membership',
      target.id,
      { userId: targetUserId, from: target.role, to: role },
    );
    return { data: { membership: updated }, error: null };
  }

  /**
   * POST /lineages/:id/transfer-ownership — Trưởng tộc chuyển quyền sở hữu
   * cho một thành viên khác. Người nhận thành ADMIN; người cũ giữ ADMIN.
   */
  async transferOwnership(
    lineageId: string,
    ownerId: string,
    targetUserId: string,
  ) {
    await this.requirePerm(lineageId, ownerId, 'owner');
    if (targetUserId === ownerId)
      throw new BadRequestException({
        code: 'ALREADY_OWNER',
        message: 'Bạn đang là Trưởng tộc',
      });
    const target = await this.prisma.lineageMembership.findUnique({
      where: { lineageId_userId: { lineageId, userId: targetUserId } },
    });
    if (!target || target.status !== 'approved')
      throw new NotFoundException({
        code: 'MEMBER_NOT_FOUND',
        message: 'Người nhận phải là thành viên đã được duyệt của họ',
      });
    await this.prisma.$transaction(async (tx) => {
      await tx.lineage.update({
        where: { id: lineageId },
        data: { ownerUserId: targetUserId },
      });
      await tx.lineageMembership.update({
        where: { id: target.id },
        data: { role: LineageRole.ADMIN },
      });
      await tx.auditLog.create({
        data: {
          lineageId,
          actorId: ownerId,
          action: 'lineage.owner.transfer',
          targetType: 'lineage',
          targetId: lineageId,
          metadata: { from: ownerId, to: targetUserId } as Prisma.InputJsonValue,
        },
      });
    });
    return { data: { ownerUserId: targetUserId }, error: null };
  }

  /**
   * DELETE /lineages/:id/members/:userId — xóa thành viên (Ban quản trị).
   * Không xóa được Trưởng tộc; xóa ADMIN cần Trưởng tộc; tự rời dùng /leave.
   */
  async removeMember(lineageId: string, adminId: string, targetUserId: string) {
    const { actor, ownerUserId } = await this.requirePerm(
      lineageId,
      adminId,
      'members.manage',
    );
    if (targetUserId === adminId)
      throw new BadRequestException({
        code: 'USE_LEAVE_ENDPOINT',
        message: 'Để rời họ, hãy dùng endpoint /leave',
      });
    const target = await this.prisma.lineageMembership.findUnique({
      where: { lineageId_userId: { lineageId, userId: targetUserId } },
    });
    if (!target || target.status !== 'approved')
      throw new NotFoundException({
        code: 'MEMBER_NOT_FOUND',
        message: 'Không tìm thấy thành viên',
      });
    if (targetUserId === ownerUserId) this.ownerForbidden();
    if (target.role === LineageRole.ADMIN && !can(actor, 'owner'))
      throw new ForbiddenException({
        code: 'TARGET_RANK_TOO_HIGH',
        message: 'Chỉ Trưởng tộc được xóa thành viên Ban quản trị',
      });
    await this.prisma.$transaction(async (tx) => {
      await tx.lineageMembership.delete({ where: { id: target.id } });
      await this.revokeLineageAccess(tx, lineageId, targetUserId);
      await tx.auditLog.create({
        data: {
          lineageId,
          actorId: adminId,
          action: 'lineage.member.remove',
          targetType: 'lineage_membership',
          targetId: target.id,
          metadata: { userId: targetUserId } as Prisma.InputJsonValue,
        },
      });
    });
    return { data: { removed: true }, error: null };
  }

  /** POST /lineages/:id/leave — tự rời khỏi dòng họ. */
  async leave(lineageId: string, userId: string) {
    const membership = await this.prisma.lineageMembership.findUnique({
      where: { lineageId_userId: { lineageId, userId } },
    });
    if (!membership || membership.status !== 'approved')
      throw new NotFoundException({
        code: 'MEMBER_NOT_FOUND',
        message: 'Bạn không phải thành viên của dòng họ này',
      });
    const lineage = await this.prisma.lineage.findUnique({
      where: { id: lineageId },
      select: { ownerUserId: true },
    });
    if (lineage?.ownerUserId === userId)
      throw new ForbiddenException({
        code: 'OWNER_MUST_TRANSFER',
        message: 'Bạn là Trưởng tộc — hãy chuyển quyền sở hữu trước khi rời họ',
      });
    await this.prisma.$transaction(async (tx) => {
      await tx.lineageMembership.delete({ where: { id: membership.id } });
      await this.revokeLineageAccess(tx, lineageId, userId);
    });
    return { data: { left: true }, error: null };
  }

  // ---------------------------------------------------------------- invites

  /** POST /lineages/:id/invites — tạo mã mời (Ban quản trị). */
  async createInvite(
    lineageId: string,
    userId: string,
    opts: { maxUses?: number; expiresInHours?: number },
  ) {
    await this.requirePerm(lineageId, userId, 'members.manage');
    const code = randomBytes(6).toString('hex').toUpperCase();
    const invite = await this.prisma.lineageInvite.create({
      data: {
        lineageId,
        code,
        createdBy: userId,
        maxUses: opts.maxUses ?? null,
        expiresAt: opts.expiresInHours
          ? new Date(Date.now() + opts.expiresInHours * 3600_000)
          : null,
      },
    });
    await this.audit(
      lineageId,
      userId,
      'lineage.invite.create',
      'lineage_invite',
      invite.id,
      { code },
    );
    return { data: { invite }, error: null };
  }

  /** POST /lineages/:id/join-by-code — tham gia bằng mã mời (kể cả họ private). */
  async joinByCode(lineageId: string, userId: string, code: string) {
    const invite = await this.prisma.lineageInvite.findUnique({
      where: { code: code.toUpperCase().trim() },
    });
    if (
      !invite ||
      invite.lineageId !== lineageId ||
      invite.revokedAt ||
      (invite.expiresAt && invite.expiresAt < new Date()) ||
      (invite.maxUses != null && invite.usedCount >= invite.maxUses)
    )
      throw new BadRequestException({
        code: 'INVALID_INVITE_CODE',
        message: 'Mã mời không hợp lệ, đã hết hạn hoặc đã hết lượt dùng',
      });
    const existing = await this.prisma.lineageMembership.findUnique({
      where: { lineageId_userId: { lineageId, userId } },
    });
    if (existing)
      throw new ForbiddenException({
        code: 'ALREADY_MEMBER',
        message: 'Đã là thành viên hoặc đang chờ duyệt',
      });
    const membership = await this.prisma.$transaction(async (tx) => {
      const m = await tx.lineageMembership.create({
        data: {
          lineageId,
          userId,
          role: LineageRole.MEMBER,
          status: 'approved',
          joinedAt: new Date(),
        },
      });
      await tx.lineageInvite.update({
        where: { id: invite.id },
        data: { usedCount: { increment: 1 } },
      });
      await tx.auditLog.create({
        data: {
          lineageId,
          actorId: userId,
          action: 'lineage.member.join_by_code',
          targetType: 'lineage_membership',
          targetId: m.id,
          metadata: { inviteCode: invite.code } as Prisma.InputJsonValue,
        },
      });
      return m;
    });
    return { data: { membership }, error: null };
  }
}
