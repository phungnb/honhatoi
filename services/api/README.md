# HỌ NHÀ TÔI — Backend API (NestJS + Prisma)

Backend cho ứng dụng gia phả số + cộng đồng dòng họ + mạng xã hội gia đình.
Căn cứ kỹ thuật: `goals/ho-nha-t-i-prd-package/files/PRD/03-KyThuat/Technical-Spec.md`.

## Yêu cầu

- Node.js 20+
- PostgreSQL 14+ (bật extension `pgcrypto`, `pg_trgm`)

## Chạy local

```bash
# 1. Cài đặt
npm install

# 2. Cấu hình môi trường
cp .env.example .env
# → sửa DATABASE_URL, JWT_SECRET trong .env

# 3. Sinh Prisma Client
npx prisma generate

# 4. Migrate database (tạo toàn bộ schema mục 2 của spec)
npx prisma migrate dev

# 5. Seed dữ liệu demo (1 admin, 2 dòng họ, hồ sơ mẫu)
npx prisma db seed

# 6. Chạy dev
npm run start:dev
# API: http://localhost:3001/api/v1
# Realtime: ws://localhost:3001/realtime
```

## Cấu trúc

```
src/
├── main.ts                 # bootstrap, ValidationPipe global, CORS, prefix /api/v1
├── app.module.ts
├── prisma/                 # PrismaModule (global) + PrismaService
├── common/
│   ├── guards/
│   │   ├── jwt-auth.guard.ts   # khung xác thực JWT (TODO: triển khai verify)
│   │   └── lineage.guard.ts    # CÔ LẬP DỮ LIỆU GIỮA CÁC HỌ — bắt buộc mọi
│   │                           # request có :lineageId (HNT-T-010)
│   └── decorators/
│       └── current-user.decorator.ts
├── auth/           # POST /auth/otp/request, /auth/otp/verify, /auth/refresh, /auth/logout
│                   # + khung passkey/FIDO2 (TODO theo HNT-S-006)
├── lineages/       # CRUD dòng họ, members, join-requests, invites
├── genealogy/      # family_persons CRUD, relationships, proposals (đề xuất chờ duyệt)
├── chat/           # conversations/messages REST + ChatGateway WebSocket
├── events/         # CRUD sự kiện (giỗ, sinh nhật, họp họ), RSVP
└── notifications/  # GET /notifications, đánh dấu đã đọc, dedup_key (HNT-T-026)
prisma/
├── schema.prisma   # 36 bảng theo spec mục 2, snake_case, UUID, onDelete đúng HNT-T-023
└── seed.ts
```

## Quy tắc bảo mật đã thể hiện trong khung

- **HNT-T-010**: phân quyền tại backend — `LineageGuard` chặn mọi request có
  `:lineageId` nếu user không phải thành viên `approved` của họ đó.
- **HNT-T-023**: không `ON DELETE CASCADE` từ `users` sang dữ liệu gia phả/chat
  của người khác — schema dùng `SET NULL` + snapshot (`sender_name_snapshot`,
  `author_name_snapshot`); `users` xóa mềm.
- **HNT-T-024**: `family_persons.verification_status` tách khỏi
  `genealogy_permissions` — hai trục độc lập.
- **HNT-T-012/013**: tin nhắn persist trước khi ack/broadcast; idempotency qua
  `(conversation_id, client_message_id)`.
- **HNT-T-020**: `audit_logs` chỉ append (thu hồi UPDATE/DELETE ở migration SQL).

## Ghi chú triển khai (TODO trong code)

- `JwtAuthGuard`: verify JWT thật (RS256 ở production).
- `AuthService`: gửi SMS OTP, rate limit 5 lần/15 phút, xoay vòng refresh token,
  phát hiện tái sử dụng → thu hồi toàn bộ phiên.
- `LineageGuard`: ghi audit log khi chặn truy cập (phát hiện dò IDOR).
- Migration SQL bổ sung: CHECK constraints, partial unique index cho
  `genealogy_permissions`, index FTS/trigram (HNT-T-008), REVOKE trên `audit_logs`.
