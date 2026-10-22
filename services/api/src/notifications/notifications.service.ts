import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * NotificationsService (khung).
 * Chống gửi trùng lặp qua dedup_key (HNT-T-026): cùng dedup_key chỉ tạo một
 * notification — sự kiện quan trọng không gửi trùng khi retry.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /notifications — của chính mình, mới nhất trước. */
  async findMine(userId: string, limit = 30) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });
    return { data: { notifications, next_cursor: null }, error: null };
  }

  /** PATCH /notifications/:id/read */
  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    return { data: { updated: notification.count }, error: null };
  }

  /** POST /notifications/read-all */
  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { data: { updated: result.count }, error: null };
  }

  /**
   * Tạo thông báo nội bộ (dùng bởi các module khác).
   * Nếu có dedupKey và đã tồn tại → trả bản ghi cũ, không tạo mới.
   */
  async create(input: {
    userId: string;
    type: string;
    title: string;
    body?: string;
    data?: Record<string, unknown>;
    dedupKey?: string;
  }) {
    if (input.dedupKey) {
      const existing = await this.prisma.notification.findUnique({
        where: { dedupKey: input.dedupKey },
      });
      if (existing) return existing;
    }
    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: (input.data as Prisma.InputJsonValue) ?? undefined,
        dedupKey: input.dedupKey,
      },
    });
  }
}
