/**
 * Nguồn (origin) được phép gọi API từ trình duyệt.
 *
 * Mặc định: web production (honhatoi.vercel.app, tên cũ honhatoi-web-admin) và mọi bản preview của team racehub1
 * (đuôi `-racehub1.vercel.app` chỉ team đó tạo được). CORS_ORIGINS (danh
 * sách cách nhau bằng dấu phẩy) bổ sung thêm, ví dụ tên miền riêng hoặc
 * http://localhost:3000 khi phát triển.
 * Trước đây khi thiếu CORS_ORIGINS thì không origin nào được phép, trình
 * duyệt báo "Failed to fetch" ở mọi trang.
 */
const DEFAULT_ORIGINS: (string | RegExp)[] = [
  'https://honhatoi.vercel.app',
  'https://honhatoi-web-admin.vercel.app',
  /^https:\/\/honhatoi(-web-admin)?-[a-z0-9-]+-racehub1\.vercel\.app$/,
];

export function corsOrigins(): (string | RegExp)[] {
  const extra = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...DEFAULT_ORIGINS, ...extra];
}
