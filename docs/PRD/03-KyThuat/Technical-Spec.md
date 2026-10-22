# Đặc tả kỹ thuật — Ứng dụng “HỌ NHÀ TÔI”

| Thuộc tính | Giá trị |
|---|---|
| Phiên bản | 1.0 |
| Ngày | 2026-10-22 |
| Căn cứ | Đặc tả chức năng “ĐẶC TẢ” v1.1 (Google Drive, thư mục HO-NHA-TOI) |
| Phạm vi | MVP theo checklist đặc tả: tài khoản, gia phả, giao tiếp, cộng đồng, vận hành |

Tài liệu này quy định kiến trúc, mô hình dữ liệu, API, realtime, lưu trữ, xác thực, hiệu năng và vận hành. Mọi yêu cầu kỹ thuật có thể kiểm thử được đánh mã `HNT-T-xxx` kèm tiêu chí nghiệm thu tóm tắt tại Phụ lục A.

---

## 1. Kiến trúc hệ thống

### 1.1. Nguyên tắc kiến trúc

- Một backend dùng chung cho mobile và web quản trị; không xây hai hệ thống nghiệp vụ riêng cho Android/iOS.
- Gia phả là lõi dữ liệu có cấu trúc (quan hệ lưu dạng bản ghi, không chỉ ảnh cây).
- Phân quyền được thực thi tại backend và database; giao diện chỉ phản ánh quyền, không phải lớp bảo vệ duy nhất (HNT-T-010).
- Tin nhắn và thay đổi gia phả quan trọng được lưu bền vững trước khi xác nhận thành công.

### 1.2. Sơ đồ kiến trúc tổng thể

```
┌──────────────────┐   ┌──────────────────┐   ┌───────────────────┐
│  Mobile App      │   │  Mobile App      │   │  Web quản trị     │
│  Android         │   │  iOS             │   │  (Next.js)        │
│  Flutter / RN    │   │  Flutter / RN    │   │  Quản trị dòng họ │
└────────┬─────────┘   └────────┬─────────┘   │  và hệ thống      │
         │  HTTPS / WSS         │             └─────────┬─────────┘
         └──────────┬───────────┴───────────────────────┘
                    ▼
         ┌──────────────────────┐
         │  API Backend         │
         │  (NestJS / BaaS)     │
         │  - Xác thực & phiên  │
         │  - Phân quyền        │
         │  - Nghiệp vụ         │
         │  - Nhật ký kiểm toán │
         └────┬──────┬──────┬───┘
              │      │      │
     ┌────────┘      │      └────────┐
     ▼               ▼               ▼
┌──────────┐  ┌────────────┐  ┌──────────────┐   ┌───────────┐
│PostgreSQL│  │ Realtime   │  │ Object       │   │ FCM/APNs  │
│ (CSDL    │  │ (WebSocket)│  │ Storage      │   │ (đẩy      │
│  chính)  │  │ Chat, trạng│  │ Ảnh, video,  │   │  thông    │
│ Gia phả, │  │ thái,      │  │ tệp (signed  │   │  báo)     │
│ tài khoản│  │ thông báo  │  │ URL có hạn)  │   └───────────┘
└──────────┘  └────────────┘  └──────────────┘
```

Luồng dữ liệu chính:

1. Client gọi API qua HTTPS; các thao tác nhạy cảm kiểm tra quyền tại backend trước khi chạm dữ liệu.
2. Tin nhắn: client → WebSocket/API → backend lưu DB → broadcast qua WebSocket → push FCM/APNs nếu người nhận offline.
3. Tệp: client xin signed URL → upload trực tiếp lên Object Storage → backend ghi bản ghi đính kèm sau khi xác thực quyền.
4. Web quản trị dùng cùng API backend với phạm vi quyền quản trị.

### 1.3. Lựa chọn công nghệ

| Mã | Thành phần | Lựa chọn | Ghi chú |
|---|---|---|---|
| HNT-T-001 | Mobile | Flutter hoặc React Native (một codebase) | Không viết native riêng cho Android/iOS ở MVP |
| HNT-T-002 | Web quản trị | Next.js | Quản trị dòng họ, quản trị hệ thống, xem nhật ký |
| HNT-T-003 | Backend | NestJS; hoặc BaaS (ví dụ Supabase) có kiểm soát | Nếu dùng BaaS: bắt buộc viết và kiểm thử chính sách truy cập ở tầng database/storage, không phó mặc mặc định |
| HNT-T-004 | Cơ sở dữ liệu | PostgreSQL | Lưu toàn bộ dữ liệu quan hệ; bật `pgcrypto`/`pg_trgm` |
| HNT-T-005 | Realtime | WebSocket (hoặc dịch vụ realtime tương thích) | Chat, trạng thái gửi/đọc, typing, thông báo |
| HNT-T-006 | Lưu trữ tệp | Object Storage (S3-compatible) | Truy cập qua signed URL có thời hạn; xem mục 5 |
| HNT-T-007 | Thông báo đẩy | Firebase Cloud Messaging (Android) và APNs (iOS) | Có thêm kênh in-app và email tùy chọn |
| HNT-T-008 | Tìm kiếm | PostgreSQL Full-Text Search ở giai đoạn đầu | Kết hợp `pg_trgm` cho tìm tên có dấu/không dấu |
| HNT-T-009 | Bảo mật truyền tải | HTTPS/TLS cho API, WSS cho realtime | Không cho phép HTTP trần ở môi trường production |

Tiêu chí nghiệm thu cho các mã trên: xem Phụ lục A.

---

## 2. Sơ đồ cơ sở dữ liệu

### 2.1. Quy ước chung

- Khóa chính: `UUID` (`gen_random_uuid()`), trừ các bảng liên kết nhỏ có thể dùng `BIGINT GENERATED ALWAYS AS IDENTITY`.
- Thời gian: `TIMESTAMPTZ`; `created_at` mặc định `now()`; `updated_at` cập nhật qua trigger.
- Xóa mềm: các thực thể người dùng nhìn thấy có `deleted_at`; dữ liệu gia phả và tin nhắn không bị xóa vật lý khi tài khoản bị xóa (HNT-T-023).
- Trạng thái xác minh (`verification_status`) lưu trên `family_persons`, hoàn toàn tách khỏi bảng quyền `genealogy_permissions` (HNT-T-024).
- Tiền tố bảng theo phân hệ; tên cột dùng `snake_case`.

### 2.2. Nhóm danh tính và tài khoản

#### `users` — Tài khoản đăng nhập (HNT-T-011)

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | Định danh tài khoản |
| phone | VARCHAR(20) | UNIQUE, NULL | Số điện thoại đã xác minh |
| email | VARCHAR(255) | UNIQUE, NULL | Email đã xác minh |
| password_hash | TEXT | NULL | Argon2id; NULL nếu chỉ dùng OTP/OAuth |
| display_name | VARCHAR(100) | NOT NULL | Tên hiển thị |
| avatar_url | TEXT | NULL | Ảnh đại diện (tham chiếu storage key) |
| status | VARCHAR(20) | NOT NULL DEFAULT 'active' | `active`, `suspended`, `deleted` |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| deleted_at | TIMESTAMPTZ | NULL | Xóa mềm tài khoản |

Ràng buộc: `CHECK (phone IS NOT NULL OR email IS NOT NULL)`. Index: `phone`, `email`.

> Quy tắc bắt buộc: bảng `users` không đồng nhất với `family_persons`. Mọi FK từ dữ liệu gia phả/tin nhắn/bài viết trỏ về `users` đều dùng `ON DELETE SET NULL` (giữ lại `*_name_snapshot` để hiển thị) hoặc giữ nguyên khi soft-delete; không dùng `ON DELETE CASCADE` từ `users` sang dữ liệu của người khác (HNT-T-023).

#### `member_profiles` — Hồ sơ cá nhân của chủ tài khoản

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | |
| user_id | UUID | FK → users(id) ON DELETE CASCADE, UNIQUE, NOT NULL | Chủ hồ sơ |
| full_name | VARCHAR(150) | NOT NULL | Họ tên |
| nickname | VARCHAR(100) | NULL | Tên thường gọi |
| date_of_birth | DATE | NULL | Có thể ẩn năm theo quyền riêng tư (xử lý ở tầng hiển thị) |
| gender | VARCHAR(20) | NULL | |
| hometown | VARCHAR(255) | NULL | Quê quán |
| current_city | VARCHAR(255) | NULL | Tỉnh/thành hiện tại (không lưu địa chỉ chi tiết mặc định) |
| occupation | VARCHAR(255) | NULL | Nghề nghiệp |
| education | VARCHAR(255) | NULL | Học vấn |
| bio | TEXT | NULL | Tiểu sử ngắn |
| blood_type | VARCHAR(5) | NULL | Tùy chọn, mặc định riêng tư tuyệt đối |
| privacy_settings | JSONB | NOT NULL DEFAULT '{}' | Phạm vi chia sẻ từng nhóm trường |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL | |

