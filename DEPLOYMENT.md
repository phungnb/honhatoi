# Triển khai lên Vercel

Dự án dùng 2 Vercel project riêng (monorepo):

| Project | Root Directory | Loại |
|---|---|---|
| `honhatoi-web-admin` | `apps/web-admin` | Next.js 14 (tự nhận diện) |
| `honhatoi-api` | `services/api` | Serverless Function (`api/index.ts`) |

## honhatoi-api (backend NestJS)

- Entry: `services/api/api/index.ts` — khởi tạo NestJS một lần, giữ ấm giữa các invocation.
- `services/api/vercel.json`:
  - `buildCommand`: `prisma generate && npm run build && sh scripts/db-sync.sh`.
    `scripts/db-sync.sh`:
    - Build **preview** (PR): bỏ qua database — không để nhánh chưa merge đổi
      schema production.
    - Build **production**: chạy `prisma/sql/2026-10-28-gop-vai-tro.sql`
      (chuyển 7 vai trò cũ về 3, idempotent) rồi `prisma db push`.
      **Không dùng `--accept-data-loss`**: thay đổi có thể làm mất dữ liệu sẽ
      dừng build thay vì xóa dữ liệu. Bước tiếp theo: `prisma migrate deploy`.
  - `rewrites`: `/api/v1/*` → `/api` (giữ nguyên prefix `api/v1` của app).
- Biến môi trường (đã cài trên Vercel): `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`.
- CORS: API tự cho phép `https://honhatoi-web-admin.vercel.app` và các bản
  preview `honhatoi-web-admin-*-racehub1.vercel.app`; `CORS_ORIGINS` (dấu
  phẩy) thêm tên miền khác.
- Tùy chọn: `GOOGLE_CLIENT_ID` (OAuth Client ID loại Web của Google; nhiều ID
  cách nhau bằng dấu phẩy) để bật đăng nhập Google. Không đặt thì
  `/auth/google` trả 503.
- **Giới hạn:** WebSocket chat realtime KHÔNG chạy trên serverless. Các API REST chạy bình thường.

## honhatoi-web-admin (web quản trị)

- Next.js 14, deploy chuẩn.
- Biến môi trường: `NEXT_PUBLIC_API_URL=https://honhatoi-api.vercel.app/api/v1`.
- Tùy chọn: `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (cùng giá trị với API) — có thì
  trang đăng nhập hiện nút Google. Đổi biến này cần deploy lại web.

## App Flutter

Không deploy lên Vercel (app di động). Build APK/IPA riêng để phân phối.

## Phân quyền (từ 28/10/2026)

- Trong mỗi dòng họ: `MEMBER` (Thành viên), `EDITOR` (Người giữ gia phả),
  `ADMIN` (Ban quản trị). Trưởng tộc = `lineages.owner_user_id`.
- Quản trị nền tảng (`/super-admin`): bật bằng SQL, không có API cấp quyền:
  `UPDATE users SET is_platform_admin = true WHERE phone = '<số ĐT>';`
- Đăng nhập: số điện thoại + OTP, email + mật khẩu (sai 5 lần khóa 15
  phút), Google. Số điện thoại được chuẩn hóa về `+84…` ở máy chủ.
  Quên mật khẩu: quản trị nền tảng đặt lại trong `/super-admin`.
- Đổi số điện thoại giữ nguyên tài khoản (mọi quyền đi theo):
  - Tự đổi: web `/tai-khoan` hoặc app tab Cá nhân. Cần mã OTP của cả số cũ
    lẫn số mới; đổi xong các thiết bị khác bị đăng xuất.
  - Mất số cũ: quản trị nền tảng xác minh danh tính rồi đổi hộ trong
    `/super-admin` (ghi lý do vào audit log).
- Web: một cổng `/quan-ly`; đường dẫn cũ (`/duyet-xac-minh`,
  `/admin/<họ>/duyet-xac-minh`, `/dong-ho`…) tự chuyển hướng.
