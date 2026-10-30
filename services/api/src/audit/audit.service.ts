import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * AuditService — nhật ký thao tác của một dòng họ (đặc tả 7.2), chỉ Ban
 * quản trị xem. Chỉ đọc: các module tự ghi audit_logs khi thao tác.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /lineages/:lineageId/audit-logs?before=<iso> — 50 dòng mỗi trang, mới nhất trước. */
  async list(userId: string, lineageId: string, before?: string) {
    const [m, lineage] = await Promise.all([
      this.prisma.lineageMembership.findFirst({
        where: { lineageId, userId, status: 'approved' },
        select: { role: true },
      }),
      this.prisma.lineage.findUnique({ where: { id: lineageId }, select: { ownerUserId: true } }),
    ]);
    if (!m || (m.role !== 'ADMIN' && lineage?.ownerUserId !== userId))
      throw new ForbiddenException({
        code: 'NOT_LINEAGE_ADMIN',
        message: 'Chỉ Ban quản trị dòng họ được xem nhật ký',
      });
    const beforeDate = before ? new Date(before) : undefined;
    const take = 50;
    const rows = await this.prisma.auditLog.findMany({
      where: {
        lineageId,
        ...(beforeDate && !Number.isNaN(beforeDate.getTime()) ? { createdAt: { lt: beforeDate } } : {}),
      },
      include: { actor: { select: { displayName: true } } },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
    });
    const page = rows.slice(0, take);

    // Tên hồ sơ cho các thao tác trên cây, để nhật ký đọc được.
    const personIds = page
      .filter((r) => r.targetType === 'family_person' && r.targetId)
      .map((r) => r.targetId as string);
    const persons = personIds.length
      ? await this.prisma.familyPerson.findMany({
          where: { id: { in: personIds } },
          select: { id: true, fullName: true },
        })
      : [];
    const personName = new Map(persons.map((p) => [p.id, p.fullName]));

    return {
      data: {
        logs: page.map((r) => ({
          id: r.id,
          action: r.action,
          actorName: r.actor?.displayName ?? null,
          targetType: r.targetType,
          targetName: r.targetId ? (personName.get(r.targetId) ?? null) : null,
          createdAt: r.createdAt,
        })),
        next_before: rows.length > take ? page[page.length - 1].createdAt : null,
      },
      error: null,
    };
  }
}