#### `user_sessions` — Phiên đăng nhập và quản lý thiết bị

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | |
| user_id | UUID | FK → users(id) ON DELETE CASCADE, NOT NULL | |
| device_name | VARCHAR(150) | NULL | Tên thiết bị do client gửi |
| device_platform | VARCHAR(20) | NULL | `android`, `ios`, `web` |
| refresh_token_hash | TEXT | NOT NULL, UNIQUE | Chỉ lưu hash; xoay vòng mỗi lần refresh |
| ip_address | INET | NULL | |
| last_active_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| expires_at | TIMESTAMPTZ | NOT NULL | |
| revoked_at | TIMESTAMPTZ | NULL | Thu hồi khi đăng xuất xa |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

Index: `(user_id, revoked_at)`.

#### `phone_otp_codes` — Mã OTP

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | |
| phone | VARCHAR(20) | NOT NULL | |
| code_hash | TEXT | NOT NULL | Chỉ lưu hash của mã |
| purpose | VARCHAR(20) | NOT NULL | `register`, `login`, `recover` |
| attempts | INT | NOT NULL DEFAULT 0 | Khóa sau 5 lần sai (HNT-T-022) |
| expires_at | TIMESTAMPTZ | NOT NULL | Hiệu lực 5 phút |
| consumed_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

#### `push_devices` — Thiết bị nhận push

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | |
| user_id | UUID | FK → users(id) ON DELETE CASCADE, NOT NULL | |
| platform | VARCHAR(10) | NOT NULL | `fcm`, `apns` |
| token | TEXT | NOT NULL | |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL | |

Ràng buộc: `UNIQUE (user_id, token)`.

### 2.3. Nhóm dòng họ và gia phả

#### `lineages` — Dòng họ

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | |
| name | VARCHAR(255) | NOT NULL | Tên gia phả, ví dụ “Gia phả họ Nguyễn tại Đồng Nai” |
| branch_name | VARCHAR(255) | NULL | Tên chi/nhánh |
| hometown_province | VARCHAR(100) | NULL | Tỉnh/thành quê quán |
| hometown_commune | VARCHAR(100) | NULL | Xã/phường quê quán |
| ancestral_hall_address | TEXT | NULL | Địa chỉ nhà thờ họ |
| avatar_url | TEXT | NULL | Ảnh đại diện tổ tiên/nhà thờ họ |
| emblem_url | TEXT | NULL | Gia huy/biểu tượng dòng họ |
| founder_person_id | UUID | FK → family_persons(id) ON DELETE SET NULL, NULL | Tổ tiên khởi nguồn |
| visibility | VARCHAR(20) | NOT NULL DEFAULT 'invite_only' | `private`, `invite_only`, `partial_public` |
| default_tree_layout | VARCHAR(20) | NOT NULL DEFAULT 'vertical' | `vertical`, `horizontal`, `by_generation` |
| created_by | UUID | FK → users(id) ON DELETE SET NULL | Người tạo |
| created_at / updated_at / deleted_at | TIMESTAMPTZ | | |

#### `lineage_memberships` — Tư cách thành viên dòng họ

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | |
| lineage_id | UUID | FK → lineages(id) ON DELETE CASCADE, NOT NULL | |
| user_id | UUID | FK → users(id) ON DELETE CASCADE, NOT NULL | Một tài khoản tham gia nhiều dòng họ |
| role | VARCHAR(30) | NOT NULL DEFAULT 'member' | `member`, `genealogy_manager`, `admin`, `senior_admin` |
| status | VARCHAR(20) | NOT NULL DEFAULT 'pending' | `pending`, `approved`, `rejected`, `removed` |
| requested_branch | VARCHAR(255) | NULL | Nhánh gia đình khai báo khi xin tham gia |
| requested_relation | TEXT | NULL | Quan hệ khai báo khi xin tham gia |
| reviewed_by | UUID | FK → users(id) ON DELETE SET NULL, NULL | Người duyệt |
| joined_at | TIMESTAMPTZ | NULL | |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL | |

Ràng buộc: `UNIQUE (lineage_id, user_id)`. Index: `lineage_id`, `user_id`.

#### `lineage_invites` — Liên kết/mã mời

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | |
| lineage_id | UUID | FK → lineages(id) ON DELETE CASCADE, NOT NULL | |
| code | VARCHAR(64) | UNIQUE, NOT NULL | Mã trong liên kết mời/QR |
| created_by | UUID | FK → users(id) ON DELETE SET NULL | |
| expires_at | TIMESTAMPTZ | NULL | Hết hạn |
| max_uses | INT | NULL | Giới hạn lượt dùng |
| used_count | INT | NOT NULL DEFAULT 0 | |
| revoked_at | TIMESTAMPTZ | NULL | Thu hồi |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

#### `family_persons` — Hồ sơ người trong gia phả (HNT-T-011, HNT-T-024)

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | |
| lineage_id | UUID | FK → lineages(id) ON DELETE RESTRICT, NOT NULL | Không cho xóa dòng họ khi còn hồ sơ |
| full_name | VARCHAR(150) | NOT NULL | Họ tên |
| nickname | VARCHAR(100) | NULL | Tên thường gọi/bí danh |
| avatar_url | TEXT | NULL | |
| gender | VARCHAR(20) | NULL | |
| date_of_birth | DATE | NULL | Ngày sinh (có thể chỉ lưu năm) |
| birth_year_only | BOOLEAN | NOT NULL DEFAULT false | Chỉ biết năm sinh |
| date_of_death | DATE | NULL | Ngày mất |
| hometown | VARCHAR(255) | NULL | Quê quán |
| current_place | VARCHAR(255) | NULL | Nơi ở hiện tại (mức tỉnh/thành) |
| phone | VARCHAR(20) | NULL | Riêng tư theo quyền |
| email | VARCHAR(255) | NULL | Riêng tư theo quyền |
| occupation | VARCHAR(255) | NULL | Nghề nghiệp/nơi làm việc |
| education | VARCHAR(255) | NULL | Học vấn |
| blood_type | VARCHAR(5) | NULL | Tùy chọn, mặc định riêng tư |
| hobbies | TEXT | NULL | Sở thích, kỹ năng |
| bio | TEXT | NULL | Tiểu sử, thành tích, kỷ niệm |
| generation | INT | NULL | Đời thứ n |
| branch | VARCHAR(255) | NULL | Chi/nhánh |
| role_in_lineage | VARCHAR(255) | NULL | Vai vế trong họ |
| verification_status | VARCHAR(30) | NOT NULL DEFAULT 'draft' | `draft`, `pending_verification`, `verified`, `disputed` — tách khỏi quyền truy cập |
| created_by | UUID | FK → users(id) ON DELETE SET NULL, NULL | Người tạo hồ sơ |
| updated_by | UUID | FK → users(id) ON DELETE SET NULL, NULL | Người sửa gần nhất |
| created_at / updated_at / deleted_at | TIMESTAMPTZ | | |

Index: `lineage_id`, `(lineage_id, generation)`, GIN `to_tsvector('simple', full_name)` cho tìm kiếm, `pg_trgm` trên `full_name` cho gợi ý trùng người.

#### `family_relationships` — Quan hệ gia đình có cấu trúc

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | |
| lineage_id | UUID | FK → lineages(id) ON DELETE RESTRICT, NOT NULL | |
| person_id | UUID | FK → family_persons(id) ON DELETE CASCADE, NOT NULL | |
| related_person_id | UUID | FK → family_persons(id) ON DELETE CASCADE, NOT NULL | |
| relationship_type | VARCHAR(30) | NOT NULL | `parent`, `child`, `spouse`, `adoptive_parent`, `adoptive_child`, `ex_spouse` |
| start_date | DATE | NULL | Ngày bắt đầu quan hệ (ví dụ ngày cưới) |
| end_date | DATE | NULL | Ngày kết thúc (ví dụ ly hôn) |
| note | TEXT | NULL | Ghi chú |
| created_by | UUID | FK → users(id) ON DELETE SET NULL, NULL | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

Ràng buộc: `CHECK (person_id <> related_person_id)`, `UNIQUE (lineage_id, person_id, related_person_id, relationship_type)`. Index: `person_id`, `related_person_id`.

> Mọi quan hệ cha–con, vợ–chồng được lưu hai chiều có kiểm soát ở tầng nghiệp vụ (tạo `parent` A→B thì sinh `child` B→A trong cùng transaction), tránh cây gia phả chỉ là ảnh.

#### `person_account_links` — Liên kết tài khoản với hồ sơ gia phả

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | |
| person_id | UUID | FK → family_persons(id) ON DELETE CASCADE, NOT NULL, UNIQUE | Mỗi hồ sơ gia phả liên kết tối đa một tài khoản |
| user_id | UUID | FK → users(id) ON DELETE CASCADE, NOT NULL | Một tài khoản có thể liên kết nhiều hồ sơ ở các dòng họ khác nhau |
| status | VARCHAR(20) | NOT NULL DEFAULT 'pending' | `pending`, `verified`, `rejected` |
| verified_by | UUID | FK → users(id) ON DELETE SET NULL, NULL | Người xác minh |
| verified_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

Ràng buộc: `UNIQUE (person_id, user_id)`. Quy trình này ngăn tạo hồ sơ trùng khi người trong gia phả đăng ký app (QA-02/AT-03).

