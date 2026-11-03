import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Thông báo đẩy Web Push (chuẩn VAPID) — chạy cho web/PWA trên Chrome,
 * Edge, Firefox, Android; iPhone cần iOS 16.4+ và "Thêm vào MH chính".
 * Vỏ app Capacitor (WebView) không có Push API — cần FCM, làm sau.
 *
 * Biến môi trường: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 * (mailto:… hoặc https://…). Thiếu khóa thì tắt, không lỗi.
 * Đăng ký lưu vào push_devices: platform = 'web', token = JSON subscription.
 */

export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
}

interface WebSub {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

@Injectable()
export class PushService {
  private readonly log = new Logger('Push');
  constructor(private readonly prisma: PrismaService) {}

  publicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY || null;
  }

  enabled(): boolean {
    return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
  }

  async subscribe(userId: string, sub: WebSub) {
    const token = JSON.stringify({ endpoint: sub.endpoint, keys: sub.keys });
    // Một trình duyệt (endpoint) chỉ thuộc một tài khoản: đăng nhập tài
    // khoản khác trên cùng máy thì chuyển đăng ký sang tài khoản mới.
    await this.prisma.pushDevice.deleteMany({
      where: { platform: 'web', token: { contains: JSON.stringify(sub.endpoint) }, NOT: { userId } },
    });
    await this.prisma.pushDevice.upsert({
      where: { userId_token: { userId, token } },
      create: { userId, platform: 'web', token },
      update: {},
    });
    return { data: { subscribed: true }, error: null };
  }

  async unsubscribe(userId: string, endpoint: string) {
    const r = await this.prisma.pushDevice.deleteMany({
      where: { userId, platform: 'web', token: { contains: JSON.stringify(endpoint) } },
    });
    return { data: { removed: r.count }, error: null };
  }

  /** Gửi tới mọi trình duyệt đã đăng ký của các user. Lỗi không ném ra. */
  async sendToUsers(userIds: string[], payload: PushPayload): Promise<number> {
    if (!this.enabled() || userIds.length === 0) return 0;
    const webpush = await import('web-push');
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@honhatoi.vn',
      process.env.VAPID_PUBLIC_KEY as string,
      process.env.VAPID_PRIVATE_KEY as string,
    );
    const devices = await this.prisma.pushDevice.findMany({
      where: { userId: { in: [...new Set(userIds)] }, platform: 'web' },
      select: { id: true, token: true },
    });
    const body = JSON.stringify(payload);
    const dead: string[] = [];
    let ok = 0;
    await Promise.allSettled(
      devices.map(async (d) => {
        try {
          await webpush.sendNotification(JSON.parse(d.token) as WebSub, body, {
            TTL: 24 * 3600,
            timeout: 8000,
          });
          ok += 1;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) dead.push(d.id);
          else this.log.warn(`Gửi push lỗi ${code ?? ''}: ${(e as Error).message}`);
        }
      }),
    );
    if (dead.length) await this.prisma.pushDevice.deleteMany({ where: { id: { in: dead } } });
    return ok;
  }
}
