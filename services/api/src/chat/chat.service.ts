import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatRoomType, LineageRole, UserStatus } from '@prisma/client';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

/**
 * ChatService — triển khai đầy đủ module Chat.
 *
 * Quy tắc bền vững (HNT-T-012): persist message vào DB (transaction) TRƯỚC khi
 * broadcast/ack. Idempotency qua (conversation_id, client_message_id) (HNT-T-013).
 * Cô lập dữ liệu: mọi thao tác đều kiểm tra active membership của conversation;
 * nhóm gắn lineage chỉ nhận thành viên approved của họ đó.
 */

const TYPE_MAP: Record<string, ChatRoomType> = {
  direct: ChatRoomType.DIRECT,
  lineage_group: ChatRoomType.LINEAGE_GROUP,
  family_group: ChatRoomType.FAMILY_GROUP,
};

/** Vai trò được coi là quản trị dòng họ (dùng cho quyền quản lý conversation). */
const LINEAGE_ADMIN_ROLES: LineageRole[] = [LineageRole.ADMIN];

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- helpers

  /** Thành viên approved của dòng họ — 403 nếu không (cô lập dữ liệu giữa các họ). */
  private async requireApprovedLineageMember(lineageId: string, userId: string) {
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

  private async isLineageAdmin(lineageId: string, userId: string): Promise<boolean> {
    const m = await this.prisma.lineageMembership.findFirst({
      where: {
        lineageId,
        userId,
        status: 'approved',
        role: { in: LINEAGE_ADMIN_ROLES },
      },
    });
    return !!m;
  }

  /** Thành viên đang hoạt động của conversation — 403 nếu không. */
  private async requireActiveMember(conversationId: string, userId: string) {
    const m = await this.prisma.conversationMember.findFirst({
      where: { conversationId, userId, leftAt: null },
    });
    if (!m)
      throw new ForbiddenException({
        code: 'NOT_CONVERSATION_MEMBER',
        message: 'Bạn không phải thành viên của cuộc trò chuyện này',
      });
    return m;
  }

  /** Conversation còn tồn tại (chưa xóa mềm) — 404 nếu không. */
  private async requireConversation(conversationId: string) {
    const conv = await this.prisma.chatConversation.findFirst({
      where: { id: conversationId, deletedAt: null },
    });
    if (!conv)
      throw new NotFoundException({
        code: 'CONVERSATION_NOT_FOUND',
        message: 'Không tìm thấy cuộc trò chuyện',
      });
    return conv;
  }

  /**
   * Quyền quản lý conversation: là admin của conversation HOẶC là ADMIN+ của
   * dòng họ (nếu conversation gắn với lineage).
   */
  private async requireConversationManager(
    conversationId: string,
    lineageId: string | undefined,
    requesterId: string,
  ) {
    const me = await this.prisma.conversationMember.findFirst({
      where: { conversationId, userId: requesterId, leftAt: null },
    });
    const isConvAdmin = !!me && me.role === 'admin';
    const isLineageAdmin = lineageId
      ? await this.isLineageAdmin(lineageId, requesterId)
      : false;
    if (!isConvAdmin && !isLineageAdmin)
      throw new ForbiddenException({
        code: 'NOT_CONVERSATION_ADMIN',
        message: 'Chỉ quản trị viên cuộc trò chuyện (hoặc quản trị họ) mới được thực hiện thao tác này',
      });
    return me;
  }

  /** Chuẩn hoá message trả về: ẩn content khi đã thu hồi/xóa, kèm tên người gửi. */
  private presentMessage(m: {
    id: string;
    conversationId: string;
    senderId?: string | null;
    sender?: { id?: string; displayName?: string } | null;
    senderNameSnapshot?: string | null;
    clientMessageId: string;
    type: string;
    content?: string | null;
    replyToId?: string | null;
    status: string;
    editedAt?: Date | null;
    recalledAt?: Date | null;
    deletedForAllAt?: Date | null;
    createdAt: Date;
  }) {
    const recalled = !!(m.recalledAt || m.deletedForAllAt);
    return {
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId ?? null,
      senderName: m.sender?.displayName ?? m.senderNameSnapshot ?? null,
      clientMessageId: m.clientMessageId,
      type: m.type,
      content: recalled ? null : (m.content ?? null),
      recalled,
      replyToId: m.replyToId ?? null,
      status: m.status,
      editedAt: m.editedAt ?? null,
      recalledAt: m.recalledAt ?? null,
      createdAt: m.createdAt,
    };
  }

  // ------------------------------------------------------- conversations

  /**
   * POST /chat/conversations.
   * - DIRECT: tái sử dụng conversation 1-1 đã có đúng 2 thành viên đang hoạt
   *   động; chưa có thì tạo mới.
   * - LINEAGE_GROUP/FAMILY_GROUP: lineageId bắt buộc; người tạo phải là
   *   approved member của họ; chỉ add những user cũng là approved member.
   */
  async createConversation(userId: string, dto: CreateConversationDto) {
    const type = TYPE_MAP[dto.type];
    if (!type)
      throw new BadRequestException({
        code: 'INVALID_CONVERSATION_TYPE',
        message: 'Loại trò chuyện không hợp lệ',
      });

    if (type === ChatRoomType.DIRECT) {
      const otherId = dto.memberIds?.[0];
      if (!otherId)
        throw new BadRequestException({
          code: 'DIRECT_PEER_REQUIRED',
          message: 'Chat 1-1 cần chỉ định người còn lại',
        });
      if (otherId === userId)
        throw new BadRequestException({
          code: 'DIRECT_SELF_FORBIDDEN',
          message: 'Không thể tạo chat 1-1 với chính mình',
        });

      // Tìm conversation DIRECT đã có đúng 2 thành viên đang hoạt động.
      const rows = await this.prisma.conversationMember.findMany({
        where: {
          userId: { in: [userId, otherId] },
          leftAt: null,
          conversation: { type: ChatRoomType.DIRECT, deletedAt: null },
        },
      });
      const byConv = new Map<string, Set<string>>();
      for (const r of rows) {
        const set = byConv.get(r.conversationId) ?? new Set<string>();
        set.add(r.userId);
        byConv.set(r.conversationId, set);
      }
      for (const [cid, set] of byConv) {
        if (set.size === 2 && set.has(userId) && set.has(otherId)) {
          const total = await this.prisma.conversationMember.count({
            where: { conversationId: cid, leftAt: null },
          });
          if (total === 2) {
            const conversation = await this.prisma.chatConversation.findUnique({
              where: { id: cid },
            });
            return { data: { conversation, reused: true }, error: null };
          }
        }
      }

      const peer = await this.prisma.user.findUnique({
        where: { id: otherId },
      });
      if (!peer || peer.status !== UserStatus.ACTIVE)
        throw new NotFoundException({
          code: 'PEER_NOT_FOUND',
          message: 'Không tìm thấy người dùng để trò chuyện',
        });

      const conversation = await this.prisma.chatConversation.create({
        data: {
          type: ChatRoomType.DIRECT,
          createdBy: userId,
          members: {
            create: [
              { userId, role: 'admin' },
              { userId: otherId, role: 'member' },
            ],
          },
        },
      });
      return { data: { conversation, reused: false }, error: null };
    }

    // LINEAGE_GROUP / FAMILY_GROUP
    if (!dto.lineageId)
      throw new BadRequestException({
        code: 'LINEAGE_REQUIRED',
        message: 'Nhóm trò chuyện của họ cần có lineageId',
      });
    await this.requireApprovedLineageMember(dto.lineageId, userId);
    const approved = await this.prisma.lineageMembership.findMany({
      where: { lineageId: dto.lineageId, status: 'approved' },
    });
    const approvedIds = new Set(approved.map((a) => a.userId));
    const memberIds = [...new Set(dto.memberIds ?? [])].filter(
      (id) => id !== userId && approvedIds.has(id),
    );

    const conversation = await this.prisma.chatConversation.create({
      data: {
        type,
        lineageId: dto.lineageId,
        title: dto.title,
        createdBy: userId,
        members: {
          create: [
            { userId, role: 'admin' },
            ...memberIds.map((id) => ({ userId: id, role: 'member' })),
          ],
        },
      },
    });
    return { data: { conversation, reused: false }, error: null };
  }

  /**
   * POST /chat/lineages/:lineageId/group — nhóm chat cả họ. Mỗi họ một
   * nhóm: chưa có thì tạo với mọi thành viên đã duyệt; đã có thì thêm
   * người gọi vào nếu chưa ở trong (người vào họ sau vẫn chat được).
   */
  async ensureLineageGroup(userId: string, lineageId: string) {
    await this.requireApprovedLineageMember(lineageId, userId);
    const existing = await this.prisma.chatConversation.findFirst({
      where: { lineageId, type: ChatRoomType.LINEAGE_GROUP, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    if (existing) {
      await this.prisma.conversationMember.upsert({
        where: { conversationId_userId: { conversationId: existing.id, userId } },
        create: { conversationId: existing.id, userId, role: 'member' },
        update: { leftAt: null },
      });
      return { data: { conversation: existing, reused: true }, error: null };
    }
    const [lineage, approved] = await Promise.all([
      this.prisma.lineage.findUnique({ where: { id: lineageId }, select: { name: true } }),
      this.prisma.lineageMembership.findMany({
        where: { lineageId, status: 'approved' },
        select: { userId: true },
      }),
    ]);
    const others = [...new Set(approved.map((a) => a.userId))].filter((id) => id !== userId);
    const conversation = await this.prisma.chatConversation.create({
      data: {
        type: ChatRoomType.LINEAGE_GROUP,
        lineageId,
        title: `Cả họ · ${lineage?.name ?? ''}`.slice(0, 255),
        createdBy: userId,
        members: {
          create: [
            { userId, role: 'admin' },
            ...others.map((id) => ({ userId: id, role: 'member' })),
          ],
        },
      },
    });
    return { data: { conversation, reused: false }, error: null };
  }

  /**
   * GET /chat/conversations — các conversation user còn là thành viên,
   * kèm tin nhắn cuối + số tin chưa đọc, sắp xếp updatedAt desc, cursor paging.
   */
  async listConversations(
    userId: string,
    query: { cursor?: string; limit?: number },
  ) {
    const take = Math.min(Math.max(query.limit ?? 20, 1), 50);
    const memberships = await this.prisma.conversationMember.findMany({
      where: {
        userId,
        leftAt: null,
        ...(query.cursor ? { id: { gt: query.cursor } } : {}),
      },
      orderBy: { id: 'asc' },
      take: take + 1,
    });
    const hasMore = memberships.length > take;
    const page = memberships.slice(0, take);
    const convIds = page.map((m) => m.conversationId);
    const conversations = convIds.length
      ? await this.prisma.chatConversation.findMany({
          where: { id: { in: convIds }, deletedAt: null },
        })
      : [];
    const roleByConv = new Map(page.map((m) => [m.conversationId, m.role]));

    const items = [];
    for (const c of conversations) {
      const lastMessage = await this.prisma.message.findFirst({
        where: { conversationId: c.id },
        include: { sender: { select: { id: true, displayName: true } } },
        orderBy: { createdAt: 'desc' },
      });
      // Tin chưa đọc: tin của người khác mà user chưa có MessageRead.
      const unreadCount = await this.prisma.message.count({
        where: {
          conversationId: c.id,
          senderId: { not: userId },
          NOT: { reads: { some: { userId } } },
        },
      });
      // Tên thành viên để giao diện đặt tên chat 1-1 theo người kia.
      const members = await this.prisma.conversationMember.findMany({
        where: { conversationId: c.id, leftAt: null },
        select: { userId: true, user: { select: { displayName: true } } },
        take: 50,
      });
      items.push({
        ...c,
        members: members.map((m) => ({ userId: m.userId, displayName: m.user.displayName })),
        myRole: roleByConv.get(c.id) ?? 'member',
        lastMessage: lastMessage ? this.presentMessage(lastMessage) : null,
        unreadCount,
      });
    }
    items.sort(
      (a, b) => +new Date(b.updatedAt as Date) - +new Date(a.updatedAt as Date),
    );
    return {
      data: {
        conversations: items,
        next_cursor: hasMore ? page[page.length - 1].id : null,
      },
      error: null,
    };
  }

  // ------------------------------------------------------------ messages

  /**
   * GET /chat/conversations/:id/messages — lịch sử, mới nhất trước,
   * cursor = id của tin cũ nhất trang trước.
   */
  async getMessages(
    userId: string,
    conversationId: string,
    query: { cursor?: string; limit?: number },
  ) {
    await this.requireConversation(conversationId);
    await this.requireActiveMember(conversationId, userId);

    let cursorFilter: Record<string, unknown> = {};
    if (query.cursor) {
      const cursorMsg = await this.prisma.message.findUnique({
        where: { id: query.cursor },
      });
      if (cursorMsg && cursorMsg.conversationId === conversationId) {
        cursorFilter = {
          OR: [
            { createdAt: { lt: cursorMsg.createdAt } },
            { createdAt: cursorMsg.createdAt, id: { lt: query.cursor } },
          ],
        };
      }
    }

    const take = Math.min(Math.max(query.limit ?? 30, 1), 50);
    const messages = await this.prisma.message.findMany({
      where: { conversationId, ...cursorFilter },
      include: { sender: { select: { id: true, displayName: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
    });
    const hasMore = messages.length > take;
    const page = messages.slice(0, take);
    return {
      data: {
        messages: page.map((m) => this.presentMessage(m)),
        next_cursor: hasMore ? page[page.length - 1].id : null,
      },
      error: null,
    };
  }

  /**
   * POST /chat/conversations/:id/messages — persist trước (transaction),
   * idempotent theo (conversationId, clientMessageId): gửi lại cùng key
   * → trả message đã có.
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    dto: SendMessageDto,
  ) {
    await this.requireConversation(conversationId);
    await this.requireActiveMember(conversationId, senderId);

    const existing = await this.prisma.message.findUnique({
      where: {
        conversationId_clientMessageId: {
          conversationId,
          clientMessageId: dto.clientMessageId,
        },
      },
      include: { sender: { select: { id: true, displayName: true } } },
    });
    if (existing)
      return { data: { message: this.presentMessage(existing), duplicate: true }, error: null };

    if (dto.type === 'text' && !dto.content?.trim())
      throw new BadRequestException({
        code: 'MESSAGE_CONTENT_REQUIRED',
        message: 'Tin nhắn văn bản cần có nội dung',
      });

    if (dto.replyToId) {
      const target = await this.prisma.message.findUnique({
        where: { id: dto.replyToId },
      });
      if (!target || target.conversationId !== conversationId)
        throw new BadRequestException({
          code: 'INVALID_REPLY_TARGET',
          message: 'Tin nhắn được trả lời không thuộc cuộc trò chuyện này',
        });
    }

    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
    });

    const message = await this.prisma.$transaction(async (tx) => {
      const m = await tx.message.create({
        data: {
          conversationId,
          senderId,
          senderNameSnapshot: sender?.displayName ?? null,
          clientMessageId: dto.clientMessageId,
          type: dto.type,
          content: dto.content,
          replyToId: dto.replyToId,
        },
      });
      await tx.chatConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
      return m;
    });
    // Lấy lại kèm sender để trả về (stub typecheck không cho include trong create).
    const withSender = await this.prisma.message.findUnique({
      where: { id: message.id },
      include: { sender: { select: { id: true, displayName: true } } },
    });
    return {
      data: {
        message: this.presentMessage(withSender ?? message),
        duplicate: false,
      },
      error: null,
    };
  }

  /** PATCH /chat/messages/:id — chỉ người gửi được sửa, chưa bị thu hồi/xóa. */
  async editMessage(userId: string, messageId: string, content: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { sender: { select: { id: true, displayName: true } } },
    });
    if (!message)
      throw new NotFoundException({
        code: 'MESSAGE_NOT_FOUND',
        message: 'Không tìm thấy tin nhắn',
      });
    if (message.senderId !== userId)
      throw new ForbiddenException({
        code: 'NOT_MESSAGE_SENDER',
        message: 'Chỉ người gửi mới được sửa tin nhắn này',
      });
    if (message.recalledAt || message.deletedForAllAt)
      throw new BadRequestException({
        code: 'MESSAGE_CANNOT_EDIT',
        message: 'Tin nhắn đã thu hồi hoặc đã xóa, không thể sửa',
      });
    if (!content?.trim())
      throw new BadRequestException({
        code: 'MESSAGE_CONTENT_REQUIRED',
        message: 'Nội dung sửa không được để trống',
      });
    await this.prisma.message.update({
      where: { id: messageId },
      data: { content: content.trim(), editedAt: new Date() },
    });
    const updated = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { sender: { select: { id: true, displayName: true } } },
    });
    return { data: { message: this.presentMessage(updated ?? message) }, error: null };
  }

  /** POST /chat/messages/:id/recall — chỉ người gửi được thu hồi. */
  async recallMessage(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { sender: { select: { id: true, displayName: true } } },
    });
    if (!message)
      throw new NotFoundException({
        code: 'MESSAGE_NOT_FOUND',
        message: 'Không tìm thấy tin nhắn',
      });
    if (message.senderId !== userId)
      throw new ForbiddenException({
        code: 'NOT_MESSAGE_SENDER',
        message: 'Chỉ người gửi mới được thu hồi tin nhắn này',
      });
    if (message.recalledAt)
      return { data: { message: this.presentMessage(message) }, error: null };
    await this.prisma.message.update({
      where: { id: messageId },
      data: { recalledAt: new Date(), content: null, status: 'recalled' },
    });
    const updated = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { sender: { select: { id: true, displayName: true } } },
    });
    return { data: { message: this.presentMessage(updated ?? message) }, error: null };
  }

  /**
   * POST /chat/messages/:id/reactions — toggle reaction; trả tổng hợp
   * [{ emoji, count, reactedByMe }].
   */
  async toggleReaction(userId: string, messageId: string, emoji: string) {
    if (!emoji?.trim())
      throw new BadRequestException({
        code: 'EMOJI_REQUIRED',
        message: 'Cần chỉ định emoji',
      });
    const cleanEmoji = emoji.trim();
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message)
      throw new NotFoundException({
        code: 'MESSAGE_NOT_FOUND',
        message: 'Không tìm thấy tin nhắn',
      });
    await this.requireActiveMember(message.conversationId, userId);

    const existing = await this.prisma.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: { messageId, userId, emoji: cleanEmoji },
      },
    });
    let reacted: boolean;
    if (existing) {
      await this.prisma.messageReaction.delete({ where: { id: existing.id } });
      reacted = false;
    } else {
      await this.prisma.messageReaction.create({
        data: { messageId, userId, emoji: cleanEmoji },
      });
      reacted = true;
    }

    const all = await this.prisma.messageReaction.findMany({
      where: { messageId },
    });
    const agg = new Map<string, { count: number; reactedByMe: boolean }>();
    for (const r of all) {
      const e = agg.get(r.emoji) ?? { count: 0, reactedByMe: false };
      e.count += 1;
      if (r.userId === userId) e.reactedByMe = true;
      agg.set(r.emoji, e);
    }
    const reactions = [...agg.entries()].map(([e, v]) => ({
      emoji: e,
      count: v.count,
      reactedByMe: v.reactedByMe,
    }));
    return { data: { messageId, reactions, reacted }, error: null };
  }

  /** POST /chat/conversations/:id/read — đánh dấu đã đọc (upsert). */
  async markRead(userId: string, conversationId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message || message.conversationId !== conversationId)
      throw new NotFoundException({
        code: 'MESSAGE_NOT_FOUND',
        message: 'Không tìm thấy tin nhắn trong cuộc trò chuyện này',
      });
    await this.requireActiveMember(conversationId, userId);
    await this.prisma.messageRead.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: { messageId, userId },
      update: { readAt: new Date() },
    });
    return { data: { ok: true }, error: null };
  }

  // ------------------------------------------------------------- members

  /**
   * POST /chat/conversations/:id/members — thêm thành viên.
   * Quyền: admin của conversation hoặc ADMIN+ của dòng họ.
   * Nhóm gắn lineage chỉ add người là approved member của họ đó.
   * Người đã rời (leftAt) được add lại; chat 1-1 không thêm người.
   */
  async addMembers(
    requesterId: string,
    conversationId: string,
    userIds: string[],
  ) {
    const conv = await this.requireConversation(conversationId);
    if (conv.type === ChatRoomType.DIRECT)
      throw new BadRequestException({
        code: 'CANNOT_ADD_TO_DIRECT',
        message: 'Không thể thêm người vào chat 1-1',
      });
    await this.requireConversationManager(
      conversationId,
      conv.lineageId ?? undefined,
      requesterId,
    );

    let candidates = [...new Set(userIds)].filter((id) => id !== requesterId);
    if (conv.lineageId) {
      const approved = await this.prisma.lineageMembership.findMany({
        where: { lineageId: conv.lineageId, status: 'approved' },
      });
      const approvedIds = new Set(approved.map((a) => a.userId));
      candidates = candidates.filter((id) => approvedIds.has(id));
    }
    const validUsers = await this.prisma.user.findMany({
      where: { id: { in: candidates }, status: UserStatus.ACTIVE },
    });
    const validIds = new Set(validUsers.map((u) => u.id));

    const added: string[] = [];
    for (const id of candidates) {
      if (!validIds.has(id)) continue;
      const existing = await this.prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId, userId: id } },
      });
      if (existing) {
        if (existing.leftAt) {
          await this.prisma.conversationMember.update({
            where: { id: existing.id },
            data: { leftAt: null, joinedAt: new Date(), role: 'member' },
          });
          added.push(id);
        }
        continue; // đã là thành viên → bỏ qua
      }
      await this.prisma.conversationMember.create({
        data: { conversationId, userId: id, role: 'member' },
      });
      added.push(id);
    }
    if (added.length)
      await this.prisma.chatConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
    return { data: { added }, error: null };
  }

  /**
   * DELETE /chat/conversations/:id/members/:userId — xóa thành viên.
   * Không được xóa admin cuối cùng của cuộc trò chuyện.
   */
  async removeMember(
    requesterId: string,
    conversationId: string,
    targetUserId: string,
  ) {
    const conv = await this.requireConversation(conversationId);
    await this.requireConversationManager(
      conversationId,
      conv.lineageId ?? undefined,
      requesterId,
    );
    const target = await this.prisma.conversationMember.findFirst({
      where: { conversationId, userId: targetUserId, leftAt: null },
    });
    if (!target)
      throw new NotFoundException({
        code: 'MEMBER_NOT_FOUND',
        message: 'Không tìm thấy thành viên trong cuộc trò chuyện',
      });
    if (target.role === 'admin') {
      const remainingAdmins = await this.prisma.conversationMember.count({
        where: {
          conversationId,
          role: 'admin',
          leftAt: null,
          NOT: { userId: targetUserId },
        },
      });
      if (remainingAdmins === 0)
        throw new ForbiddenException({
          code: 'LAST_CONVERSATION_ADMIN',
          message: 'Không thể xóa quản trị viên cuối cùng của cuộc trò chuyện',
        });
    }
    await this.prisma.conversationMember.update({
      where: { id: target.id },
      data: { leftAt: new Date() },
    });
    return { data: { removed: true }, error: null };
  }

  /**
   * POST /chat/conversations/:id/leave — tự rời (set leftAt).
   * Admin cuối cùng không được rời khi nhóm còn thành viên khác.
   */
  async leaveConversation(userId: string, conversationId: string) {
    await this.requireConversation(conversationId);
    const membership = await this.prisma.conversationMember.findFirst({
      where: { conversationId, userId, leftAt: null },
    });
    if (!membership) return { data: { left: true }, error: null };
    if (membership.role === 'admin') {
      const [otherMembers, otherAdmins] = await Promise.all([
        this.prisma.conversationMember.count({
          where: { conversationId, leftAt: null, NOT: { userId } },
        }),
        this.prisma.conversationMember.count({
          where: {
            conversationId,
            role: 'admin',
            leftAt: null,
            NOT: { userId },
          },
        }),
      ]);
      if (otherMembers > 0 && otherAdmins === 0)
        throw new ForbiddenException({
          code: 'LAST_CONVERSATION_ADMIN',
          message:
            'Bạn là quản trị viên cuối cùng — hãy chuyển quyền quản trị cho người khác trước khi rời nhóm',
        });
    }
    await this.prisma.conversationMember.update({
      where: { id: membership.id },
      data: { leftAt: new Date() },
    });
    return { data: { left: true }, error: null };
  }

  /** Kiểm tra user có phải thành viên đang hoạt động không (dùng cho gateway). */
  async isMember(conversationId: string, userId: string): Promise<boolean> {
    const m = await this.prisma.conversationMember.findFirst({
      where: { conversationId, userId, leftAt: null },
    });
    return !!m;
  }
}