#### `genealogy_change_requests` — Đề xuất chỉnh sửa và xác minh (GP-06/GP-07)

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | |
| lineage_id | UUID | FK → lineages(id) ON DELETE CASCADE, NOT NULL | |
| person_id | UUID | FK → family_persons(id) ON DELETE SET NULL, NULL | Hồ sơ liên quan |
| relationship_id | UUID | FK → family_relationships(id) ON DELETE SET NULL, NULL | Quan hệ liên quan |
| request_type | VARCHAR(30) | NOT NULL | `create_person`, `update_person`, `delete_person`, `create_relationship`, `delete_relationship` |
| payload | JSONB | NOT NULL | Chứa `before`/`after` đầy đủ — đồng thời là lịch sử chỉnh sửa (GP-09) |
| reason | TEXT | NULL | Lý do đề xuất |
| status | VARCHAR(20) | NOT NULL DEFAULT 'pending' | `pending`, `approved`, `rejected`, `disputed` |
| requested_by | UUID | FK → users(id) ON DELETE SET NULL, NOT NULL | |
| reviewed_by | UUID | FK → users(id) ON DELETE SET NULL, NULL | |
| reviewed_at | TIMESTAMPTZ | NULL | |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL | |

Index: `(lineage_id, status)`.

#### `genealogy_permissions` — Quyền xem/sửa/duyệt gia phả

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | |
| lineage_id | UUID | FK → lineages(id) ON DELETE CASCADE, NOT NULL | |
| user_id | UUID | FK → users(id) ON DELETE CASCADE, NOT NULL | |
| person_id | UUID | FK → family_persons(id) ON DELETE CASCADE, NULL | NULL = phạm vi toàn dòng họ |
| can_view | BOOLEAN | NOT NULL DEFAULT false | |
| can_propose | BOOLEAN | NOT NULL DEFAULT false | Được đề xuất thay đổi |
| can_edit | BOOLEAN | NOT NULL DEFAULT false | Sửa trực tiếp |
| can_verify | BOOLEAN | NOT NULL DEFAULT false | Duyệt đề xuất, xử lý tranh chấp |
| can_manage | BOOLEAN | NOT NULL DEFAULT false | Cấp/quản lý quyền |
| granted_by | UUID | FK → users(id) ON DELETE SET NULL, NULL | |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL | |

Dùng hai partial unique index: một cho `person_id IS NULL`, một cho `person_id IS NOT NULL` trên `(lineage_id, user_id, person_id)`.

> HNT-T-024: `verification_status` (trên `family_persons`) và quyền truy cập (bảng này) là hai trục độc lập — hồ sơ `verified` không đồng nghĩa ai cũng xem được; quyền xem vẫn do `can_view` quyết định.

### 2.4. Nhóm chat và nhắn tin

#### `chat_conversations` — Cuộc trò chuyện

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | |
| type | VARCHAR(20) | NOT NULL | `direct` (1-1), `lineage_group` (phòng chat dòng họ), `family_group` (nhóm Gia đình tôi) |
| lineage_id | UUID | FK → lineages(id) ON DELETE SET NULL, NULL | Phòng chat dòng họ gắn với dòng họ |
| title | VARCHAR(255) | NULL | Tên nhóm |
| avatar_url | TEXT | NULL | |
| description | TEXT | NULL | Mô tả/nội quy nhóm |
| created_by | UUID | FK → users(id) ON DELETE SET NULL | |
| settings | JSONB | NOT NULL DEFAULT '{}' | Ai được gửi tin/ghim/thêm thành viên; chế độ duyệt |
| created_at / updated_at / deleted_at | TIMESTAMPTZ | | |

> Quy tắc kiến trúc: thành viên nhóm chat không mặc nhiên là người cùng huyết thống và không mặc nhiên có quyền sửa gia phả — hai hệ quyền độc lập.

#### `conversation_members` — Thành viên cuộc trò chuyện

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | |
| conversation_id | UUID | FK → chat_conversations(id) ON DELETE CASCADE, NOT NULL | |
| user_id | UUID | FK → users(id) ON DELETE CASCADE, NOT NULL | |
| role | VARCHAR(20) | NOT NULL DEFAULT 'member' | `member`, `admin`, `co_admin` |
| joined_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| left_at | TIMESTAMPTZ | NULL | Rời nhóm nhưng lịch sử giữ lại |
| muted_until | TIMESTAMPTZ | NULL | Tắt thông báo |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

Ràng buộc: `UNIQUE (conversation_id, user_id)`.

#### `messages` — Tin nhắn (HNT-T-012, HNT-T-013)

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | |
| conversation_id | UUID | FK → chat_conversations(id) ON DELETE CASCADE, NOT NULL | |
| sender_id | UUID | FK → users(id) ON DELETE SET NULL, NULL | Giữ tin nhắn khi tài khoản bị xóa |
| sender_name_snapshot | VARCHAR(100) | NULL | Tên hiển thị tại thời điểm gửi |
| client_message_id | VARCHAR(64) | NOT NULL | Idempotency key do client sinh (UUID v4) |
| type | VARCHAR(20) | NOT NULL | `text`, `image`, `video`, `file`, `voice`, `system` |
| content | TEXT | NULL | Nội dung văn bản |
| reply_to_id | UUID | FK → messages(id) ON DELETE SET NULL, NULL | Trả lời (CHAT-07/16) |
| forwarded_from_id | UUID | FK → messages(id) ON DELETE SET NULL, NULL | Chuyển tiếp (CHAT-08) |
| status | VARCHAR(20) | NOT NULL DEFAULT 'sent' | `sending`, `sent`, `delivered`, `read` |
| edited_at | TIMESTAMPTZ | NULL | Sửa trong thời hạn quy định (CHAT-10) |
| recalled_at | TIMESTAMPTZ | NULL | Thu hồi (CHAT-11) |
| deleted_for_all_at | TIMESTAMPTZ | NULL | Xóa với mọi người khi đủ quyền (CHAT-12) |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

Ràng buộc: `UNIQUE (conversation_id, client_message_id)`. Index: `(conversation_id, created_at DESC)`, GIN FTS trên `content` cho tìm kiếm (CHAT-14).

#### `message_attachments` — Tệp đính kèm tin nhắn

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | |
| message_id | UUID | FK → messages(id) ON DELETE CASCADE, NOT NULL | |
| storage_key | TEXT | NOT NULL | Key trên Object Storage (không phải URL công khai) |
| file_name | VARCHAR(255) | NOT NULL | |
| mime_type | VARCHAR(100) | NOT NULL | Kiểm tra allowlist |
| size_bytes | BIGINT | NOT NULL | Giới hạn theo loại tệp |
| width / height | INT | NULL | Ảnh/video |
| duration_sec | INT | NULL | Video/voice |
| thumbnail_key | TEXT | NULL | Bản xem trước |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

#### `message_reactions` — Thả cảm xúc (CHAT-09)

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | |
| message_id | UUID | FK → messages(id) ON DELETE CASCADE, NOT NULL | |
| user_id | UUID | FK → users(id) ON DELETE CASCADE, NOT NULL | |
| emoji | VARCHAR(32) | NOT NULL | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

Ràng buộc: `UNIQUE (message_id, user_id, emoji)`.

#### `message_reads` — Trạng thái đã đọc

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | |
| message_id | UUID | FK → messages(id) ON DELETE CASCADE, NOT NULL | |
| user_id | UUID | FK → users(id) ON DELETE CASCADE, NOT NULL | |
| read_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

Ràng buộc: `UNIQUE (message_id, user_id)`.

#### `message_requests` — Yêu cầu nhắn tin từ người lạ

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | |
| conversation_id | UUID | FK → chat_conversations(id) ON DELETE CASCADE, NOT NULL, UNIQUE | |
| requester_id | UUID | FK → users(id) ON DELETE CASCADE, NOT NULL | |
| target_id | UUID | FK → users(id) ON DELETE CASCADE, NOT NULL | |
| status | VARCHAR(20) | NOT NULL DEFAULT 'pending' | `pending`, `accepted`, `declined`, `blocked` |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| decided_at | TIMESTAMPTZ | NULL | |

Ràng buộc: `CHECK (requester_id <> target_id)`. Khi `pending`: giới hạn số tin nhắn/ngày và không cho gửi ảnh/video (chống spam); không lộ trạng thái trực tuyến của người nhận.

### 2.5. Nhóm kết bạn, chặn, báo cáo

#### `friendships` — Kết bạn

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | |
| requester_id | UUID | FK → users(id) ON DELETE CASCADE, NOT NULL | |
| addressee_id | UUID | FK → users(id) ON DELETE CASCADE, NOT NULL | |
| status | VARCHAR(20) | NOT NULL DEFAULT 'pending' | `pending`, `accepted`, `declined`, `cancelled` |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL | |

Ràng buộc: `CHECK (requester_id <> addressee_id)`, `UNIQUE (requester_id, addressee_id)`.

#### `blocked_users` — Danh sách chặn

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | |
| blocker_id | UUID | FK → users(id) ON DELETE CASCADE, NOT NULL | |
| blocked_id | UUID | FK → users(id) ON DELETE CASCADE, NOT NULL | |
| reason | TEXT | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

