import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReportDto } from './dto/report.dto';

/** Tối đa số báo cáo một người gửi trong 1 giờ (chống lạm dụng). */
const REPORTS_PER_HOUR = 20;

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam, quảng cáo',
  xuc_pham: 'Xúc phạm, gây gổ',
  sai_su_that: 'Sai sự thật',
  rieng_tu: 'Lộ thông tin riêng tư',
  lua_dao: 'Lừa đảo',
  khac: 'Lý do khác',
};

interface Target {
  lineageId: string | null;
  authorId: string | null;
  preview: string;
}

/**
 * ReportsService — báo cáo nội dung (đặc tả 7.1). Người báo cáo phải đang
 * xem được nội dung đó (thành viên cuộc trò chuyện / dòng họ). Báo cáo về
 * nội dung trong một họ chuyển cho Ban quản trị họ đó xử lý; báo cáo trong
 * chat 1-1 hoặc về tài khoản (không gắn họ) chuyển cho quản trị nền tảng.
 */
@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async approvedIn(lineageId: string, userId: string) {
    return this.prisma.lineageMembership.findFirst({
      where: { lineageId, userId, status: 'approved' },
      include: { lineage: { select: { ownerUserId: true } } },
    });
  }

  /** Tra nội dung bị báo cáo, kiểm tra người báo cáo có quyền xem nó. */
  private async resolveTarget(userId: string, type: string, id: string): Promise<Target> {
    const notFound = () =>
      new NotFoundException({ code: 'REPORT_TARGET_NOT_FOUND', message: 'Không tìm thấy nội dung cần báo cáo' });
    if (type === 'message') {
      const m = await this.prisma.message.findUnique({
        where: { id },
        include: { conversation: { select: { lineageId: true, deletedAt: true } } },
      });
      if (!m || m.conversation.deletedAt) throw notFound();
      const member = await this.prisma.conversationMember.findFirst({
        where: { conversationId: m.conversationId, userId },
      });
      if (!member) throw notFound();
      return { lineageId: m.conversation.lineageId, authorId: m.senderId, preview: m.content ?? '' };
    }
    if (type === 'post' || type === 'comment') {
      const row =
        type === 'post'
          ? await this.prisma.post.findUnique({ where: { id }, select: { lineageId: true, authorId: true, content: true } })
          : await this.prisma.comment
              .findUnique({ where: { id }, include: { post: { select: { lineageId: true } } } })
              .then((c) => (c ? { lineageId: c.post.lineageId, authorId: c.authorId, content: c.content } : null));
      if (!row || !(await this.approvedIn(row.lineageId, userId))) throw notFound();
      return { lineageId: row.lineageId, authorId: row.authorId, preview: row.content };
    }
    const u = await this.prisma.user.findUnique({ where: { id }, select: { id: true, displayName: true } });
    if (!u) throw notFound();
    return { lineageId: null, authorId: u.id, preview: u.displayName };
  }

  /** POST /reports */
  async create(userId: string, dto: CreateReportDto) {
    const target = await this.resolveTarget(userId, dto.targetType, dto.targetId);
    if (target.authorId === userId)
      throw new BadRequestException({ code: 'REPORT_SELF', message: 'Không thể báo cáo nội dung của chính mình' });

    const dup = await this.prisma.report.findFirst({
      where: { reporterId: userId, targetType: dto.targetType, targetId: dto.targetId, status: 'pending' },
    });
    if (dup) return { data: { report: dup, duplicate: true }, error: null };

    const n = await this.prisma.report.count({
      where: { reporterId: userId, createdAt: { gte: new Date(Date.now() - 3600_000) } },
    });
    if (n >= REPORTS_PER_HOUR)
      throw new HttpException(
        { code: 'RATE_LIMITED', message: 'Bạn đã gửi nhiều báo cáo, vui lòng thử lại sau' },
        HttpStatus.TOO_MANY_REQUESTS,
      );

    const report = await this.prisma.report.create({
      data: {
        reporterId: userId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        lineageId: target.lineageId,
        reason: dto.reason,
        details: dto.details?.trim() || null,
      },
    });

    if (target.lineageId) {
      const lineage = await this.prisma.lineage.findUnique({
        where: { id: target.lineageId },
        select: { ownerUserId: true, memberships: { where: { status: 'approved', role: 'ADMIN' }, select: { userId: true } } },
      });
      const adminIds = new Set(
        [lineage?.ownerUserId, ...(lineage?.memberships.map((m) => m.userId) ?? [])].filter(
          (id): id is string => !!id && id !== userId,
        ),
      );
      await this.notifications
        .notifyMany(
          [...adminIds].map((adminId) => ({
            userId: adminId,
            type: 'report_new',
            title: 'Có báo cáo nội dung mới',
            body: REASON_LABELS[dto.reason] ?? dto.reason,
            data: { lineageId: target.lineageId, reportId: report.id },
            dedupKey: `report:${report.id}:${adminId}`,
          })),
        )
        .catch(() => undefined);
    }
    return { data: { report, duplicate: false }, error: null };
  }

  private async requireLineageAdmin(lineageId: string, userId: string) {
    const m = await this.approvedIn(lineageId, userId);
    if (!m || (m.role !== 'ADMIN' && m.lineage.ownerUserId !== userId))
      throw new ForbiddenException({
        code: 'NOT_LINEAGE_ADMIN',
        message: 'Chỉ Ban quản trị dòng họ được xem và xử lý báo cáo',
      });
  }

  /** Gắn nội dung xem trước + tên người liên quan cho danh sách báo cáo. */
  private async present(reports: Awaited<ReturnType<PrismaService['report']['findMany']>>) {
    const ids = (t: string) => reports.filter((r) => r.targetType === t).map((r) => r.targetId);
    const [messages, posts, comments, users, reporters] = await Promise.all([
      this.prisma.message.findMany({
        where: { id: { in: ids('message') } },
        select: { id: true, content: true, recalledAt: true, deletedForAllAt: true, senderNameSnapshot: true, senderId: true },
      }),
      this.prisma.post.findMany({
        where: { id: { in: ids('post') } },
        select: { id: true, content: true, title: true, status: true, authorId: true, author: { select: { displayName: true } } },
      }),
      this.prisma.comment.findMany({
        where: { id: { in: ids('comment') } },
        select: { id: true, content: true, status: true, authorId: true, author: { select: { displayName: true } } },
      }),
      this.prisma.user.findMany({ where: { id: { in: ids('user') } }, select: { id: true, displayName: true } }),
      this.prisma.user.findMany({
        where: { id: { in: reports.map((r) => r.reporterId).filter((x): x is string => !!x) } },
        select: { id: true, displayName: true },
      }),
    ]);
    const byId = new Map<string, { content: string; authorName: string | null; removed: boolean }>();
    for (const m of messages)
      byId.set(m.id, {
        content: m.content ?? '',
        authorName: m.senderNameSnapshot,
        removed: !!(m.recalledAt || m.deletedForAllAt),
      });
    for (const p of posts)
      byId.set(p.id, {
        content: [p.title, p.content].filter(Boolean).join(' — '),
        authorName: p.author?.displayName ?? null,
        removed: p.status !== 'published',
      });
    for (const c of comments)
      byId.set(c.id, { content: c.content, authorName: c.author?.displayName ?? null, removed: c.status !== 'published' });
    for (const u of users) byId.set(u.id, { content: '', authorName: u.displayName, removed: false });
    const reporterName = new Map(reporters.map((u) => [u.id, u.displayName]));
    return reports.map((r) => {
      const t = byId.get(r.targetId);
      return {
        id: r.id,
        targetType: r.targetType,
        targetId: r.targetId,
        reason: r.reason,
        reasonLabel: REASON_LABELS[r.reason] ?? r.reason,
        details: r.details,
        status: r.status,
        createdAt: r.createdAt,
        reporterName: r.reporterId ? (reporterName.get(r.reporterId) ?? null) : null,
        preview: t ? t.content.slice(0, 300) : null,
        authorName: t?.authorName ?? null,
        targetRemoved: t?.removed ?? true,
      };
    });
  }

  /** GET /lineages/:lineageId/reports?status=pending|done */
  async listForLineage(userId: string, lineageId: string, status = 'pending') {
    await this.requireLineageAdmin(lineageId, userId);
    const reports = await this.prisma.report.findMany({
      where: { lineageId, status: status === 'done' ? { in: ['resolved', 'dismissed'] } : 'pending' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { data: { reports: await this.present(reports) }, error: null };
  }

  /** POST /lineages/:lineageId/reports/:id — Ban quản trị xử lý. */
  async handle(userId: string, lineageId: string, reportId: string, action: string) {
    await this.requireLineageAdmin(lineageId, userId);
    const report = await this.prisma.report.findFirst({ where: { id: reportId, lineageId } });
    if (!report) throw new NotFoundException({ code: 'REPORT_NOT_FOUND', message: 'Không tìm thấy báo cáo' });

    if (action === 'remove') {
      if (report.targetType === 'post')
        await this.prisma.post.updateMany({ where: { id: report.targetId, lineageId }, data: { status: 'removed' } });
      else if (report.targetType === 'comment')
        await this.prisma.comment.updateMany({
          where: { id: report.targetId, post: { lineageId } },
          data: { status: 'removed' },
        });
      else if (report.targetType === 'message')
        await this.prisma.message.updateMany({
          where: { id: report.targetId, conversation: { lineageId } },
          data: { deletedForAllAt: new Date(), content: null, status: 'removed', pinnedAt: null },
        });
    }
    // Đóng mọi báo cáo đang chờ về cùng nội dung.
    const status = action === 'remove' ? 'resolved' : 'dismissed';
    await this.prisma.report.updateMany({
      where: { lineageId, targetType: report.targetType, targetId: report.targetId, status: 'pending' },
      data: { status, handledBy: userId },
    });
    await this.prisma.auditLog
      .create({
        data: {
          lineageId,
          actorId: userId,
          action: `report.${status}`,
          targetType: report.targetType,
          targetId: report.targetId,
          metadata: { reportId: report.id, reason: report.reason },
        },
      })
      .catch(() => undefined);
    return { data: { status }, error: null };
  }
}
