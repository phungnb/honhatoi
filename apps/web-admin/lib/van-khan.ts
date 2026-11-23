/**
 * Bộ 144 bài văn khấn (5 nhóm), trích nguyên văn từ phongthuyso.online/van-khan.
 * Dấu "…" trong bài là chỗ người khấn tự điền, giữ nguyên, không tự điền thay.
 * Chỉ dùng ở server component: file JSON ~270 KB không gửi xuống trình duyệt.
 */
import duLieu from "@/data/van-khan.json";

export interface NhomKhan {
  id: number;
  name: string;
}

export interface BaiKhan {
  slug: string;
  title: string;
  group: number;
  source: string | null;
  /** Đoạn văn; có thể có "- " (danh sách), "#### " (tiêu đề nhỏ), **đậm**, *nghiêng*. */
  paras: string[];
  notes: string[];
}

export const NHOM: NhomKhan[] = duLieu.groups;
export const BAI: BaiKhan[] = duLieu.items;

export function timBai(slug: string): BaiKhan | undefined {
  return BAI.find((b) => b.slug === slug);
}

/** Bài khấn gia tiên dùng cho ngày giỗ thường: bản ngắn, dễ đọc cho người lớn tuổi. */
export const BAI_GIO_THUONG = "gio-thuong-ban-ngan-dung-cho-gio-ong-ba-gio-cu";

/**
 * Thứ tự khấn quanh một ngày giỗ: hôm trước khấn Tiên thường, chính ngày khấn
 * Thần linh Thổ công trước rồi mới khấn Gia tiên.
 */
export const TRINH_TU_GIO: { slug: string; khi: string }[] = [
  { slug: "tien-thuong-khan-tho-than-tao-quan-long-mach-ngay-truoc-gio", khi: "Hôm trước, khấn Thổ thần" },
  { slug: "tien-thuong-khan-gia-tien-ngay-truoc-gio", khi: "Hôm trước, khấn Gia tiên" },
  { slug: "than-linh-tho-cong-ngay-gio", khi: "Chính ngày, khấn Thần linh trước" },
  { slug: BAI_GIO_THUONG, khi: "Chính ngày, khấn Gia tiên (giỗ thường)" },
  { slug: "gio-dau-tieu-tuong-gio-bo-gio-me", khi: "Thay bài trên nếu là giỗ đầu" },
  { slug: "gio-het-dai-tuong", khi: "Thay bài trên nếu là giỗ hết" },
];

/** Văn bản thuần để sao chép: bỏ dấu markdown, giữ xuống dòng giữa các đoạn. */
export function vanBanThuan(b: BaiKhan): string {
  const sach = b.paras.map((p) =>
    p
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1"),
  );
  return `${b.title}\n\n${sach.join("\n\n")}`;
}

/** Tên ngắn để liệt kê: bỏ chữ "Văn khấn" đầu, viết hoa chữ đầu. */
export function tenNgan(title: string): string {
  const t = title.replace(/^Văn khấn\s+/, "");
  return t.charAt(0).toUpperCase() + t.slice(1);
}
