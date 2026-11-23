/**
 * Bỏ dấu tiếng Việt để so khớp tìm kiếm: "Nguyen Van An" khớp "Nguyễn Văn An".
 * Đ/đ không tách được bằng NFD nên đổi riêng.
 */
export function boDau(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
