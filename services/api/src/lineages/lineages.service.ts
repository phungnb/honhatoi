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
import { CreateLineageDto } from './dto/create-lineage.dto';
import { UpdateLineageDto } from './dto/update-lineage.dto';

/**
 * LineagesService — triển khai đầy đủ module Dòng họ & thành viên.
 *
 * - Mọi thao tác đọc/ghi đều gắn lineageId cụ thể; LineageGuard đảm bảo user là
 *   thành viên được duyệt (cô lập dữ liệu giữa các họ — HNT-T-010).
 * - Phân vai trò theo LineageRole (7 giá trị); kiểm tra thứ bậc khi duyệt
 *   thành viên / đổi vai trò / xóa thành viên; bảo vệ quản trị cấp cao cuối cùng.
 */

const ROLE_RANK: Record<string, number> = {
  GUEST: 0,
  APP_MEMBER: 1,
  MEMBER: 2,
  GENEALOGY_MANAGER: 3,
  ADMIN: 4,
  SENIOR_ADMIN: 5,
  SYSTEM_ADMIN: 6,
};

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

  /** Yêu cầu vai trò tối thiểu trong dòng họ. */
  private async requireRole(lineageId: string, userId: string, minRole: string) {
    const m = await this.membershipOrThrow(lineageId, userId);
    const rank = ROLE_RANK[m.role as string] ?? -1;
    if (rank < (ROLE_RANK[minRole] ?? 99))
      throw new ForbiddenException({
        code: 'REQUIRED_ROLE',
        message: `Thao tác này yêu cầu vai trò từ ${minRole} trở lên`,
      });
    return m;
  }

  private assertValidRole(role: string) {
    if (!(role in ROLE_RANK))
      throw new BadRequestException({
        code: 'INVALID_ROLE',
        message: `Vai trò không hợp lệ: ${role}`,
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
   * POST /lineages — tạo dòng họ; người tạo thành SENIOR_ADMIN + full quyền
   * gia phả, tất cả trong một transaction.
   */
  async create(userId: string, dto: CreateLineageDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const lineage = await tx.lineage.create({
        data: { ...dto, createdBy: userId },
      });
      await tx.lineageMembership.create({
        data: {
          lineageId: lineage.id,
          userId,
          role: LineageRole.SENIOR_ADMIN,
          status: 'approved',
          joinedAt: new Date(),
        },
      });
      await tx.genealogyPermission.create({
        data: {
          lineageId: lineage.id,
          userId,
          personId: null,
          canView: true,
          canPropose: true,
          canEdit: true,
          canVerify: true,
          canManage: true,
          grantedBy: userId,
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

  /** PATCH /lineages/:id — cần ADMIN trở lên. */
  async update(lineageId: string, userId: string, dto: UpdateLineageDto) {
    await this.requireRole(lineageId, userId, 'ADMIN');
    const lineage = await this.prisma.lineage.update({
      where: { id: lineageId },
      data: { ...dto },
    });
    await this.audit(lineageId, userId, 'lineage.update', 'lineage', lineageId, {});
    return { data: { lineage }, error: null };
  }

  /**
   * DELETE /lineages/:id — SENIOR_ADMIN+; xóa mềm.
   * Còn hồ sơ gia phả → 422 (bảo toàn dữ liệu, FK RESTRICT).
   */
  async remove(lineageId: string, userId: string) {
    await this.requireRole(lineageId, userId, 'SENIOR_ADMIN');
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

  /** GET /lineages/:id/join-requests — hàng đợi chờ duyệt (ADMIN+). */
  async listJoinRequests(lineageId: string, userId: string) {
    await this.requireRole(lineageId, userId, 'ADMIN');
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
   * POST /lineages/:id/join-requests/:rid/approve|reject — ADMIN+.
   * Duyệt: gán vai trò (không vượt quá vai trò người duyệt), cấp quyền gia phả
   * mặc định (xem + đề xuất), ghi audit — tất cả trong transaction.
   */
  async reviewJoin(
    lineageId: string,
    requestId: string,
    reviewerId: string,
    approve: boolean,
    role?: string,
  ) {
    const reviewer = await this.requireRole(lineageId, reviewerId, 'ADMIN');

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

    const newRole = role ?? 'MEMBER';
    this.assertValidRole(newRole);
    if ((ROLE_RANK[newRole] ?? 0) > (ROLE_RANK[reviewer.role as string] ?? 0))
      throw new ForbiddenException({
        code: 'ROLE_ESCALATION_FORBIDDEN',
        message: 'Không thể gán vai trò cao hơn vai trò của chính bạn',
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
      const existingPerm = await tx.genealogyPermission.findFirst({
        where: { lineageId, userId: request.userId, personId: null },
      });
      if (!existingPerm) {
        await tx.genealogyPermission.create({
          data: {
            lineageId,
            userId: request.userId,
            personId: null,
            canView: true,
            canPropose: true,
            canEdit: false,
            canVerify: false,
            canManage: false,
            grantedBy: reviewerId,
          },
        });
      }
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
   * PATCH /lineages/:id/members/:userId/role — đổi vai trò (ADMIN+).
   * Không gán vai trò cao hơn mình; bảo vệ quản trị cấp cao cuối cùng.
   */
  async changeRole(
    lineageId: string,
    adminId: string,
    targetUserId: string,
    role: string,
  ) {
    const admin = await this.requireRole(lineageId, adminId, 'ADMIN');
    this.assertValidRole(role);
    if ((ROLE_RANK[role] ?? 0) > (ROLE_RANK[admin.role as string] ?? 0))
      throw new ForbiddenException({
        code: 'ROLE_ESCALATION_FORBIDDEN',
        message: 'Không thể gán vai trò cao hơn vai trò của chính bạn',
      });
    const target = await this.prisma.lineageMembership.findUnique({
      where: { lineageId_userId: { lineageId, userId: targetUserId } },
    });
    if (!target || target.status !== 'approved')
      throw new NotFoundException({
        code: 'MEMBER_NOT_FOUND',
        message: 'Không tìm thấy thành viên',
      });
    if (
      targetUserId === adminId &&
      (ROLE_RANK[target.role as string] ?? 0) >= ROLE_RANK['SENIOR_ADMIN'] &&
      (ROLE_RANK[role] ?? 0) < ROLE_RANK['SENIOR_ADMIN']
    ) {
      const seniors = await this.prisma.lineageMembership.count({
        where: {
          lineageId,
          status: 'approved',
          role: { in: ['SENIOR_ADMIN', 'SYSTEM_ADMIN'] },
          NOT: { userId: adminId },
        },
      });
      if (seniors === 0)
        throw new ForbiddenException({
          code: 'LAST_SENIOR_ADMIN',
          message:
            'Bạn là quản trị cấp cao cuối cùng — hãy chuyển giao trước khi hạ vai trò',
        });
    }
    const updated = await this.prisma.lineageMembership.update({
      where: { id: target.id },
      data: { role: role as LineageRole },
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
   * DELETE /lineages/:id/members/:userId — xóa thành viên (ADMIN+).
   * Không được xóa quản trị cấp cao cuối cùng; tự rời họ dùng /leave.
   */
  async removeMember(lineageId: string, adminId: string, targetUserId: string) {
    await this.requireRole(lineageId, adminId, 'ADMIN');
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
    if ((ROLE_RANK[target.role as string] ?? 0) >= ROLE_RANK['SENIOR_ADMIN']) {
      const seniors = await this.prisma.lineageMembership.count({
        where: {
          lineageId,
          status: 'approved',
          role: { in: ['SENIOR_ADMIN', 'SYSTEM_ADMIN'] },
          NOT: { userId: targetUserId },
        },
      });
      if (seniors === 0)
        throw new ForbiddenException({
          code: 'LAST_SENIOR_ADMIN',
          message: 'Không thể xóa quản trị cấp cao cuối cùng của dòng họ',
        });
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.lineageMembership.delete({ where: { id: target.id } });
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
    if ((ROLE_RANK[membership.role as string] ?? 0) >= ROLE_RANK['SENIOR_ADMIN']) {
      const seniors = await this.prisma.lineageMembership.count({
        where: {
          lineageId,
          status: 'approved',
          role: { in: ['SENIOR_ADMIN', 'SYSTEM_ADMIN'] },
          NOT: { userId },
        },
      });
      if (seniors === 0)
        throw new ForbiddenException({
          code: 'LAST_SENIOR_ADMIN',
          message: 'Bạn là quản trị cấp cao cuối cùng — hãy chuyển giao trước khi rời họ',
        });
    }
    await this.prisma.lineageMembership.delete({
      where: { id: membership.id },
    });
    return { data: { left: true }, error: null };
  }

  // ---------------------------------------------------------------- invites

  /** POST /lineages/:id/invites — tạo mã mời (ADMIN+). */
  async createInvite(
    lineageId: string,
    userId: string,
    opts: { maxUses?: number; expiresInHours?: number },
  ) {
    await this.requireRole(lineageId, userId, 'ADMIN');
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
          role: 'MEMBER' as LineageRole,
          status: 'approved',
          joinedAt: new Date(),
        },
      });
      const existingPerm = await tx.genealogyPermission.findFirst({
        where: { lineageId, userId, personId: null },
      });
      if (!existingPerm) {
        await tx.genealogyPermission.create({
          data: {
            lineageId,
            userId,
            personId: null,
            canView: true,
            canPropose: true,
            canEdit: false,
            canVerify: false,
            canManage: false,
          },
        });
      }
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
