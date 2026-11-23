import type { MetadataRoute } from "next";

const GOC = process.env.NEXT_PUBLIC_SITE_URL ?? "https://honhatoi.vercel.app";

/** Các trang công khai, không cần đăng nhập. */
export default function sitemap(): MetadataRoute.Sitemap {
  return ["/app", "/mau", "/dieu-khoan", "/quyen-rieng-tu"].map((p) => ({ url: `${GOC}${p}` }));
}
