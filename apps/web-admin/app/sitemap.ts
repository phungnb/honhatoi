import type { MetadataRoute } from "next";
import { BAI } from "@/lib/van-khan";

const GOC = process.env.NEXT_PUBLIC_SITE_URL ?? "https://honhatoi.vercel.app";

/** Các trang công khai, không cần đăng nhập. */
export default function sitemap(): MetadataRoute.Sitemap {
  const trang = ["/app", "/mau", "/van-khan", "/lien-he", "/dieu-khoan", "/quyen-rieng-tu"];
  return [...trang, ...BAI.map((b) => `/van-khan/${b.slug}`)].map((p) => ({ url: `${GOC}${p}` }));
}