Ràng buộc: `CHECK (blocker_id <> blocked_id)`, `UNIQUE (blocker_id, blocked_id)`. Chặn phải ngăn nhắn tin và tương tác theo chính sách ở tầng backend (kiểm tra trong mọi luồng gửi tin nhắn/mời).

#### `reports` — Báo cáo vi phạm

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | |
| reporter_id | UUID | FK → users(id) ON DELETE SET NULL | |
| target_type | VARCHAR(20) | NOT NULL | `user`, `post`, `comment`, `message`, `person` |
| target_id | UUID | NOT NULL | |
| reason | VARCHAR(100) | NOT NULL | Mã lý do |
| details | TEXT | NULL | |
| status | VARCHAR(20) | NOT NULL DEFAULT 'pending' | `pending`, `reviewing`, `resolved`, `dismissed` |
| handled_by | UUID | FK → users(id) ON DELETE SET NULL, NULL | |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL | |

### 2.6. Nhóm cộng đồng: bảng tin, sự kiện, bình chọn

#### `posts` — Bài viết bảng tin

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | |
| lineage_id | UUID | FK → lineages(id) ON DELETE CASCADE, NOT NULL | |
| author_id | UUID | FK → users(id) ON DELETE SET NULL | Giữ bài viết khi tài khoản bị xóa |
| author_name_snapshot | VARCHAR(100) | NULL | |
| title | VARCHAR(255) | NULL | |
| content | TEXT | NOT NULL | |
| category | VARCHAR(30) | NULL | `announcement`, `activity`, `archive`, `memory`, `find_relative` |
| visibility | VARCHAR(20) | NOT NULL DEFAULT 'lineage' | `lineage`, `branch`, `custom` |
| branch | VARCHAR(255) | NULL | Giới hạn theo nhánh khi visibility=`branch` |
| is_pinned | BOOLEAN | NOT NULL DEFAULT false | Ghim bài/thông báo quan trọng |
| status | VARCHAR(20) | NOT NULL DEFAULT 'published' | `published`, `hidden`, `deleted` |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL | |

Index: `(lineage_id, created_at DESC)`, `(lineage_id, is_pinned)`.

#### `comments` — Bình luận

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | |
| post_id | UUID | FK → posts(id) ON DELETE CASCADE, NOT NULL | |
| author_id | UUID | FK → users(id) ON DELETE SET NULL | |
| parent_comment_id | UUID | FK → comments(id) ON DELETE CASCADE, NULL | Trả lời bình luận |
| content | TEXT | NOT NULL | |
| status | VARCHAR(20) | NOT NULL DEFAULT 'published' | `published`, `hidden`, `deleted` |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL | |

#### `post_attachments` — Ảnh/video/album của bài viết

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | |
| post_id | UUID | FK → posts(id) ON DELETE CASCADE, NOT NULL | |
| storage_key | TEXT | NOT NULL | |
| thumbnail_key | TEXT | NULL | |
| mime_type | VARCHAR(100) | NOT NULL | |
| size_bytes | BIGINT | NOT NULL | |
| position | INT | NOT NULL DEFAULT 0 | Thứ tự trong album |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

#### `post_reactions` — Cảm xúc bài viết

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | |
| post_id | UUID | FK → posts(id) ON DELETE CASCADE, NOT NULL | |
| user_id | UUID | FK → users(id) ON DELETE CASCADE, NOT NULL | |
| emoji | VARCHAR(32) | NOT NULL | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

Ràng buộc: `UNIQUE (post_id, user_id, emoji)`.

#### `events` — Sự kiện (giỗ tổ, ngày giỗ, họp họ...)

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | |
| lineage_id | UUID | FK → lineages(id) ON DELETE CASCADE, NOT NULL | |
| conversation_id | UUID | FK → chat_conversations(id) ON DELETE SET NULL, NULL | Sự kiện tạo từ nhóm chat |
| title | VARCHAR(255) | NOT NULL | |
| description | TEXT | NULL | |
| event_type | VARCHAR(30) | NOT NULL | `ancestral_ceremony`, `death_anniversary`, `birthday`, `family_meeting`, `gathering`, `other` |
| start_at | TIMESTAMPTZ | NOT NULL | Mốc thời gian chuẩn |
| end_at | TIMESTAMPTZ | NULL | |
| lunar_date | VARCHAR(20) | NULL | Ngày âm tương ứng (HNT-T-027) |
| location | VARCHAR(255) | NULL | Địa điểm |
| organizer_id | UUID | FK → users(id) ON DELETE SET NULL | Người tổ chức |
| cover_url | TEXT | NULL | |
| status | VARCHAR(20) | NOT NULL DEFAULT 'upcoming' | `upcoming`, `ongoing`, `finished`, `cancelled` |
| created_by | UUID | FK → users(id) ON DELETE SET NULL | |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL | |

#### `event_participants` — Người tham dự

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | |
| event_id | UUID | FK → events(id) ON DELETE CASCADE, NOT NULL | |
| user_id | UUID | FK → users(id) ON DELETE CASCADE, NOT NULL | |
| rsvp_status | VARCHAR(20) | NOT NULL DEFAULT 'invited' | `invited`, `accepted`, `declined`, `tentative` |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL | |

Ràng buộc: `UNIQUE (event_id, user_id)`.

#### `polls`, `poll_options`, `poll_votes` — Bình chọn

| Bảng | Cột chính | Mô tả |
|---|---|---|
| polls | id PK, lineage_id FK NULL, conversation_id FK NULL, question TEXT NOT NULL, created_by FK, closes_at NULL, status (`open`/`closed`), created_at | Câu hỏi bình chọn |
| poll_options | id PK, poll_id FK CASCADE NOT NULL, option_text TEXT NOT NULL, position INT NOT NULL | Các phương án |
| poll_votes | id PK, poll_id FK CASCADE NOT NULL, option_id FK CASCADE NOT NULL, user_id FK CASCADE NOT NULL, created_at | `UNIQUE (poll_id, user_id)` — mỗi người một lượt bình chọn |

### 2.7. Nhóm thông báo và vận hành

#### `notifications` — Thông báo (HNT-T-026)

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | |
| user_id | UUID | FK → users(id) ON DELETE CASCADE, NOT NULL | Người nhận |
| type | VARCHAR(40) | NOT NULL | `message`, `friend_request`, `message_request`, `lineage_invite`, `join_request`, `join_approved`, `event_reminder`, `genealogy_update`, `change_request`, `admin_announcement`, `report_update` |
| title | VARCHAR(255) | NOT NULL | |
| body | TEXT | NULL | |
| data | JSONB | NULL | Payload điều hướng (ids liên quan) |
| dedup_key | VARCHAR(128) | UNIQUE, NULL | Chống gửi trùng lặp thông báo quan trọng |
| is_read | BOOLEAN | NOT NULL DEFAULT false | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

Index: `(user_id, created_at DESC)`.

#### `notification_settings` — Tùy chỉnh thông báo

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | |
| user_id | UUID | FK → users(id) ON DELETE CASCADE, NOT NULL, UNIQUE | |
| quiet_hours_start / quiet_hours_end | TIME | NULL | Giờ yên lặng |
| per_conversation | JSONB | NOT NULL DEFAULT '{}' | Tắt/bật theo từng cuộc trò chuyện |
| sound_enabled | BOOLEAN | NOT NULL DEFAULT true | |
| email_enabled | BOOLEAN | NOT NULL DEFAULT false | Email tùy chọn |
| updated_at | TIMESTAMPTZ | NOT NULL | |

#### `audit_logs` — Nhật ký kiểm toán (HNT-T-020)

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | |
| actor_id | UUID | FK → users(id) ON DELETE SET NULL | Người thực hiện (NULL = hệ thống) |
| action | VARCHAR(100) | NOT NULL | Ví dụ `genealogy.person.update`, `lineage.member.approve`, `admin.role.grant` |
| target_type | VARCHAR(50) | NULL | Loại đối tượng |
| target_id | UUID | NULL | |
| lineage_id | UUID | FK → lineages(id) ON DELETE SET NULL, NULL | Phạm vi dòng họ |
| metadata | JSONB | NULL | Chi tiết thay đổi (không chứa dữ liệu nhạy cảm) |
| ip_address | INET | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

Quy tắc: bảng chỉ append — thu hồi quyền UPDATE/DELETE trên `audit_logs` đối với role của ứng dụng ở tầng database. Index: `(target_type, target_id)`, `(actor_id, created_at DESC)`, `(lineage_id, created_at DESC)`.

#### `data_deletion_requests` — Yêu cầu dữ liệu cá nhân

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | UUID | PK | |
| user_id | UUID | FK → users(id) ON DELETE SET NULL, NOT NULL | |
| request_type | VARCHAR(20) | NOT NULL | `export`, `rectify`, `delete` |
| status | VARCHAR(20) | NOT NULL DEFAULT 'pending' | `pending`, `processing`, `completed`, `rejected` |
| requested_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| completed_at | TIMESTAMPTZ | NULL | |

> Khi `delete` được duyệt: tài khoản chuyển `status='deleted'`, `deleted_at` được đặt; hồ sơ gia phả do người này tạo và toàn bộ lịch sử gia phả của người khác được giữ nguyên; tin nhắn/bài viết giữ lại với snapshot tên (HNT-T-023).

