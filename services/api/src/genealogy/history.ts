/**
 * Hàm thuần cho lịch sử chỉnh sửa hồ sơ gia phả (kiểm toán 30/10/2026,
 * H1 và H3): ghi lại giá trị cũ của mọi trường bị sửa, và phát hiện sửa
 * chen giữa để không ghi đè dữ liệu của người khác.
 */

/** Đưa giá trị về dạng so sánh/ghi JSON được: Date → 'YYYY-MM-DD'. */
export function normalizeValue(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10);
  if (v === undefined) return null;
  return v;
}

/**
 * Các trường thật sự đổi giữa `current` (bản ghi DB) và `next` (dữ liệu sẽ
 * ghi). Trả cặp before/after chỉ gồm các trường đó.
 */
export function diffFields(
  current: Record<string, unknown>,
  next: Record<string, unknown>,
  ignore: string[] = ['updatedBy'],
): { before: Record<string, unknown>; after: Record<string, unknown> } {
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  for (const k of Object.keys(next)) {
    if (ignore.includes(k)) continue;
    const a = normalizeValue(current[k]);
    const b = normalizeValue(next[k]);
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      before[k] = a;
      after[k] = b;
    }
  }
  return { before, after };
}

/**
 * Trường nào trong `keys` đã bị đổi kể từ lúc chụp `snapshot` (payload.before
 * của đề xuất). Khác rỗng → duyệt đề xuất sẽ ghi đè bản sửa mới hơn.
 */
export function staleFields(
  snapshot: Record<string, unknown>,
  current: Record<string, unknown>,
  keys: string[],
): string[] {
  return keys.filter(
    (k) =>
      k in snapshot &&
      JSON.stringify(normalizeValue(snapshot[k])) !==
        JSON.stringify(normalizeValue(current[k])),
  );
}
