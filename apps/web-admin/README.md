# HỌ NHÀ TÔI — Web quản trị

Khung giao diện web quản trị (Next.js 14, App Router, TypeScript) dành cho
**quản trị dòng họ** và **quản trị hệ thống**, theo Đặc tả kỹ thuật mục 1.2:
dùng chung API backend với mobile app, phân quyền thực thi tại backend.

Hiện tại là khung UI với dữ liệu mẫu trong từng trang (đánh dấu `TODO`),
sẵn sàng nối API backend.

## Yêu cầu

- Node.js 18.17+ (khuyến nghị Node 20 LTS)
- npm 9+

## Cài đặt và chạy

```bash
cd apps/web-admin
npm install
npm run dev
```

Mở http://localhost:3000 — sidebar điều hướng gồm: Tổng quan,
Duyệt xác minh gia phả, Dòng họ, Thành viên, Nhật ký kiểm toán, Cài đặt.

## Biến môi trường

Tạo file `.env.local` từ mẫu `.env.example`:

| Biến                   | Bắt buộc | Mô tả                              |
| ---------------------- | -------- | ---------------------------------- |
| `NEXT_PUBLIC_API_URL`  | Có       | URL gốc của API backend dùng chung |

```bash
cp .env.example .env.local
```

## Lệnh khác

```bash
npm run build      # build production
npm run start      # chạy bản production đã build
npm run typecheck  # kiểm tra TypeScript (tsc --noEmit)
```

## Cấu trúc

```
apps/web-admin/
├── app/
│   ├── layout.tsx          # layout gốc (lang="vi") + sidebar
│   ├── globals.css         # design tokens "Modern Family Tech"
│   ├── page.tsx            # Tổng quan
│   ├── duyet-xac-minh/     # hàng đợi duyệt xác minh gia phả
│   ├── dong-ho/            # danh sách dòng họ
│   ├── thanh-vien/         # danh sách thành viên
│   ├── nhat-ky/            # nhật ký kiểm toán
│   └── cai-dat/            # cài đặt hệ thống
├── components/
│   └── Sidebar.tsx         # điều hướng (đánh dấu trang đang xem)
├── lib/
│   └── api.ts              # khung fetch API backend + Authorization header
└── .env.example
```

## Ghi chú nối backend

- Mọi trang đang dùng dữ liệu mẫu trong file, mỗi chỗ đều có `TODO` ghi rõ
  endpoint dự kiến (ví dụ `GET /admin/de-xuat-xac-minh`).
- `lib/api.ts` tự gắn header `Authorization: Bearer <token>`; xem TODO trong
  file để chuyển sang đọc token từ cookie httpOnly phía server khi triển
  khai thật.