### 2.8. Tóm tắt ràng buộc nghiệp vụ bắt buộc ở tầng DB

| Quy tắc (đặc tả) | Thực thi |
|---|---|
| users ≠ family_persons | Hai bảng độc lập; liên kết duy nhất qua `person_account_links` có xác minh |
| Một tài khoản tham gia nhiều dòng họ | `lineage_memberships` là quan hệ n–n, không có cột lineage duy nhất trên users |
| Trạng thái xác minh tách khỏi quyền truy cập | `family_persons.verification_status` độc lập với `genealogy_permissions`; không có ràng buộc chéo |
| Xóa tài khoản không xóa lịch sử gia phả của người khác | Không `ON DELETE CASCADE` từ `users` sang `family_persons`/`family_relationships`; dùng `SET NULL` + snapshot; xóa mềm users |
| Không đoán ID để đọc dữ liệu riêng tư | Mọi truy vấn đọc đều join qua bảng quyền/thành viên; kiểm thử IDOR ở API |
| Nhật ký bất biến | Thu hồi UPDATE/DELETE trên `audit_logs` đối với role ứng dụng |

---

## 3. Đặc tả API

### 3.1. Quy ước chung

- Base URL: `https://api.honhatoi.vn/api/v1`. Mọi response bọc trong `{ "data": ..., "error": null }` hoặc `{ "data": null, "error": { "code": "...", "message": "..." } }`.
- Xác thực: header `Authorization: Bearer <access_token>` (JWT, hiệu lực 15 phút). Refresh qua `POST /auth/refresh` với refresh token xoay vòng.
- Phân trang: cursor-based — `?cursor=<opaque>&limit=30` (mặc định 30, tối đa 100); response trả `next_cursor`.
- Mã lỗi chuẩn: `400` (dữ liệu không hợp lệ), `401` (chưa xác thực), `403` (không đủ quyền — kèm `REQUIRED_PERMISSION`), `404`, `409` (trùng lặp, ví dụ trùng `client_message_id` đã xử lý khác nội dung), `422` (vi phạm quy tắc nghiệp vụ), `429` (vượt rate limit), `500`.
- Mọi endpoint đọc/ghi dữ liệu dòng họ đều kiểm tra `lineage_memberships.status='approved'` và quyền tương ứng tại backend (HNT-T-010).

### 3.2. Nhóm xác thực và phiên

| Phương thức | Đường dẫn | Mục đích | Ghi chú phân quyền |
|---|---|---|---|
| POST | /auth/phone/otp | Gửi OTP về số điện thoại | Rate limit 5 lần/15 phút/số (HNT-T-022) |
| POST | /auth/phone/verify | Xác minh OTP, đăng ký/đăng nhập | Trả access + refresh token, tạo user_session |
| POST | /auth/email/register | Đăng ký bằng email + mật khẩu | Mật khẩu ≥ 8 ký tự, hash Argon2id |
| POST | /auth/email/login | Đăng nhập email + mật khẩu | Khóa tạm sau 5 lần sai |
| POST | /auth/email/magic-link | Gửi liên kết đăng nhập email | Token một lần, hiệu lực 15 phút |
| POST | /auth/oauth/:provider | Đăng nhập Google/Apple (`provider`: `google`, `apple`) | Xác thực `id_token` phía server |
| POST | /auth/refresh | Xoay vòng refresh token | Phát hiện tái sử dụng → thu hồi toàn bộ phiên |
| POST | /auth/logout | Đăng xuất thiết bị hiện tại | Thu hồi refresh token của phiên |
| POST | /auth/recover | Yêu cầu khôi phục tài khoản (OTP về SĐT/email đã đăng ký) | Không tiết lộ tài khoản có tồn tại hay không |
| POST | /auth/recover/confirm | Xác nhận mã và đặt lại thông tin đăng nhập | |
| GET | /auth/sessions | Liệt kê phiên đăng nhập các thiết bị | Chỉ phiên của chính mình |
| DELETE | /auth/sessions/:id | Đăng xuất một thiết bị từ xa | Chỉ phiên của chính mình |

Trường request/response chính:

- `POST /auth/phone/verify` — Request: `{ "phone": "+8490xxxxxxx", "code": "123456", "device_name": "Pixel 8", "device_platform": "android" }`. Response `200`: `{ "access_token": "eyJ...", "refresh_token": "eyJ...", "expires_in": 900, "user": { "id": "uuid", "display_name": "...", "phone": "+8490xxxxxxx" } }`.
- `POST /auth/oauth/:provider` — Request: `{ "id_token": "..." }`. Response: như trên; nếu là tài khoản mới, backend tạo `users` + `member_profiles` tối thiểu.

### 3.3. Nhóm dòng họ

| Phương thức | Đường dẫn | Mục đích | Ghi chú phân quyền |
|---|---|---|---|
| POST | /lineages | Tạo dòng họ mới | Bất kỳ tài khoản đã xác minh; người tạo thành `senior_admin` |
| GET | /lineages | Liệt kê dòng họ của tôi | Chỉ dòng họ có membership `approved` |
| GET | /lineages/:id | Chi tiết dòng họ | Thành viên được duyệt |
| PATCH | /lineages/:id | Cập nhật thông tin dòng họ | `admin` trở lên |
| DELETE | /lineages/:id | Xóa/xóa mềm dòng họ | `senior_admin`; bị chặn nếu còn `family_persons` (RESTRICT) |
| POST | /lineages/:id/join-requests | Gửi yêu cầu tham gia (kèm nhánh/quan hệ khai báo) | Tài khoản đã xác minh |
| GET | /lineages/:id/join-requests | Liệt kê yêu cầu chờ duyệt | `admin` trở lên |
| POST | /lineages/:id/join-requests/:rid/approve | Duyệt thành viên, cấp vai trò | `admin` trở lên; ghi audit log |
| POST | /lineages/:id/join-requests/:rid/reject | Từ chối yêu cầu | `admin` trở lên |
| GET | /lineages/:id/members | Danh sách thành viên (phân trang, lọc theo chi/nhánh/thế hệ) | Thành viên được duyệt; trường nhạy cảm lọc theo quyền |
| PATCH | /lineages/:id/members/:uid | Đổi vai trò thành viên | `admin` trở lên; không tự hạ cấp `senior_admin` cuối cùng |
| DELETE | /lineages/:id/members/:uid | Xóa thành viên khỏi dòng họ | `admin` trở lên; ghi audit log |
| POST | /lineages/:id/invites | Tạo liên kết/mã mời | `admin` trở lên |
| DELETE | /lineages/:id/invites/:iid | Thu hồi mã mời | `admin` trở lên |
| POST | /invites/:code/accept | Tham gia bằng mã mời | Kiểm tra hạn dùng, lượt dùng, thu hồi |

### 3.4. Nhóm gia phả

| Phương thức | Đường dẫn | Mục đích | Ghi chú phân quyền |
|---|---|---|---|
| POST | /lineages/:id/persons | Thêm hồ sơ người vào gia phả | `can_edit` hoặc tạo `change_request` nếu chỉ `can_propose` |
| GET | /lineages/:id/tree | Lấy cây gia phả theo nhánh/thế hệ | `can_view`; tham số `root_person_id`, `generations`, `direction` (HNT-T-017) |
| GET | /lineages/:id/persons/search | Tìm kiếm người (tên, bí danh, quê quán, thế hệ) | `can_view`; dùng FTS + trigram (HNT-T-008) |
| GET | /persons/:id | Chi tiết hồ sơ | `can_view`; lọc trường nhạy cảm theo quyền |
| PATCH | /persons/:id | Cập nhật hồ sơ | `can_edit` sửa trực tiếp; `can_propose` → sinh `change_request`; trường nhạy cảm (ngày sinh/mất, quan hệ) luôn qua duyệt nếu cấu hình yêu cầu |
| DELETE | /persons/:id | Xóa mềm hồ sơ | `can_edit`; quan hệ liên quan được xử lý trong transaction |
| POST | /persons | Thêm quan hệ (body: `person_id`, `related_person_id`, `relationship_type`) | `can_edit` hoặc `change_request` |
| DELETE | /relationships/:id | Xóa quan hệ | `can_edit` hoặc `change_request` |
| POST | /change-requests | Tạo đề xuất thay đổi (kèm `payload.before/after`, `reason`) | `can_propose` |
| GET | /lineages/:id/change-requests | Liệt kê đề xuất chờ xử lý | `can_verify` |
| POST | /change-requests/:id/approve | Duyệt và áp dụng thay đổi | `can_verify`; áp dụng `payload.after` trong transaction + audit log |
| POST | /change-requests/:id/reject | Từ chối đề xuất | `can_verify` |
| POST | /change-requests/:id/dispute | Đánh dấu tranh chấp | `can_verify`; chuyển `verification_status` của hồ sơ thành `disputed` |
| GET | /persons/:id/history | Lịch sử chỉnh sửa (từ `change_requests.payload`) | `can_view` |
| POST | /persons/:id/link-account | Yêu cầu liên kết tài khoản với hồ sơ | Người được liên kết xác nhận; chống trùng hồ sơ |
| POST | /lineages/:id/permissions | Cấp quyền gia phả cho thành viên | `can_manage`; ghi audit log |
| PATCH | /lineages/:id/permissions/:pid | Sửa quyền | `can_manage`; ghi audit log |
| GET | /lineages/:id/duplicates | Gợi ý hồ sơ có khả năng trùng người | `can_view`; phục vụ GP-08 |

