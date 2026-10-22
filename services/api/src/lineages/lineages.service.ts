import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LineageRole } from '@prisma/client';
import { CreateLineageDto } from './dto/create-lineage.dto';
import { UpdateLineageDto } from './dto/update-lineage.dto';

/**
 * LineagesService (khung).
 * Mọi thao tác đọc/ghi đều gắn lineageId cụ thể; LineageGuard đảm bảo user là
 * thành viên được duyệt của dòng họ đó (cô lập dữ liệu giữa các họ — HNT-T-010).
 */
@Injectable()
export class LineagesService {
  constructor(private readonly prisma: PrismaService) {}

  /** POST /lineages — tạo dòng họ; người tạo thành senior_admin. */
  async create(userId: string, dto: CreateLineageDto) {
    // TODO: transaction — tạo lineage + lineage_memberships(role=senior_admin,
    // status=approved, joined_at=now()) + audit_logs('lineage.create').
    const lineage = await this.prisma.lineage.create({ data: { ...dto, createdBy: userId } });
    return { data: { lineage }, error: null };
  }

  /** GET /lineages — chỉ dòng họ có membership approved của user. */
  async findMine(userId: string) {
    // TODO: cursor pagination (HNT-T-016); join lineage_memberships status='approved'.
    const memberships = await this.prisma.lineageMembership.findMany({
      where: { userId, status: 'approved' },
      include: { lineage: true },
    });
    return { data: { lineages: memberships.map((m) => m.lineage), next_cursor: null }, error: null };
  }

  /** GET /lineages/:id — chi tiết (đã qua LineageGuard). */
  async findOne(lineageId: string) {
    const lineage = await this.prisma.lineage.findFirst({
      where: { id: lineageId, deletedAt: null },
    });
    if (!lineage) throw new NotFoundException({ code: 'LINEAGE_NOT_FOUND', message: 'Không tìm thấy dòng họ' });
    return { data: { lineage }, error: null };
  }

  /** PATCH /lineages/:id — cần role admin trở lên (TODO: kiểm tra role). */
  async update(lineageId: string, dto: UpdateLineageDto) {
    const lineage = await this.prisma.lineage.update({ where: { id: lineageId }, data: dto });
    return { data: { lineage }, error: null };
  }

  /** DELETE /lineages/:id — senior_admin; RESTRICT nếu còn family_persons. */
  async remove(lineageId: string) {
    // TODO: soft-delete (deleted_at); FK family_persons ON DELETE RESTRICT sẽ
    // chặn xóa cứng khi còn hồ sơ — kiểm tra trước và trả 422 thân thiện.
    const lineage = await this.prisma.lineage.update({
      where: { id: lineageId },
      data: { deletedAt: new Date() },
    });
    return { data: { lineage }, error: null };
  }

  /** GET /lineages/:id/members — phân trang, lọc theo chi/nhánh; trường nhạy cảm lọc theo quyền. */
  async findMembers(lineageId: string, query: { cursor?: string; limit?: number; branch?: string }) {
    // TODO: cursor pagination + filter branch; ẩn phone/email/... nếu không có quyền xem.
    const members = await this.prisma.lineageMembership.findMany({
      where: { lineageId, status: 'approved', ...(query.branch ? { requestedBranch: query.branch } : {}) },
      include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
      take: Math.min(query.limit ?? 30, 100),
    });
    return { data: { members, next_cursor: null }, error: null };
  }

  /** POST /lineages/:id/join-requests — gửi yêu cầu tham gia. */
  async requestJoin(lineageId: string, userId: string, dto: { requestedBranch?: string; requestedRelation?: string }) {
    const existing = await this.prisma.lineageMembership.findUnique({
      where: { lineageId_userId: { lineageId, userId } },
    });
    if (existing) {
      throw new ForbiddenException({ code: 'ALREADY_MEMBER', message: 'Đã là thành viên hoặc đang chờ duyệt' });
    }
    const membership = await this.prisma.lineageMembership.create({
      data: { lineageId, userId, status: 'pending', ...dto },
    });
    return { data: { membership }, error: null };
  }

  /** POST /lineages/:id/join-requests/:rid/approve|reject — admin trở lên + audit log. */
  async reviewJoin(lineageId: string, requestId: string, reviewerId: string, approve: boolean, role?: string) {
    // TODO: kiểm tra reviewer có role admin+ trong lineage; cập nhật status,
    // joined_at, cấp genealogy_permissions mặc định (can_view/can_propose);
    // ghi audit_logs('lineage.member.approve'|'lineage.member.reject').
    const membership = await this.prisma.lineageMembership.update({
      where: { id: requestId },
      data: {
        status: approve ? 'approved' : 'rejected',
        reviewedBy: reviewerId,
        joinedAt: approve ? new Date() : undefined,
        ...(approve && role ? { role: role as LineageRole } : {}),
      },
    });
    return { data: { membership }, error: null };
  }
}
