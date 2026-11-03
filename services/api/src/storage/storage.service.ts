import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { jwtSecret } from '../auth/jwt-secret';

/**
 * Lưu tệp (ảnh chat, sau này ảnh gia phả). Tách khỏi nghiệp vụ để đổi chỗ
 * lưu không phải sửa chat:
 * - `blob`: Vercel Blob, kho PRIVATE — cần BLOB_READ_WRITE_TOKEN (Vercel tự
 *   thêm khi gắn kho vào project). Ảnh không có URL công khai.
 * - `disk`: thư mục STORAGE_DIR trên máy chủ (dùng khi chuyển VPS, hoặc dev).
 * STORAGE_DRIVER chọn tường minh; không đặt thì có token Blob → blob, có
 * STORAGE_DIR → disk, không có gì → tắt (API trả 503 FILE_STORAGE_OFF).
 *
 * Đọc tệp đi qua API (/files/...) với chữ ký HMAC có hạn — thẻ <img> không
 * gửi được Bearer token nên dùng URL ký thay vì JWT.
 */

export type StorageDriver = 'blob' | 'disk';

export interface StoredFile {
  body: Buffer;
  contentType: string;
}

@Injectable()
export class StorageService {
  driver(): StorageDriver | null {
    const d = process.env.STORAGE_DRIVER;
    if (d === 'blob' || d === 'disk') return d;
    if (process.env.BLOB_READ_WRITE_TOKEN) return 'blob';
    if (process.env.STORAGE_DIR) return 'disk';
    return null;
  }

  enabled(): boolean {
    return this.driver() !== null;
  }

  private requireDriver(): StorageDriver {
    const d = this.driver();
    if (!d)
      throw new ServiceUnavailableException({
        code: 'FILE_STORAGE_OFF',
        message: 'Máy chủ chưa bật lưu ảnh — báo quản trị nền tảng',
      });
    return d;
  }

  private diskPath(key: string): string {
    const root = resolve(process.env.STORAGE_DIR || './uploads');
    const p = resolve(join(root, key));
    if (!p.startsWith(root + '/')) throw new Error('Khóa tệp không hợp lệ');
    return p;
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    const d = this.requireDriver();
    if (d === 'blob') {
      const { put } = await import('@vercel/blob');
      await put(key, body, {
        access: 'private',
        contentType,
        addRandomSuffix: false,
        allowOverwrite: false,
      });
      return;
    }
    const p = this.diskPath(key);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, body);
    await writeFile(`${p}.type`, contentType);
  }

  async get(key: string): Promise<StoredFile | null> {
    const d = this.requireDriver();
    if (d === 'blob') {
      const { get } = await import('@vercel/blob');
      const r = await get(key, { access: 'private' });
      if (!r || r.statusCode !== 200 || !r.stream) return null;
      const chunks: Buffer[] = [];
      for await (const c of r.stream as unknown as AsyncIterable<Uint8Array>)
        chunks.push(Buffer.from(c));
      return { body: Buffer.concat(chunks), contentType: r.blob.contentType };
    }
    try {
      const p = this.diskPath(key);
      const [body, type] = await Promise.all([
        readFile(p),
        readFile(`${p}.type`, 'utf8').catch(() => 'application/octet-stream'),
      ]);
      return { body, contentType: type };
    } catch {
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    const d = this.driver();
    if (!d) return;
    try {
      if (d === 'blob') {
        const { del } = await import('@vercel/blob');
        await del(key);
      } else {
        const p = this.diskPath(key);
        await unlink(p);
        await unlink(`${p}.type`).catch(() => undefined);
      }
    } catch {
      // Xóa tệp là việc phụ: lỗi không chặn nghiệp vụ.
    }
  }

  private sig(key: string, exp: number): string {
    return createHmac('sha256', `files:${jwtSecret()}`)
      .update(`${key}|${exp}`)
      .digest('base64url');
  }

  /** Đường dẫn đọc tệp, tương đối với prefix /api/v1 (client tự ghép API_URL). */
  signedPath(key: string, now = Date.now()): string {
    const day = 86400;
    const exp = (Math.floor(now / 1000 / day) + 2) * day; // hết hạn sau 24–48 giờ
    return `/files/${key.split('/').map(encodeURIComponent).join('/')}?e=${exp}&s=${this.sig(key, exp)}`;
  }

  verify(key: string, exp: string | undefined, s: string | undefined): boolean {
    const e = Number(exp);
    if (!s || !Number.isFinite(e) || e * 1000 < Date.now()) return false;
    const want = Buffer.from(this.sig(key, e));
    const got = Buffer.from(s);
    return want.length === got.length && timingSafeEqual(want, got);
  }
}

/** Nhận diện ảnh theo byte đầu tệp — không tin mime client gửi. */
export function sniffImage(b: Buffer): { mime: string; ext: string } | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { mime: 'image/png', ext: 'png' };
  if (b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP')
    return { mime: 'image/webp', ext: 'webp' };
  if (b.subarray(0, 4).toString('ascii') === 'GIF8') return { mime: 'image/gif', ext: 'gif' };
  return null;
}
