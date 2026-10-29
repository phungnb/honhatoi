import { Transform } from 'class-transformer';

/**
 * Chuẩn hóa số điện thoại Việt Nam về dạng +84xxxxxxxxx trước khi lưu/tra.
 * Web gửi "0912…", app mobile gửi "+84912…" — không chuẩn hóa thì cùng một
 * người thành hai tài khoản.
 */
export function normalizeVnPhone(input: string): string {
  const s = input.replace(/[\s.\-()]/g, '');
  if (s.startsWith('+')) return s;
  if (s.startsWith('84')) return `+${s}`;
  if (s.startsWith('0')) return `+84${s.slice(1)}`;
  return s;
}

/** Decorator cho DTO: chuẩn hóa trường số điện thoại (cần transform: true). */
export const NormalizePhone = () =>
  Transform(({ value }) =>
    typeof value === 'string' ? normalizeVnPhone(value) : value,
  );