Trường request/response chính:

- `POST /lineages/:id/persons` — Request: `{ "full_name": "Nguyễn Văn A", "nickname": "Tư A", "gender": "male", "date_of_birth": "1948-03-12", "birth_year_only": false, "hometown": "Đồng Nai", "generation": 4, "branch": "Chi trưởng", "relationships": [{ "related_person_id": "uuid", "relationship_type": "child" }] }`. Response `201`: `{ "person": { "id": "uuid", "full_name": "...", "verification_status": "draft", ... } }`; nếu người gọi chỉ có `can_propose`, response `202` với `{ "change_request": { "id": "uuid", "status": "pending" } }`.
- `GET /lineages/:id/tree?root_person_id=uuid&generations=3&direction=descendants` — Response `200`: `{ "root": { "id": "..." }, "persons": [...], "relationships": [...], "has_more": true }` — client tải thêm nhánh khi mở rộng (HNT-T-017).
- `PATCH /persons/:id` — Request: `{ "changes": { "phone": "+8490..." }, "reason": "..." }`. Nếu thuộc nhóm trường cần xác minh: response `202` tạo `change_request` thay vì áp dụng ngay.

### 3.5. Nhóm chat

| Phương thức | Đường dẫn | Mục đích | Ghi chú phân quyền |
|---|---|---|---|
| POST | /conversations | Tạo cuộc trò chuyện (direct/family_group; lineage_group tạo kèm dòng họ) | Kiểm tra quan hệ chặn hai chiều |
| GET | /conversations | Liệt kê cuộc trò chuyện của tôi | Phân trang cursor |
| GET | /conversations/:id | Chi tiết cuộc trò chuyện | Là thành viên |
| PATCH | /conversations/:id | Đổi tên/ảnh/mô tả/cài đặt nhóm | `admin`/`co_admin` của nhóm |
| POST | /conversations/:id/members | Thêm thành viên | Theo `settings` nhóm; kiểm tra chặn |
| DELETE | /conversations/:id/members/:uid | Xóa thành viên | `admin`; ghi log thay đổi nhóm |
| POST | /conversations/:id/messages | Gửi tin nhắn | Là thành viên và được phép gửi; idempotency theo `client_message_id` |
| GET | /conversations/:id/messages | Lịch sử tin nhắn (phân trang) | Là thành viên |
| PATCH | /messages/:id | Sửa tin nhắn trong thời hạn | Chính người gửi |
| POST | /messages/:id/recall | Thu hồi tin nhắn | Chính người gửi, trong thời hạn chính sách |
| DELETE | /messages/:id | Xóa tin nhắn (phía mình / mọi người) | Xóa mọi người cần quyền quản trị nhóm |
| POST | /messages/:id/reactions | Thả cảm xúc | Là thành viên |
| DELETE | /messages/:id/reactions/:emoji | Gỡ cảm xúc | Chính người thả |
| POST | /messages/:id/pin | Ghim tin nhắn | Theo `settings` nhóm |
| GET | /conversations/:id/media | Danh sách ảnh/video/tệp đã chia sẻ | Là thành viên |
| POST | /message-requests | Gửi yêu cầu nhắn tin cho người lạ | Rate limit nghiêm ngặt (HNT-T-022) |
| POST | /message-requests/:id/accept | Chấp nhận → mở cuộc trò chuyện | Người nhận |
| POST | /message-requests/:id/decline | Từ chối | Người nhận |
| POST | /conversations/:id/read | Đánh dấu đã đọc đến message_id | Là thành viên |
| POST | /uploads/init | Xin signed URL upload | Kiểm tra loại tệp, dung lượng |
| POST | /uploads/complete | Hoàn tất upload, tạo attachment | Gắn vào message/post sau khi xác thực |

Trường request/response chính:

- `POST /conversations/:id/messages` — Request: `{ "client_message_id": "uuid-v4", "type": "text", "content": "Chào cả nhà", "reply_to_id": null, "attachment_ids": [] }`. Response `201`: `{ "message": { "id": "uuid", "status": "sent", "created_at": "..." } }`. Nếu `client_message_id` đã tồn tại: trả `200` với message đã có (không tạo trùng — HNT-T-013).
- `GET /conversations/:id/messages?cursor=...&limit=30` — Response: `{ "messages": [...], "next_cursor": "..." }`, mỗi message kèm `attachments[]`, `reactions{}`, `reply_to` rút gọn.

### 3.6. Nhóm kết bạn, chặn, báo cáo

| Phương thức | Đường dẫn | Mục đích | Ghi chú phân quyền |
|---|---|---|---|
| POST | /friendships | Gửi lời mời kết bạn | Rate limit chống gửi lặp (HNT-T-022) |
| POST | /friendships/:id/accept | Chấp nhận kết bạn | Người được mời |
| POST | /friendships/:id/decline | Từ chối | Người được mời |
| DELETE | /friendships/:id | Hủy kết bạn/hủy lời mời | Một trong hai bên |
| GET | /friendships | Danh sách bạn bè / lời mời chờ | Chính mình |
| POST | /blocks | Chặn người dùng | Áp dụng ngay ở mọi luồng gửi tin/mời |
| DELETE | /blocks/:id | Bỏ chặn | Người chặn |
| GET | /blocks | Danh sách đã chặn | Chính mình |
| POST | /reports | Báo cáo người dùng/nội dung vi phạm | Lưu `target_type`/`target_id`, trạng thái xử lý |

### 3.7. Nhóm bảng tin và bình luận

| Phương thức | Đường dẫn | Mục đích | Ghi chú phân quyền |
|---|---|---|---|
| POST | /lineages/:id/posts | Đăng bài | Thành viên được duyệt; `visibility` theo quyền |
| GET | /lineages/:id/posts | Bảng tin (lọc loại, người đăng, thời gian) | Thành viên; lọc theo `visibility`/`branch` |
| GET | /posts/:id | Chi tiết bài viết | Có quyền xem |
| PATCH | /posts/:id | Sửa bài viết | Tác giả hoặc `admin` |
| DELETE | /posts/:id | Xóa/xóa mềm bài viết | Tác giả hoặc `admin`; ghi log khi admin xóa |
| POST | /posts/:id/pin | Ghim/bỏ ghim bài | `admin` |
| POST | /posts/:id/comments | Bình luận | Có quyền xem bài |
| GET | /posts/:id/comments | Danh sách bình luận (phân trang) | Có quyền xem bài |
| POST | /posts/:id/reactions | Thả cảm xúc | Có quyền xem bài |
| POST | /posts/:id/report | Báo cáo bài viết | Tạo `reports` |

### 3.8. Nhóm sự kiện và bình chọn

| Phương thức | Đường dẫn | Mục đích | Ghi chú phân quyền |
|---|---|---|---|
| POST | /lineages/:id/events | Tạo sự kiện | Thành viên (theo cấu hình dòng họ) |
| GET | /lineages/:id/events | Lịch sự kiện (lọc loại, khoảng thời gian) | Thành viên |
| GET | /events/:id | Chi tiết sự kiện | Thành viên |
| PATCH | /events/:id | Cập nhật sự kiện | Người tạo hoặc `admin` |
| DELETE | /events/:id | Hủy sự kiện | Người tạo hoặc `admin` |
| POST | /events/:id/rsvp | Xác nhận tham dự (`accepted`/`declined`/`tentative`) | Người được mời/thành viên |
| GET | /events/:id/participants | Danh sách tham dự | Thành viên |
| POST | /conversations/:id/polls | Tạo bình chọn trong nhóm | Là thành viên |
| POST | /polls/:id/vote | Bỏ phiếu | Là thành viên; một người một phiếu |
| POST | /polls/:id/close | Đóng bình chọn | Người tạo hoặc `admin` |

### 3.9. Nhóm thông báo

| Phương thức | Đường dẫn | Mục đích | Ghi chú phân quyền |
|---|---|---|---|
| GET | /notifications | Danh sách thông báo (phân trang) | Chính mình |
| PATCH | /notifications/:id/read | Đánh dấu đã đọc | Chính mình |
| POST | /notifications/read-all | Đánh dấu đọc tất cả | Chính mình |
| GET | /notifications/settings | Lấy cài đặt thông báo | Chính mình |
| PATCH | /notifications/settings | Cập nhật (giờ yên lặng, theo nhóm) | Chính mình |
| POST | /push-devices | Đăng ký token FCM/APNs | Thiết bị của chính mình |
| DELETE | /push-devices/:id | Hủy đăng ký token | Thiết bị của chính mình |

### 3.10. Nhóm quản trị (web Next.js)

