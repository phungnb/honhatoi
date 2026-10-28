import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';
import { jwtSecret } from '../auth/jwt-secret';

/**
 * ChatGateway — realtime cho module Chat.
 * Endpoint: ws(s)://host/chat (namespace '/chat').
 * Client mở kết nối sau đăng nhập, truyền access token trong handshake.auth.token
 * (dạng 'Bearer xxx' hoặc token thuần). Token không hợp lệ hoặc user không còn
 * ACTIVE → ngắt kết nối ngay.
 *
 * Sự kiện client → server: join, send_message, typing, mark_read
 * Sự kiện server → client: message:new, typing, message:read
 */
@WebSocketGateway({ namespace: '/chat', cors: true })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly jwt = new JwtService({ secret: jwtSecret() });

  constructor(
    private readonly chat: ChatService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    const raw = client.handshake.auth?.token as string | undefined;
    const token =
      raw && raw.startsWith('Bearer ') ? raw.slice(7) : (raw ?? '');
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const payload = (await this.jwt.verifyAsync(token)) as {
        sub?: string;
      };
      const userId = payload?.sub;
      if (!userId) throw new Error('missing sub');
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user || user.status !== UserStatus.ACTIVE)
        throw new Error('inactive user');
      client.data.userId = userId;
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(_client: Socket) {
    // Không cần dọn dẹp đặc biệt: socket.io tự rời khỏi các room.
  }

  private requireUserId(client: Socket): string {
    const userId = client.data?.userId as string | undefined;
    if (!userId) {
      client.disconnect(true);
      throw new Error('unauthenticated socket');
    }
    return userId;
  }

  /** Client join room của conversation để nhận broadcast. */
  @SubscribeMessage('join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string },
  ) {
    const userId = this.requireUserId(client);
    const ok = await this.chat.isMember(body.conversationId, userId);
    if (!ok)
      return {
        ok: false,
        error: {
          code: 'NOT_CONVERSATION_MEMBER',
          message: 'Bạn không phải thành viên của cuộc trò chuyện này',
        },
      };
    await client.join(`conv:${body.conversationId}`);
    return { ok: true };
  }

  /** Gửi tin nhắn qua WS — persist trước khi broadcast (HNT-T-012). */
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: {
      conversationId: string;
      clientMessageId: string;
      type: string;
      content?: string;
      replyToId?: string;
    },
  ) {
    const userId = this.requireUserId(client);
    const { conversationId, ...dto } = body;
    const result = await this.chat.sendMessage(conversationId, userId, dto);
    this.server
      .to(`conv:${conversationId}`)
      .emit('message:new', result.data.message);
    return { ok: true, message: result.data.message };
  }

  /** Trạng thái đang gõ — broadcast tới room trừ người gửi. */
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string; isTyping: boolean },
  ) {
    const userId = this.requireUserId(client);
    client.to(`conv:${body.conversationId}`).emit('typing', {
      conversationId: body.conversationId,
      userId,
      isTyping: !!body.isTyping,
    });
    return { ok: true };
  }

  /** Đánh dấu đã đọc — persist rồi broadcast cho cả room. */
  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string; messageId: string },
  ) {
    const userId = this.requireUserId(client);
    await this.chat.markRead(userId, body.conversationId, body.messageId);
    this.server.to(`conv:${body.conversationId}`).emit('message:read', {
      conversationId: body.conversationId,
      userId,
      messageId: body.messageId,
    });
    return { ok: true };
  }
}
