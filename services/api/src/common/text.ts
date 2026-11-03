/**
 * Bỏ dấu tiếng Việt + chữ thường để tìm kiếm: "Nguyễn Văn Đạt" → "nguyen van dat".
 * Người lớn tuổi hay gõ không dấu, nên so khớp phải bỏ dấu ở cả hai phía.
 */
export function foldVietnamese(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