| Phương thức | Đường dẫn | Mục đích | Ghi chú phân quyền |
|---|---|---|---|
| GET | /admin/users | Tìm/liệt kê tài khoản | Quản trị hệ thống |
| PATCH | /admin/users/:id/status | Khóa/mở khóa tài khoản | Quản trị hệ thống; ghi audit log |
| GET | /admin/lineages | Liệt kê dòng họ | Quản trị hệ thống |
| GET | /admin/reports | Hàng đợi báo cáo vi phạm | Quản trị hệ thống / kiểm duyệt |
| POST | /admin/reports/:id/resolve | Xử lý báo cáo | Ghi audit log |
| GET | /admin/audit-logs | Tra cứu nhật ký kiểm toán | Quản trị hệ thống; chỉ đọc |
| POST | /admin/backups | Kích hoạt sao lưu thủ công | Quản trị hệ thống |
| GET | /admin/data-requests | Yêu cầu xuất/sửa/xóa dữ liệu cá nhân | Quản trị hệ thống |
| POST | /admin/data-requests/:id/complete | Hoàn tất yêu cầu dữ liệu | Ghi audit log |

> Nguyên tắc: quản trị viên (kể cả quản trị hệ thống) không được đọc nội dung tin nhắn riêng tư của thành viên qua giao diện/API quản trị — không tồn tại endpoint nào trả về `messages.content` của cuộc trò chuyện mà admin không phải thành viên.

---

## 4. Realtime

### 4.1. Kết nối

- Endpoint WebSocket: `wss://api.honhatoi.vn/realtime`. Client mở một kết nối duy nhất sau khi đăng nhập, truyền `access_token` trong handshake (query `?token=` chỉ cho lần đầu, sau đó dùng message `auth` khi token xoay vòng).
- Server duy trì registry `user_id → tập connection` (hỗ trợ đa thiết bị). Mất kết nối: client tự reconnect với backoff mũ (1s, 2s, 4s… tối đa 30s) và gửi `sync` kèm `last_message_id` để lấy phần thiếu.

### 4.2. Sự kiện

| Sự kiện | Hướng | Payload chính | Ghi chú |
|---|---|---|---|
| `message:new` | server → client | `{ conversation_id, message }` | Gửi tới mọi thành viên đang online (trừ người gửi) |
| `message:updated` | server → client | `{ conversation_id, message_id, content, edited_at }` | Sau khi sửa (CHAT-10) |
| `message:recalled` | server → client | `{ conversation_id, message_id, recalled_at }` | Thu hồi: client thay nội dung bằng trạng thái thu hồi |
| `message:deleted` | server → client | `{ conversation_id, message_id, scope }` | `scope`: `self` hoặc `all` |
| `message:read` | server → client | `{ conversation_id, message_id, user_id, read_at }` | Đã đọc; tôn trọng cài đặt riêng tư |
| `typing:start` / `typing:stop` | cả hai chiều | `{ conversation_id, user_id }` | Không gửi cho người lạ trong `message_requests` pending |
| `conversation:updated` | server → client | `{ conversation_id, change: "member_added" \| "title_changed" \| ... }` | Thay đổi nhóm |
| `notification:new` | server → client | `{ notification }` | Thông báo in-app realtime |
| `message:send` | client → server | `{ client_message_id, conversation_id, type, content, reply_to_id, attachment_ids }` | Gửi qua WS thay cho REST khi online |
| `message:ack` | server → client | `{ client_message_id, message_id, status }` | Xác nhận đã lưu |

Không có sự kiện trạng thái trực tuyến (online/last seen) gửi cho người lạ chưa được chấp nhận — chống lộ thông tin theo yêu cầu đặc tả.

### 4.3. Độ bền và chống trùng (HNT-T-012, HNT-T-013)

1. **Persist trước khi ack**: server ghi `messages` vào PostgreSQL trong transaction (kèm attachments, cập nhật `conversation.updated_at`) rồi mới broadcast và trả ack. Không bao giờ ack trước khi commit.
2. **Idempotency**: cặp `(conversation_id, client_message_id)` là UNIQUE. Client sinh `client_message_id` (UUID v4) và giữ trong outbox local cho đến khi nhận ack; gửi lại cùng `client_message_id` khi timeout/mất mạng → server trả về message đã có thay vì tạo mới.
3. **Thứ tự**: client sắp xếp theo `created_at` (server time) + `id`; khi reconnect, gọi `GET /conversations/:id/messages?after=<last_id>` để bù khoảng trống.
4. **Push dự phòng**: nếu người nhận offline quá `T` giây (mặc định 10s) sau khi persist, job nền gửi push qua FCM/APNs với `dedup_key` để tránh trùng.

---

## 5. Lưu trữ tệp (HNT-T-006, HNT-T-021)

### 5.1. Kiến trúc

- Object Storage tương thích S3, chia bucket theo mức nhạy cảm: `hnt-public` (ảnh đại diện dòng họ công khai một phần), `hnt-private` (mặc định — tin nhắn, tư liệu gia đình, giấy tờ).
- Database chỉ lưu `storage_key`, không lưu URL công khai. Mọi URL client nhận được đều là **signed URL có thời hạn**.

### 5.2. Luồng upload

1. Client gọi `POST /uploads/init` với `{ file_name, mime_type, size_bytes, purpose: "message" | "post" | "avatar" | "genealogy_doc" }`.
2. Server kiểm tra: quyền (là thành viên cuộc trò chuyện/dòng họ), allowlist MIME, giới hạn dung lượng (ảnh ≤ 20MB, video ≤ 200MB, tệp ≤ 50MB — cấu hình được), rate limit upload (HNT-T-022).
3. Server trả về signed PUT URL hiệu lực 15 phút + `upload_id`.
4. Client PUT trực tiếp lên storage; gọi `POST /uploads/complete` → server xác thực object tồn tại, sinh thumbnail (ảnh/video), ghi bản ghi `message_attachments`/`post_attachments`.

### 5.3. Luồng download

- Client gọi `GET /attachments/:id/url` (hoặc endpoint tương ứng của post) → server kiểm tra quyền truy cập (là thành viên cuộc trò chuyện / có `can_view` hồ sơ / có quyền xem bài viết) → trả signed GET URL hiệu lực 5–15 phút.
- Không tồn tại liên kết công khai vĩnh viễn cho tệp riêng tư. Ảnh đại diện ở chế độ `partial_public` dùng signed URL có thời hạn dài hơn (tối đa 7 ngày) và có thể thu hồi bằng cách xoay key prefix.
- Client cache theo `storage_key` + `thumbnail_key`; khi hiển thị danh sách, ưu tiên thumbnail (HNT-T-018).

---

## 6. Xác thực và quản lý phiên

### 6.1. Phương thức đăng nhập

| Phương thức | Luồng kỹ thuật |
|---|---|
| Số điện thoại + OTP | `POST /auth/phone/otp` sinh mã 6 số, lưu hash, hiệu lực 5 phút, tối đa 5 lần thử; `POST /auth/phone/verify` đổi mã lấy token |
| Email + mật khẩu | Argon2id (memory 64MB, iterations 3); khóa tạm tài khoản sau 5 lần sai liên tiếp trong 15 phút |
| Email magic link | Token ngẫu nhiên 32 byte, hash lưu DB, hiệu lực 15 phút, một lần dùng |
| Google / Apple OAuth | Xác thực `id_token` với JWKS của provider phía server; liên kết hoặc tạo `users` theo `sub` + provider |

Số điện thoại/email đã xác minh chỉ chứng minh quyền kiểm soát kênh liên lạc, không chứng minh quan hệ huyết thống — việc liên kết với hồ sơ gia phả đi qua `person_account_links` có xác minh riêng.

### 6.2. Phiên và thiết bị

- Access token JWT (RS256), hiệu lực 15 phút, chứa `sub`, `session_id`, `scope`.
- Refresh token: chuỗi ngẫu nhiên 48 byte, chỉ lưu **hash** trong `user_sessions`; xoay vòng mỗi lần dùng (refresh token cũ bị vô hiệu ngay). Phát hiện refresh token đã dùng lại → coi là đánh cắp, thu hồi toàn bộ phiên của tài khoản và yêu cầu đăng nhập lại.
- Người dùng xem danh sách thiết bị (`GET /auth/sessions`) và đăng xuất từ xa từng thiết bị (`DELETE /auth/sessions/:id`).

### 6.3. Khôi phục tài khoản

- `POST /auth/recover`: gửi OTP về SĐT/email đã đăng ký (response giống nhau dù tài khoản có tồn tại hay không — chống liệt kê tài khoản).
- Trường hợp đổi số điện thoại/mất thiết bị: luồng hỗ trợ có xác minh danh tính (thông tin đã xác minh trước đó + xét duyệt thủ công), không tự động chuyển quyền sở hữu tài khoản chỉ dựa trên email mới.
- Passkey/FIDO2 (WebAuthn) được ghi nhận là hướng tăng cường ở giai đoạn sau, triển khai khi có yêu cầu bảo mật tương ứng trong ma trận bảo mật.

---

## 7. Hiệu năng (HNT-T-014 đến HNT-T-018)

### 7.1. Mục tiêu

