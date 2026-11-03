import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StorageService, sniffImage } from '../src/storage/storage.service';

process.env.JWT_SECRET = 'test-secret-for-storage-0123456789';

test('URL ký: đúng chữ ký thì qua, sửa khóa/hạn/chữ ký thì bị chặn', () => {
  const s = new StorageService();
  const key = 'chat/abc/1.jpg';
  const u = new URL(`http://x${s.signedPath(key)}`);
  const e = u.searchParams.get('e') ?? undefined;
  const sig = u.searchParams.get('s') ?? undefined;
  assert.equal(u.pathname, '/files/chat/abc/1.jpg');
  assert.ok(s.verify(key, e, sig));
  assert.ok(!s.verify('chat/abc/2.jpg', e, sig));
  assert.ok(!s.verify(key, String(Number(e) + 86400), sig));
  assert.ok(!s.verify(key, e, 'AAAA'));
  assert.ok(!s.verify(key, e, undefined));
});

test('URL ký hết hạn thì bị chặn', () => {
  const s = new StorageService();
  const key = 'chat/abc/1.jpg';
  const old = new URL(`http://x${s.signedPath(key, Date.now() - 5 * 86400_000)}`);
  assert.ok(!s.verify(key, old.searchParams.get('e') ?? undefined, old.searchParams.get('s') ?? undefined));
});

test('URL ký ổn định trong ngày (trình duyệt cache được ảnh)', () => {
  const s = new StorageService();
  const t = Date.UTC(2026, 10, 3, 1);
  assert.equal(s.signedPath('k/a.png', t), s.signedPath('k/a.png', t + 3600_000));
});

test('Nhận diện ảnh theo byte đầu, không theo đuôi tệp', () => {
  const pad = Buffer.alloc(16);
  assert.equal(sniffImage(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), pad]))?.mime, 'image/jpeg');
  assert.equal(
    sniffImage(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), pad]))?.mime,
    'image/png',
  );
  assert.equal(sniffImage(Buffer.concat([Buffer.from('RIFF0000WEBP'), pad]))?.mime, 'image/webp');
  assert.equal(sniffImage(Buffer.concat([Buffer.from('GIF89a'), pad]))?.mime, 'image/gif');
  assert.equal(sniffImage(Buffer.concat([Buffer.from('<svg xmlns='), pad])), null);
  assert.equal(sniffImage(Buffer.from('hi')), null);
});

test('Driver: không cấu hình thì tắt; có STORAGE_DIR thì đĩa; có token Blob thì blob', () => {
  const s = new StorageService();
  const save = { ...process.env };
  delete process.env.STORAGE_DRIVER;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.STORAGE_DIR;
  assert.equal(s.driver(), null);
  process.env.STORAGE_DIR = '/tmp/x';
  assert.equal(s.driver(), 'disk');
  process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_x';
  assert.equal(s.driver(), 'blob');
  process.env = save;
});
