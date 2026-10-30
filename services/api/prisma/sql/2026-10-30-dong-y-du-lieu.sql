-- Lưu thời điểm và phiên bản người dùng đồng ý Điều khoản + Chính sách quyền
-- riêng tư (Luật Bảo vệ dữ liệu cá nhân 2025, Điều 9: đồng ý phải kiểm chứng được).
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_consent_at timestamptz(6);
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_consent_version varchar(20);
