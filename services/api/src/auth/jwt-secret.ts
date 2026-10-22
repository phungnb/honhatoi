/**
 * Đọc JWT_SECRET từ môi trường. Production bắt buộc phải đặt;
 * môi trường dev dùng khóa tạm kèm cảnh báo rõ ràng.
 */
export function jwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === 'production')
      throw new Error('JWT_SECRET chưa được cấu hình — từ chối khởi động');
    // eslint-disable-next-line no-console
    console.warn(
      '[auth] JWT_SECRET chưa đặt — dùng khóa dev tạm thời, KHÔNG dùng cho production',
    );
    return 'dev-only-secret-change-me';
  }
  return s;
}
