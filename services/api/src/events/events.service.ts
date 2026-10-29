import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventType, Prisma } from '@prisma/client';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import {
  NotificationsService,
  NotifyInput,
} from '../notifications/notifications.service';

const ADMIN_ROLES = ['ADMIN'];

const EVENT_TYPE_LABELS: Record<string, string> = {
  ancestral_ceremony: 'Giỗ tổ',
  death_anniversary: 'Ngày giỗ',
  birthday: 'Sinh nhật',
  family_meeting: 'Họp họ',
  gathering: 'Gặp mặt',
  other: 'Sự kiện',
};

/**
 * EventsService — sự kiện dòng họ: giỗ tổ, ngày giỗ, họp họ...
 * Mọi thao tác đều kiểm tra membership approved của lineage (cô lập dữ liệu
 * giữa các họ — HNT-T-010); LineageGuard ở controller kiểm tra trước,
 * service kiểm tra lại để phòng defense-in-depth.
 */
@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

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

  /** Event phải thuộc lineage trong path (chống IDOR). */
  private async eventOrThrow(lineageId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, lineageId },
    });
    if (!event)
      throw new NotFoundException({
        code: 'EVENT_NOT_FOUND',
        message: 'Không tìm thấy sự kiện',
      });
    return event;
  }

  /** Chỉ người tổ chức hoặc Ban quản trị của dòng họ được sửa/hủy sự kiện. */
  private async requireOrganizerOrAdmin(
    lineageId: string,
    userId: string,
    event: { organizerId?: string | null },
  ) {
    if (event.organizerId && event.organizerId === userId) return;
    const m = await this.membershipOrThrow(lineageId, userId);
    if (!ADMIN_ROLES.includes(m.role as string))
      throw new ForbiddenException({
        code: 'EVENT_FORBIDDEN',
        message: 'Chỉ người tổ chức hoặc quản trị dòng họ được thực hiện thao tác này',
      });
  }

  private formatDateTime(d: Date): string {
    return new Date(d).toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private eventPayload(event: { id: string; lineageId: string }) {
    return { eventId: event.id, lineageId: event.lineageId };
  }

  /** Gửi thông báo tới danh sách userId với dedupKey theo từng người. */
  private async notifyEventUsers(
    userIds: string[],
    keyPrefix: string,
    event: { id: string; lineageId: string; title: string },
    make: (userId: string) => Omit<NotifyInput, 'userId'>,
  ) {
    const items = userIds.map((userId) => ({
      userId,
      ...make(userId),
      dedupKey: `${keyPrefix}:${event.id}:user:${userId}`,
    }));
    await this.notifications.notifyMany(items);
  }

  // ---------------------------------------------------------------- create

  /**
   * POST /lineages/:lineageId/events — tạo sự kiện, báo cho cả dòng họ
   * (trừ người tạo) qua notifyMany với dedupKey theo từng người.
   */
  async create(userId: string, lineageId: string, dto: CreateEventDto) {
    await this.membershipOrThrow(lineageId, userId);

    const startAt = new Date(dto.startAt);
    if (Number.isNaN(startAt.getTime()) || startAt <= new Date())
      throw new BadRequestException({
        code: 'EVENT_START_IN_PAST',
        message: 'Thời gian bắt đầu sự kiện phải ở tương lai',
      });
    const endAt = dto.endAt ? new Date(dto.endAt) : undefined;
    if (endAt && (Number.isNaN(endAt.getTime()) || endAt <= startAt))
      throw new BadRequestException({
        code: 'EVENT_END_BEFORE_START',
        message: 'Thời gian kết thúc phải sau thời gian bắt đầu',
      });

    const event = await this.prisma.event.create({
      data: {
        lineageId,
        createdBy: userId,
        organizerId: userId,
        title: dto.title,
        description: dto.description,
        eventType: dto.eventType.toUpperCase() as EventType,
        startAt,
        endAt,
        lunarDate: dto.lunarDate,
        location: dto.location,
        coverUrl: dto.coverUrl,
        status: 'upcoming',
      },
    });

    const typeLabel = EVENT_TYPE_LABELS[dto.eventType] ?? 'Sự kiện';
    const members = await this.prisma.lineageMembership.findMany({
      where: { lineageId, status: 'approved' },
      select: { userId: true },
    });
    const when = this.formatDateTime(event.startAt);
    await this.notifyEventUsers(
      members.map((m) => m.userId).filter((id) => id !== userId),
      'event_created',
      event,
      () => ({
        type: 'event_created',
        title: `${typeLabel} mới: ${event.title}`,
        body: `Thời gian: ${when}${event.location ? ` · Địa điểm: ${event.location}` : ''}`,
        data: this.eventPayload(event) as Record<string, unknown>,
      }),
    );

    return { data: { event }, error: null };
  }

  /**
   * GET /lineages/:lineageId/events — keyset pagination theo
   * (startAt asc, id asc); upcomingOnly lọc sự kiện sắp tới.
   */
  async list(
    userId: string,
    lineageId: string,
    query: { cursor?: string; limit?: number; upcomingOnly?: boolean },
  ) {
    await this.membershipOrThrow(lineageId, userId);
    const take = Math.min(Math.max(query.limit ?? 30, 1), 100);
    const upcomingOnly = query.upcomingOnly !== false;

    let cursorFilter: Record<string, unknown> = {};
    if (query.cursor) {
      const cursorRow = await this.prisma.event.findFirst({
        where: { id: query.cursor, lineageId },
        select: { startAt: true },
      });
      if (cursorRow) {
        cursorFilter = {
          OR: [
            { startAt: { gt: cursorRow.startAt } },
            { startAt: cursorRow.startAt, id: { gt: query.cursor } },
          ],
        };
      }
    }

    const events = await this.prisma.event.findMany({
      where: {
        lineageId,
        ...(upcomingOnly
          ? { startAt: { gte: new Date() }, status: 'upcoming' }
          : {}),
        ...cursorFilter,
      },
      orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
      take: take + 1,
    });
    const hasMore = events.length > take;
    const page = events.slice(0, take);
    return {
      data: {
        events: page,
        next_cursor: hasMore ? page[page.length - 1].id : null,
      },
      error: null,
    };
  }

  /**
   * GET /lineages/:lineageId/events/:id — chi tiết kèm thống kê RSVP
   * và trạng thái RSVP của chính mình.
   */
  async detail(userId: string, lineageId: string, eventId: string) {
    await this.membershipOrThrow(lineageId, userId);
    const event = await this.eventOrThrow(lineageId, eventId);

    const participants = await this.prisma.eventParticipant.findMany({
      where: { eventId },
      select: { userId: true, rsvpStatus: true },
    });
    const rsvpCounts = { attending: 0, maybe: 0, declined: 0, invited: 0 };
    let myRsvp: { rsvpStatus: string } | null = null;
    for (const p of participants) {
      const key = p.rsvpStatus as keyof typeof rsvpCounts;
      if (key in rsvpCounts) rsvpCounts[key] += 1;
      if (p.userId === userId) myRsvp = { rsvpStatus: p.rsvpStatus };
    }

    return { data: { event, rsvpCounts, myRsvp }, error: null };
  }

  /**
   * PATCH /lineages/:lineageId/events/:id — người tổ chức hoặc ADMIN+.
   * Đổi startAt/location → báo cho các participants đã RSVP.
   */
  async update(
    userId: string,
    lineageId: string,
    eventId: string,
    dto: UpdateEventDto,
  ) {
    const event = await this.eventOrThrow(lineageId, eventId);
    await this.requireOrganizerOrAdmin(lineageId, userId, event);

    const startAt = dto.startAt ? new Date(dto.startAt) : undefined;
    if (startAt && Number.isNaN(startAt.getTime()))
      throw new BadRequestException({
        code: 'EVENT_INVALID_START',
        message: 'Thời gian bắt đầu không hợp lệ',
      });
    const endAt = dto.endAt ? new Date(dto.endAt) : undefined;
    if (endAt && Number.isNaN(endAt.getTime()))
      throw new BadRequestException({
        code: 'EVENT_INVALID_END',
        message: 'Thời gian kết thúc không hợp lệ',
      });
    const effectiveStart = startAt ?? event.startAt;
    const effectiveEnd = endAt !== undefined ? endAt : event.endAt;
    if (effectiveEnd && effectiveEnd <= effectiveStart)
      throw new BadRequestException({
        code: 'EVENT_END_BEFORE_START',
        message: 'Thời gian kết thúc phải sau thời gian bắt đầu',
      });

    const startChanged =
      startAt !== undefined && startAt.getTime() !== new Date(event.startAt).getTime();
    const locationChanged =
      dto.location !== undefined && dto.location !== event.location;

    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.eventType !== undefined
          ? { eventType: dto.eventType.toUpperCase() as EventType }
          : {}),
        ...(startAt !== undefined ? { startAt } : {}),
        ...(dto.endAt !== undefined ? { endAt } : {}),
        ...(dto.lunarDate !== undefined ? { lunarDate: dto.lunarDate } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.coverUrl !== undefined ? { coverUrl: dto.coverUrl } : {}),
      },
    });

    if (startChanged || locationChanged) {
      const participants = await this.prisma.eventParticipant.findMany({
        where: { eventId },
        select: { userId: true },
      });
      const when = this.formatDateTime(updated.startAt);
      await this.notifyEventUsers(
        participants
          .map((p) => p.userId)
          .filter((id) => id !== userId),
        'event_updated',
        updated,
        () => ({
          type: 'event_updated',
          title: `Sự kiện thay đổi: ${updated.title}`,
          body: `${startChanged ? `Giờ mới: ${when}. ` : ''}${
            locationChanged && updated.location
              ? `Địa điểm mới: ${updated.location}.`
              : ''
          }`.trim(),
          data: this.eventPayload(updated) as Record<string, unknown>,
        }),
      );
    }

    return { data: { event: updated }, error: null };
  }

  /**
   * POST /lineages/:lineageId/events/:id/cancel — quyền như update;
   * status='cancelled', báo cho các participants.
   */
  async cancel(userId: string, lineageId: string, eventId: string) {
    const event = await this.eventOrThrow(lineageId, eventId);
    await this.requireOrganizerOrAdmin(lineageId, userId, event);

    const cancelled = await this.prisma.event.update({
      where: { id: eventId },
      data: { status: 'cancelled' },
    });

    const participants = await this.prisma.eventParticipant.findMany({
      where: { eventId },
      select: { userId: true },
    });
    await this.notifyEventUsers(
      participants.map((p) => p.userId).filter((id) => id !== userId),
      'event_cancelled',
      cancelled,
      () => ({
        type: 'event_cancelled',
        title: `Sự kiện đã hủy: ${cancelled.title}`,
        body: 'Ban tổ chức đã hủy sự kiện này. Mong bạn thông cảm.',
        data: this.eventPayload(cancelled) as Record<string, unknown>,
      }),
    );

    return { data: { event: cancelled }, error: null };
  }

  /**
   * POST /lineages/:lineageId/events/:id/rsvp — xác nhận tham dự.
   * Schema EventParticipant KHÔNG có guestCount nên bỏ qua trường này.
   */
  async rsvp(
    userId: string,
    lineageId: string,
    eventId: string,
    input: { status: 'attending' | 'maybe' | 'declined'; guestCount?: number },
  ) {
    await this.membershipOrThrow(lineageId, userId);
    const event = await this.eventOrThrow(lineageId, eventId);
    if (event.status === 'cancelled')
      throw new BadRequestException({
        code: 'EVENT_CANCELLED',
        message: 'Sự kiện đã bị hủy — không thể xác nhận tham dự',
      });
    const participant = await this.prisma.eventParticipant.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId, rsvpStatus: input.status },
      update: { rsvpStatus: input.status },
    });
    return { data: { participant }, error: null };
  }

  /**
   * GET /lineages/:lineageId/events/:id/attendees — danh sách người tham dự,
   * lọc theo rsvpStatus nếu có; kèm thông tin user cơ bản.
   */
  async attendees(
    userId: string,
    lineageId: string,
    eventId: string,
    status?: string,
  ) {
    await this.membershipOrThrow(lineageId, userId);
    await this.eventOrThrow(lineageId, eventId);

    const participants = await this.prisma.eventParticipant.findMany({
      where: { eventId, ...(status ? { rsvpStatus: status } : {}) },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    const userIds = [...new Set(participants.map((p) => p.userId))];
    const users =
      userIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, displayName: true, avatarUrl: true },
          })
        : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      data: {
        attendees: participants.map((p) => ({
          userId: p.userId,
          rsvpStatus: p.rsvpStatus,
          user: userMap.get(p.userId) ?? { id: p.userId },
        })),
      },
      error: null,
    };
  }
}