| Mã | Mục tiêu | Cách đo |
|---|---|---|
| HNT-T-014 | P95 tải màn hình thông thường ≤ 2,5 giây trên mạng ổn định | Đo từ lúc mở màn hình đến khi nội dung chính hiển thị, trên thiết bị tầm trung |
| HNT-T-015 | P95 hiển thị tin nhắn văn bản tại người nhận ≤ 1 giây khi kết nối ổn định | Đo từ lúc server persist đến lúc client nhận render |

Các mục tiêu trên là ngưỡng nghiệm thu, phải được xác nhận bằng kiểm thử tải/kiểm thử thực tế, không mặc định coi là đạt.

### 7.2. Ghi chú triển khai

- **Phân trang** (HNT-T-016): mọi danh sách (thành viên, tin nhắn, bài viết, thông báo, lịch sử) dùng cursor-based pagination, `limit` mặc định 30, tối đa 100; không có endpoint nào trả toàn bộ bảng.
- **Cây gia phả** (HNT-T-017): `GET /lineages/:id/tree` chỉ trả `N` thế hệ quanh nút gốc (`generations`, mặc định 3) kèm cờ `has_more`; client tải thêm nhánh khi người dùng mở rộng. Với dòng họ lớn, hỗ trợ tải theo `branch`.
- **Tìm kiếm** (HNT-T-008): FTS `to_tsvector` + GIN index cho tên/bí danh/quê quán; `pg_trgm` cho gợi ý gần đúng và phát hiện trùng người (GP-08). Giới hạn 50 kết quả/lần.
- **Media** (HNT-T-018): client nén ảnh trước khi upload (cạnh dài ≤ 2048px, JPEG/WebP quality ~80); server sinh thumbnail (256px) cho danh sách; video có ảnh preview; voice message hiển thị dạng sóng + tốc độ phát ở client.
- **Database**: index đầy đủ cho các khóa ngoại hay join (`conversation_id`, `lineage_id`, `user_id`); connection pooling (tối thiểu theo tải kiểm thử); truy vấn N+1 bị cấm qua review (dùng eager load/batching ở tầng ORM).
- **Giám sát hiệu năng**: thu thập P50/P95 độ trễ API theo endpoint, độ trễ WS end-to-end, tỷ lệ gửi push thành công (HNT-T-025).

---

## 8. Logging, monitoring, backup/restore

### 8.1. Logging

- Log có cấu trúc (JSON): `timestamp`, `level`, `service`, `trace_id`, `user_id` (nếu có), `action`, `latency_ms`. Tập trung về hệ thống log trung tâm, giữ tối thiểu 90 ngày cho log vận hành.
- Không ghi nội dung tin nhắn, OTP, mật khẩu, token vào log. `metadata` của `audit_logs` không chứa dữ liệu nhạy cảm.
- Mobile tích hợp crash reporting; backend tích hợp error tracking với cảnh báo theo ngưỡng.

### 8.2. Monitoring và cảnh báo (HNT-T-025)

| Chỉ số | Ngưỡng cảnh báo đề xuất |
|---|---|
| Tỷ lệ lỗi 5xx | > 1% trong 5 phút |
| P95 độ trễ API | > 2 giây trong 10 phút |
| Tỷ lệ gửi push thành công | < 95% trong 1 giờ |
| Hàng đợi realtime/job nền | Tồn đọng > 5 phút |
| Dung lượng storage | > 80% |

### 8.3. Sao lưu và khôi phục (HNT-T-019)

- PostgreSQL: sao lưu tự động hằng ngày (full) + WAL archiving cho point-in-time recovery; giữ bản sao ở vùng khác.
- Object Storage: bật versioning; chính sách replication hoặc sao chép định kỳ sang bucket dự phòng.
- Diễn tập khôi phục: mỗi quý một lần trên môi trường staging, ghi biên bản. Mục tiêu đề xuất: RPO ≤ 24 giờ, RTO ≤ 4 giờ (chốt sau kiểm thử thực tế).
- Quy trình xử lý sự cố rò rỉ dữ liệu: playbook gồm cô lập, đánh giá phạm vi, thông báo người bị ảnh hưởng theo quy định áp dụng, và báo cáo sau sự cố.

---

## Phụ lục A — Bảng tổng hợp yêu cầu kỹ thuật HNT-T-xxx

| Mã | Yêu cầu | Tiêu chí nghiệm thu (tóm tắt) |
|---|---|---|
| HNT-T-001 | Mobile một codebase (Flutter/RN) cho Android/iOS | Build thành công 2 bản Android/iOS từ cùng mã nguồn; checklist MVP chạy được trên cả hai |
| HNT-T-002 | Web quản trị bằng Next.js | Đăng nhập vai trò quản trị, thực hiện được các endpoint /admin |
| HNT-T-003 | Backend NestJS hoặc BaaS có kiểm soát | Mọi truy cập dữ liệu đi qua lớp kiểm tra quyền; nếu dùng BaaS: chính sách RLS/storage được kiểm thử đạt |
| HNT-T-004 | PostgreSQL là CSDL chính | Schema mục 2 được migrate đầy đủ; backup/restore thành công |
| HNT-T-005 | Realtime qua WebSocket | Các sự kiện mục 4.2 hoạt động; reconnect và bù tin nhắn thiếu đạt |
| HNT-T-006 | Object Storage cho tệp | Upload/download qua signed URL; không có object private nào truy cập được bằng URL đoán |
| HNT-T-007 | Push FCM/APNs | Thiết bị nhận được push khi offline; tôn trọng giờ yên lặng |
| HNT-T-008 | Tìm kiếm bằng PostgreSQL FTS (+ trigram) | Tìm tên có dấu/không dấu trả kết quả < 1s với 100k hồ sơ mẫu |
| HNT-T-009 | HTTPS/TLS (WSS cho realtime) | Quét cấu hình: không có endpoint HTTP trần ở production |
| HNT-T-010 | Phân quyền kiểm tra tại backend/database | Kiểm thử IDOR và leo quyền đều bị chặn 403; ẩn nút trên UI không được tính là bảo vệ |
| HNT-T-011 | Tách `users` và `family_persons` | Không tồn tại FK trực tiếp đồng nhất hai bảng; liên kết chỉ qua `person_account_links` |
| HNT-T-012 | Persist tin nhắn trước khi ack/broadcast | Ngắt tiến trình ngay sau commit điểm kiểm tra: tin nhắn không mất, không ack ma |
| HNT-T-013 | Idempotency bằng `client_message_id` | Gửi lại cùng key 10 lần → đúng 1 bản ghi message |
| HNT-T-014 | P95 tải màn hình ≤ 2,5s | Đo theo mục 7.1 trên thiết bị tầm trung, mạng ổn định |
| HNT-T-015 | P95 hiển thị tin nhắn ≤ 1s | Đo theo mục 7.1 khi kết nối ổn định |
| HNT-T-016 | Phân trang mọi danh sách | Không endpoint list nào trả quá 100 bản ghi/lần; có `next_cursor` |
| HNT-T-017 | Cây gia phả tải theo nhánh/thế hệ | Mở dòng họ 5.000 hồ sơ: lần tải đầu ≤ 2,5s, không render toàn bộ nút |
| HNT-T-018 | Nén ảnh/video, sinh thumbnail | Ảnh upload ≤ 2048px cạnh dài; danh sách dùng thumbnail |
| HNT-T-019 | Sao lưu hằng ngày + diễn tập khôi phục hằng quý | Khôi phục thành công lên staging; đạt RPO/RTO mục 8.3 |
| HNT-T-020 | Audit log bất biến cho thao tác nhạy cảm | Thử UPDATE/DELETE `audit_logs` bằng role app bị từ chối; mọi cấp quyền/duyệt đều có log |
| HNT-T-021 | Không public link vĩnh viễn cho tệp riêng tư | Mọi URL trả cho client đều có thời hạn; hết hạn → 403 |
| HNT-T-022 | Rate limit chống spam | OTP ≤ 5 lần/15 phút; tin nhắn người lạ và lời mời kết bạn bị giới hạn tần suất |
| HNT-T-023 | Xóa tài khoản không xóa lịch sử gia phả của người khác | Sau khi xóa: `family_persons`/`family_relationships` còn nguyên; tin nhắn/bài viết còn với snapshot tên |
| HNT-T-024 | Trạng thái xác minh tách khỏi quyền truy cập | Đổi `verification_status` không làm thay đổi kết quả kiểm tra `genealogy_permissions` và ngược lại |
| HNT-T-025 | Giám sát lỗi, độ trễ, tỷ lệ push + cảnh báo | Dashboard hiển thị các chỉ số mục 8.2; cảnh báo kích hoạt đúng ngưỡng |
| HNT-T-026 | Chống gửi thông báo trùng lặp | Cùng `dedup_key` chỉ tạo một notification; sự kiện quan trọng không gửi trùng khi retry |
| HNT-T-027 | Lưu ngày âm kèm ngày dương cho sự kiện | Sự kiện giỗ/tết có `lunar_date`; nhắc lịch tính đúng theo âm lịch |

---

*Tài liệu kết thúc. Traceability: mã HNT-T-xxx được tham chiếu chéo trong PRD (01-PRD), đặc tả UI/UX (02-UI-UX), ma trận bảo mật (04-BaoMat) và Test Plan (05-TestPlan).*
