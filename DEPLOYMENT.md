# Triển khai lên Vercel

Dự án dùng 2 Vercel project riêng (monorepo):

| Project | Root Directory | Loại |
|---|---|---|
| `honhatoi-web-admin` | `apps/web-admin` | Next.js 14 (tự nhận diện) |
| `honhatoi-api` | `services/api` | Serverless Function (`api/index.ts`) |

## honhatoi-api (backend NestJS)

- Entry: `services/api/api/index.ts` — khởi tạo NestJS một lần, giữ ấm giữa các invocation.
- `services/api/vercel.json`:
  - `buildCommand`: `prisma generate && npm run build && prisma db push --skip-generate`
    (đồng bộ schema lên database trong lúc build). **Không dùng `--accept-data-loss`**:
    nếu thay đổi schema có thể làm mất dữ liệu (xóa/đổi tên cột), build sẽ dừng
    lại thay vì tự xóa dữ liệu production. Bước tiếp theo: chuyển sang
    `prisma migrate deploy` với thư mục `prisma/migrations`.
  - `rewrites`: `/api/v1/*` → `/api` (giữ nguyên prefix `api/v1` của app).
- Biến môi trường (đã cài trên Vercel): `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`.
- **Giới hạn:** WebSocket chat realtime KHÔNG chạy trên serverless. Các API REST chạy bình thường.

## honhatoi-web-admin (web quản trị)

- Next.js 14, deploy chuẩn.
- Biến môi trường: `NEXT_PUBLIC_API_URL=https://honhatoi-api.vercel.app/api/v1`.

## App Flutter

Không deploy lên Vercel (app di động). Build APK/IPA riêng để phân phối.
