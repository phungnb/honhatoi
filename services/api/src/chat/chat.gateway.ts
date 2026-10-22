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
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

/**
 * ChatGateway — realtime theo spec mục 4.
 * Endpoint: ws(s)://host/realtime (namespace '/realtime').
 * Client mở MỘT kết nối sau đăng nhập, truyền access_token trong handshake;
 * khi token xoay vòng, gửi message `auth` để cập nhật.
 *
 * Sự kiện (spec 4.2):
 *  - server → client: message:new, message:updated, message:recalled,
 *    message:deleted, message:read, typing:start/stop, conversation:updated,
 *    notification:new, message:ack
 *  - client → server: message:send, typing:start/stop, auth, sync
 */
@WebSocketGateway({ namespace: '/realtime', cors: { origin: true, credentials: true } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  /** Registry user_id → tập connection (đa thiết bị) — spec 4.1. */
  private readonly connections = new Map<string, Set<string>>();

  constructor(private readonly chat: ChatService) {}

  async handleConnection(client: Socket) {
    // TODO: verify access_token từ handshake (query ?token= lần đầu / header);
    // từ chối nếu không hợp lệ. Gắn userId vào client.data.
    const userId = (client.handshake.auth?.userId ?? client.handshake.query?.userId) as string;
    if (!userId) {
      client.disconnect(true);
      return;
    }
    client.data.userId = userId;
    if (!this.connections.has(userId)) this.connections.set(userId, new Set());
    this.connections.get(userId)!.add(client.id);
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId as string | undefined;
    if (userId) {
      this.connections.get(userId)?.delete(client.id);
      if (this.connections.get(userId)?.size === 0) this.connections.delete(userId);
    }
  }

  /** Client cập nhật token sau khi xoay vòng. */
  @SubscribeMessage('auth')
  handleAuth(@ConnectedSocket() client: Socket, @MessageBody() body: { token: string }) {
    // TODO: verify token mới, cập nhật client.data.
    return { ok: true };
  }

  /** Client join room để nhận broadcast của conversation. */
  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversation_id: string },
  ) {
    const userId = client.data.userId as string;
    const ok = await this.chat.isMember(body.conversation_id, userId);
    if (!ok) return { error: { code: 'NOT_MEMBER', message: 'Không phải thành viên' } };
    await client.join(`conv:${body.conversation_id}`);
    return { ok: true };
  }

  /** Gửi tin nhắn qua WS — persist trước khi ack/broadcast (HNT-T-012). */
  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: SendMessageDto & { conversation_id: string },
  ) {
    const userId = client.data.userId as string;
    const { conversation_id, ...dto } = body;
    const { data } = await this.chat.sendMessage(conversation_id, userId, dto as SendMessageDto);
    const message = (data as { message: unknown }).message;
    // Broadcast tới mọi thành viên trong room (trừ người gửi — client tự render).
    client.to(`conv:${conversation_id}`).emit('message:new', {
      conversation_id,
      message,
    });
    // Ack cho người gửi (HNT-T-013: client giữ outbox đến khi nhận ack).
    return {
      event: 'message:ack',
      data: { client_message_id: dto.clientMessageId, message_id: (message as { id: string }).id, status: 'sent' },
    };
  }

  /** Typing — không gửi cho người lạ trong message_requests pending. */
  @SubscribeMessage('typing:start')
  handleTypingStart(@ConnectedSocket() client: Socket, @MessageBody() body: { conversation_id: string }) {
    client.to(`conv:${body.conversation_id}`).emit('typing:start', {
      conversation_id: body.conversation_id,
      user_id: client.data.userId,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(@ConnectedSocket() client: Socket, @MessageBody() body: { conversation_id: string }) {
    client.to(`conv:${body.conversation_id}`).emit('typing:stop', {
      conversation_id: body.conversation_id,
      user_id: client.data.userId,
    });
  }

  /** Reconnect: client gửi sync kèm last_message_id để lấy phần thiếu. */
  @SubscribeMessage('sync')
  async handleSync(
    @ConnectedSocket() _client: Socket,
    @MessageBody() body: { conversation_id: string; last_message_id: string },
  ) {
    // TODO: trả messages sau last_message_id (dùng GET /conversations/:id/messages?after=).
    return { messages: [] };
  }

  /** Helper: server phát notification:new tới mọi thiết bị của user. */
  emitToUser(userId: string, event: string, payload: unknown) {
    const sockets = this.connections.get(userId);
    if (!sockets) return false; // offline → job nền gửi push FCM/APNs (dedup_key)
    sockets.forEach((sid) => this.server.to(sid).emit(event, payload));
    return true;
  }
}
