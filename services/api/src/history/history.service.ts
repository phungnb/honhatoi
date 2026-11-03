import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { can } from '../common/permissions';
import { formatLunar, nextAnniversary, todayVn } from '../genealogy/lunar';
import { CeremonyDto, HistoryEntryDto } from './dto/history.dto';

/**
 * Trang Lịch sử dòng họ: các mục lịch sử do người giữ gia phả viết, mộ phần
 * các đời (lấy từ "Phần mộ ở đâu" trong hồ sơ người đã mất) và giỗ chạp chung
 * của họ/chi (giỗ tổ, giỗ họ, giỗ chi) lặp lại hằng năm theo âm lịch.
 * Cả họ xem; Người giữ gia phả trở lên thêm/sửa/xóa.
 */
@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  private async actor(lineageId: string, userId: string) {
    const [m, lineage] = await Promise.all([
      this.prisma.lineageMembership.findFirst({
        where: { lineageId, userId, status: 'approved' },
        select: { role: true },
      }),
      this.prisma.lineage.findUnique({ where: { id: lineageId }, select: { ownerUserId: true } }),
    ]);
    if (!m)
      throw new ForbiddenException({ code: 'NOT_LINEAGE_MEMBER', message: 'Bạn không phải thành viên dòng họ này' });
    return { role: m.role, isOwner: lineage?.ownerUserId === userId };
  }

  private async requireEdit(lineageId: string, userId: string) {
    if (!can(await this.actor(lineageId, userId), 'genealogy.edit'))
      throw new ForbiddenException({
        code: 'REQUIRED_ROLE',
        message: 'Chỉ Người giữ gia phả trở lên được sửa trang lịch sử',
      });
  }

  private async log(lineageId: string, actorId: string, action: string, targetId: string, metadata?: object) {
    await this.prisma.auditLog.create({
      data: {
        lineageId,
        actorId,
        action,
        targetType: action.startsWith('history.entry') ? 'history_entry' : 'ceremony',
        targetId,
        metadata: (metadata ?? Prisma.DbNull) as Prisma.InputJsonValue,
      },
    });
  }

  /** GET /lineages/:lineageId/history */
  async get(lineageId: string, userId: string) {
    const actor = await this.actor(lineageId, userId);
    const today = todayVn();
    const [entries, ceremonies, graves] = await Promise.all([
      this.prisma.lineageHistoryEntry.findMany({
        where: { lineageId, deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, title: true, period: true, content: true, sortOrder: true, updatedAt: true },
      }),
      this.prisma.lineageCeremony.findMany({
        where: { lineageId, deletedAt: null },
        select: {
          id: true,
          name: true,
          kind: true,
          lunarDay: true,
          lunarMonth: true,
          lunarLeap: true,
          branch: true,
          location: true,
          note: true,
        },
      }),
      this.prisma.familyPerson.findMany({
        where: { lineageId, deletedAt: null, burialPlace: { not: null } },
        select: { id: true, fullName: true, generation: true, branch: true, burialPlace: true, gender: true },
        orderBy: [{ generation: 'asc' }, { fullName: 'asc' }],
        take: 500,
      }),
    ]);
    const withNext = ceremonies
      .map((c) => {
        const lunar = { day: c.lunarDay, month: c.lunarMonth, isLeap: c.lunarLeap, year: 0 };
        const next = nextAnniversary(lunar, today);
        return {
          ...c,
          lunarDisplay: formatLunar(lunar),
          nextSolar: next?.solar ?? null,
          daysUntil: next?.daysUntil ?? null,
        };
      })
      .sort((a, b) => (a.daysUntil ?? 999) - (b.daysUntil ?? 999));
    return {
      data: {
        today,
        canEdit: can(actor, 'genealogy.edit'),
        entries,
        ceremonies: withNext,
        graves: graves.filter((g) => g.burialPlace && g.burialPlace.trim()),
      },
      error: null,
    };
  }

  async createEntry(lineageId: string, userId: string, dto: HistoryEntryDto) {
    await this.requireEdit(lineageId, userId);
    const entry = await this.prisma.lineageHistoryEntry.create({
      data: {
        lineageId,
        title: dto.title.trim(),
        period: dto.period?.trim() || null,
        content: dto.content,
        sortOrder: dto.sortOrder ?? 0,
        createdBy: userId,
        updatedBy: userId,
      },
    });
    await this.log(lineageId, userId, 'history.entry.create', entry.id, { title: entry.title });
    return { data: { entry }, error: null };
  }

  private async entryOrThrow(lineageId: string, id: string) {
    const e = await this.prisma.lineageHistoryEntry.findFirst({ where: { id, lineageId, deletedAt: null } });
    if (!e) throw new NotFoundException({ code: 'ENTRY_NOT_FOUND', message: 'Không tìm thấy mục lịch sử' });
    return e;
  }

  async updateEntry(lineageId: string, userId: string, id: string, dto: Partial<HistoryEntryDto>) {
    await this.requireEdit(lineageId, userId);
    const before = await this.entryOrThrow(lineageId, id);
    const entry = await this.prisma.lineageHistoryEntry.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.period !== undefined ? { period: dto.period?.trim() || null } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        updatedBy: userId,
      },
    });
    await this.log(lineageId, userId, 'history.entry.update', id, {
      title: entry.title,
      before: { title: before.title, period: before.period, content: before.content },
    });
    return { data: { entry }, error: null };
  }

  async deleteEntry(lineageId: string, userId: string, id: string) {
    await this.requireEdit(lineageId, userId);
    const e = await this.entryOrThrow(lineageId, id);
    await this.prisma.lineageHistoryEntry.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.log(lineageId, userId, 'history.entry.delete', id, { title: e.title });
    return { data: { ok: true }, error: null };
  }

  private ceremonyData(dto: Partial<CeremonyDto>) {
    const t = (v?: string) => (v === undefined ? undefined : v.trim() || null);
    return {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
      ...(dto.lunarDay !== undefined ? { lunarDay: dto.lunarDay } : {}),
      ...(dto.lunarMonth !== undefined ? { lunarMonth: dto.lunarMonth } : {}),
      ...(dto.lunarLeap !== undefined ? { lunarLeap: dto.lunarLeap } : {}),
      ...(dto.branch !== undefined ? { branch: t(dto.branch) } : {}),
      ...(dto.location !== undefined ? { location: t(dto.location) } : {}),
      ...(dto.note !== undefined ? { note: t(dto.note) } : {}),
    };
  }

  async createCeremony(lineageId: string, userId: string, dto: CeremonyDto) {
    await this.requireEdit(lineageId, userId);
    const c = await this.prisma.lineageCeremony.create({
      data: {
        lineageId,
        createdBy: userId,
        name: dto.name.trim(),
        kind: dto.kind,
        lunarDay: dto.lunarDay,
        lunarMonth: dto.lunarMonth,
        ...this.ceremonyData(dto),
      },
    });
    await this.log(lineageId, userId, 'history.ceremony.create', c.id, { name: c.name });
    return { data: { ceremony: c }, error: null };
  }

  private async ceremonyOrThrow(lineageId: string, id: string) {
    const c = await this.prisma.lineageCeremony.findFirst({ where: { id, lineageId, deletedAt: null } });
    if (!c) throw new NotFoundException({ code: 'CEREMONY_NOT_FOUND', message: 'Không tìm thấy ngày giỗ chạp' });
    return c;
  }

  async updateCeremony(lineageId: string, userId: string, id: string, dto: Partial<CeremonyDto>) {
    await this.requireEdit(lineageId, userId);
    await this.ceremonyOrThrow(lineageId, id);
    const c = await this.prisma.lineageCeremony.update({ where: { id }, data: this.ceremonyData(dto) });
    await this.log(lineageId, userId, 'history.ceremony.update', id, { name: c.name });
    return { data: { ceremony: c }, error: null };
  }

  async deleteCeremony(lineageId: string, userId: string, id: string) {
    await this.requireEdit(lineageId, userId);
    const c = await this.ceremonyOrThrow(lineageId, id);
    await this.prisma.lineageCeremony.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.log(lineageId, userId, 'history.ceremony.delete', id, { name: c.name });
    return { data: { ok: true }, error: null };
  }
}
