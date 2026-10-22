import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventType, Prisma } from '@prisma/client';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

/** EventsService (khung) — sự kiện dòng họ: giỗ tổ, ngày giỗ, họp họ... */
@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  /** POST /lineages/:lineageId/events */
  async create(lineageId: string, userId: string, dto: CreateEventDto) {
    // TODO: kiểm tra cấu hình dòng họ (ai được tạo sự kiện); lunar_date tính
    // từ startAt nếu event_type là death_anniversary/ancestral_ceremony (HNT-T-027).
    const event = await this.prisma.event.create({
      data: {
        lineageId,
        createdBy: userId,
        organizerId: userId,
        title: dto.title,
        description: dto.description,
        eventType: dto.eventType as EventType,
        startAt: new Date(dto.startAt),
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
        lunarDate: dto.lunarDate,
        location: dto.location,
      },
    });
    return { data: { event }, error: null };
  }

  /** GET /lineages/:lineageId/events — lọc loại, khoảng thời gian. */
  async findAll(lineageId: string, query: { type?: string; from?: string; to?: string; limit?: number }) {
    const events = await this.prisma.event.findMany({
      where: {
        lineageId,
        ...(query.type ? { eventType: query.type as never } : {}),
        ...(query.from ? { startAt: { gte: new Date(query.from) } } : {}),
        ...(query.to ? { startAt: { lte: new Date(query.to) } } : {}),
      },
      orderBy: { startAt: 'asc' },
      take: Math.min(query.limit ?? 30, 100),
    });
    return { data: { events, next_cursor: null }, error: null };
  }

  /** GET /events/:id — TODO: kiểm tra user là thành viên của lineage chứa event. */
  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { participants: true },
    });
    if (!event) throw new NotFoundException({ code: 'EVENT_NOT_FOUND', message: 'Không tìm thấy sự kiện' });
    return { data: { event }, error: null };
  }

  /** PATCH /events/:id — người tạo hoặc admin. */
  async update(id: string, dto: UpdateEventDto) {
    const event = await this.prisma.event.update({
      where: { id },
      data: {
        ...dto,
        eventType: dto.eventType ? (dto.eventType as EventType) : undefined,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
      },
    });
    return { data: { event }, error: null };
  }

  /** DELETE /events/:id — hủy sự kiện (người tạo hoặc admin). */
  async remove(id: string) {
    const event = await this.prisma.event.update({
      where: { id },
      data: { status: 'cancelled' },
    });
    return { data: { event }, error: null };
  }

  /** POST /events/:id/rsvp — xác nhận tham dự. */
  async rsvp(id: string, userId: string, rsvpStatus: string) {
    const participant = await this.prisma.eventParticipant.upsert({
      where: { eventId_userId: { eventId: id, userId } },
      create: { eventId: id, userId, rsvpStatus },
      update: { rsvpStatus },
    });
    return { data: { participant }, error: null };
  }

  /** GET /events/:id/participants */
  async findParticipants(id: string) {
    const participants = await this.prisma.eventParticipant.findMany({
      where: { eventId: id },
      include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
      take: 100,
    });
    return { data: { participants, next_cursor: null }, error: null };
  }
}
