import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface NotifyInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  dedupKey?: string;
}

/**
 * NotificationsService — thông báo trong app.
 * Chống gửi trùng lặp qua dedup_key (HNT-T-026): cùng dedup_key chỉ tạo một
 * notification — các thao tác quan trọng không gửi trùng khi retry.
 * Lưu ý: dedup_key nullable và UNIQUE ở DB, nên chỉ kiểm tra khi có dedupKey.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tạo một thông báo (dùng nội bộ, các module khác gọi qua hàm này).
   * Nếu có dedupKey và đã tồn tại → trả { skipped: true }, không tạo mới.
   */
  async notify(userId: string, input: Omit<NotifyInput, 'userId'>) {
    if (input.dedupKey) {
      const existing = await this.prisma.notification.findUnique({
        where: { dedupKey: input.dedupKey },
      });
      if (existing) return { data: { skipped: true }, error: null };
    }
    try {
      const notification = await this.prisma.notification.create({
        data: {
          userId,
          type: input.type,
          title: input.title,
          body: input.body,
          data: (input.data as Prisma.InputJsonValue | undefined) ?? undefined,
          dedupKey: input.dedupKey,
        },
      });
      return { data: { notification }, error: null };
    } catch (e) {
      // Race: hai tiến trình cùng tạo một dedupKey → coi như đã gửi.
      if (input.dedupKey) return { data: { skipped: true }, error: null };
      throw e;
    }
  }

  /**
   * Tạo hàng loạt thông báo. Lọc dedupKey đã tồn tại bằng 1 query, tạo phần
   * còn lại song song; bỏ qua lỗi unique race và trả số lượng đã tạo.
   */
  async notifyMany(items: NotifyInput[]) {
    if (items.length === 0) return { data: { created: 0 }, error: null };
    const keys = items
      .map((i) => i.dedupKey)
      .filter((k): k is string => !!k);
    const existing =
      keys.length > 0
        ? await this.prisma.notification.findMany({
            where: { dedupKey: { in: keys } },
            select: { dedupKey: true },
          })
        : [];
    const seen = new Set(existing.map((e) => e.dedupKey));
    const fresh = items.filter((i) => !i.dedupKey || !seen.has(i.dedupKey));
    const results = await Promise.allSettled(
      fresh.map((i) =>
        this.prisma.notification.create({
          data: {
            userId: i.userId,
            type: i.type,
            title: i.title,
            body: i.body,
            data: (i.data as Prisma.InputJsonValue | undefined) ?? undefined,
            dedupKey: i.dedupKey,
          },
        }),
      ),
    );
    const created = results.filter((r) => r.status === 'fulfilled').length;
    return { data: { created }, error: null };
  }

  /** GET /notifications — của chính mình, mới nhất trước, cursor pagination. */
  async list(
    userId: string,
    query: { cursor?: string; limit?: number; unreadOnly?: boolean },
  ) {
    const take = Math.min(Math.max(query.limit ?? 30, 1), 100);
    let cursorFilter: Record<string, unknown> = {};
    if (query.cursor) {
      const cursorRow = await this.prisma.notification.findFirst({
        where: { id: query.cursor, userId },
        select: { createdAt: true },
      });
      if (cursorRow) {
        cursorFilter = {
          OR: [
            { createdAt: { lt: cursorRow.createdAt } },
            { createdAt: cursorRow.createdAt, id: { lt: query.cursor } },
          ],
        };
      }
    }
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId,
        ...(query.unreadOnly ? { isRead: false } : {}),
        ...cursorFilter,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
    });
    const hasMore = notifications.length > take;
    const page = notifications.slice(0, take);
    return {
      data: {
        notifications: page,
        next_cursor: hasMore ? page[page.length - 1].id : null,
      },
      error: null,
    };
  }

  /** GET /notifications/unread-count — số thông báo chưa đọc. */
  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { data: { unreadCount: count }, error: null };
  }

  /** POST /notifications/:id/read — đánh dấu đã đọc (chỉ của chính mình). */
  async markRead(userId: string, id: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!existing)
      throw new NotFoundException({
        code: 'NOTIFICATION_NOT_FOUND',
        message: 'Không tìm thấy thông báo',
      });
    const notification = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    return { data: { notification }, error: null };
  }

  /** POST /notifications/read-all — đánh dấu tất cả đã đọc. */
  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { data: { updated: result.count }, error: null };
  }

  /** DELETE /notifications/:id — xóa thông báo của chính mình. */
  async remove(userId: string, id: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!existing)
      throw new NotFoundException({
        code: 'NOTIFICATION_NOT_FOUND',
        message: 'Không tìm thấy thông báo',
      });
    await this.prisma.notification.delete({ where: { id } });
    return { data: { removed: true }, error: null };
  }
}
