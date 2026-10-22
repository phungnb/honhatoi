# HỌ NHÀ TÔI — Monorepo

Ứng dụng gia phả số + cộng đồng dòng họ + mạng xã hội gia đình (tiếng Việt).

## Kiến trúc

```
honhatoi/
├── apps/
│   ├── mobile/        # Flutter — app mobile Android/iOS (1 codebase)
│   └── web-admin/     # Next.js — web quản trị dòng họ & hệ thống
├── services/
│   └── api/           # NestJS + Prisma + PostgreSQL — API backend dùng chung
├── docs/
│   └── PRD/           # Bộ tài liệu đặc tả (PRD, UI/UX, kỹ thuật, bảo mật, test)
└── prototype/         # Bản mẫu tương tác HTML (tham khảo giao diện)
```

Luồng: Mobile / Web quản trị → HTTPS + WebSocket → NestJS API → PostgreSQL.
Mọi dữ liệu đều gắn với một dòng họ (`lineage_id`); backend ép cô lập: thành viên họ này
không thể truy cập dữ liệu họ kia (xem `services/api/src/common/guards/lineage.guard.ts`).

## Thiết kế

Bộ màu **Modern Family Tech v1** (đã chốt):
- Dark: nền `#0B0F14`, thẻ `#151A24`, nhấn `#A3FF12`, chữ `#F5F7FA`, chữ phụ `#B4C0D0`, viền `#303B4D`, điểm nhấn ấm `#E8B86D`
- Light: nền `#F6F4EE`, nhấn `#4E9A00`, chữ `#1B2029`
- Font: Be Vietnam Pro. Xem chi tiết trong `prototype/index.html`.

## Chạy từng phần

### 1. Backend API

```bash
cd services/api
npm install
cp .env.example .env        # sửa DATABASE_URL, JWT_SECRET
npx prisma migrate dev      # tạo bảng theo schema.prisma (36 bảng)
npx prisma db seed          # dữ liệu demo: 2 dòng họ, hồ sơ mẫu
npm run start:dev            # API chạy ở http://localhost:3001/api/v1
```

### 2. App mobile (Flutter)

Cài Flutter SDK 3.x trước (https://docs.flutter.dev/get-started/install).

```bash
cd apps/mobile
flutter pub get
flutter run                 # chọn thiết bị/emulator
```

Mặc định app trỏ về `http://10.0.2.2:3000` trên Android emulator —
sửa trong `lib/core/config.dart` cho đúng địa chỉ API của bạn.

### 3. Web quản trị

```bash
cd apps/web-admin
npm install
cp .env.example .env        # NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
npm run dev                 # http://localhost:3000
```

## Trạng thái

Đây là **khung dự án (scaffold)** — kiến trúc, theme, schema dữ liệu và API khung đã có;
logic nghiệp vụ chi tiết trong các service được đánh dấu `TODO` để triển khai tiếp
theo tài liệu trong `docs/PRD/`.

## Tài liệu

- Đặc tả: `docs/PRD/00-Index.md`
- Kỹ thuật: `docs/PRD/03-KyThuat/Technical-Spec.md`
- Bảo mật & phân quyền: `docs/PRD/04-BaoMat/Security-Matrix.md`
