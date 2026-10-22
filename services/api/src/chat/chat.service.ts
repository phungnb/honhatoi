import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatRoomType } from '@prisma/client';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

/**
 * ChatService (khung).
 * Quy tắc bền vững (HNT-T-012): persist message vào DB (transaction) TRƯỚC khi
 * broadcast/ack. Idempotency qua (conversation_id, client_message_id) (HNT-T-013).
 */
@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  /** POST /conversations — kiểm tra chặn hai chiều trước khi tạo direct. */
  async createConversation(userId: string, dto: CreateConversationDto) {
    // TODO: kiểm tra blocked_users hai chiều; tạo conversation + conversation_members.
    const conversation = await this.prisma.chatConversation.create({
      data: {
        type: dto.type as ChatRoomType,
        lineageId: dto.lineageId,
        title: dto.title,
        createdBy: userId,
      },
    });
    return { data: { conversation }, error: null };
  }

  /** GET /conversations — danh sách của tôi, cursor pagination. */
  async findMine(userId: string) {
    const memberships = await this.prisma.conversationMember.findMany({
      where: { userId, leftAt: null },
      include: { conversation: true },
      take: 30,
    });
    return {
      data: { conversations: memberships.map((m) => m.conversation), next_cursor: null },
      error: null,
    };
  }

  /**
   * POST /conversations/:id/messages — persist trước, idempotent theo
   * (conversation_id, client_message_id): gửi lại cùng key → trả message đã có.
   */
  async sendMessage(conversationId: string, senderId: string, dto: SendMessageDto) {
    // TODO:
    //  1. Kiểm tra sender là thành viên & được phép gửi (settings, chặn, message_requests pending).
    //  2. Tìm message theo (conversationId, clientMessageId) → nếu có, trả 200 message đã có.
    //  3. Transaction: tạo messages (+attachments, cập nhật conversations.updated_at) → commit.
    //  4. Sau commit: gateway broadcast message:new + trả ack { client_message_id, message_id }.
    const existing = await this.prisma.message.findUnique({
      where: {
        conversationId_clientMessageId: {
          conversationId,
          clientMessageId: dto.clientMessageId,
        },
      },
    });
    if (existing) return { data: { message: existing }, error: null };

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        clientMessageId: dto.clientMessageId,
        type: dto.type,
        content: dto.content,
        replyToId: dto.replyToId,
      },
    });
    return { data: { message }, error: null };
  }

  /** GET /conversations/:id/messages — lịch sử, cursor pagination. */
  async findMessages(conversationId: string, limit = 30) {
    // TODO: kiểm tra là thành viên; cursor-based với next_cursor; kèm attachments/reactions.
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });
    return { data: { messages: messages.reverse(), next_cursor: null }, error: null };
  }

  /** POST /conversations/:id/read — đánh dấu đã đọc đến message_id. */
  async markRead(conversationId: string, userId: string, messageId: string) {
    // TODO: upsert message_reads; broadcast message:read (tôn trọng cài đặt riêng tư).
    await this.prisma.messageRead.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: { messageId, userId },
      update: { readAt: new Date() },
    });
    return { data: { ok: true }, error: null };
  }

  /** Kiểm tra user có phải thành viên conversation không (dùng cho gateway). */
  async isMember(conversationId: string, userId: string): Promise<boolean> {
    const m = await this.prisma.conversationMember.findFirst({
      where: { conversationId, userId, leftAt: null },
    });
    return !!m;
  }
}
