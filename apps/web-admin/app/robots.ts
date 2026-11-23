import type { MetadataRoute } from "next";

const GOC = process.env.NEXT_PUBLIC_SITE_URL ?? "https://honhatoi.vercel.app";

/** Cho máy tìm kiếm đọc trang công khai; chặn trang cần đăng nhập và quản trị. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/mau", "/dieu-khoan", "/quyen-rieng-tu"], disallow: ["/quan-ly", "/super-admin", "/tai-khoan"] },
    sitemap: `${GOC}/sitemap.xml`,
  };
}
