-- Đăng nhập bằng email + mật khẩu và Google (idempotent, chạy lại an toàn).
-- Tạo trước bằng SQL vì `prisma db push` coi unique constraint mới là thay
-- đổi có thể mất dữ liệu và dừng build khi không có --accept-data-loss.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz(6);
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub varchar(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_count integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until timestamptz(6);
CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_key ON users (google_sub);
