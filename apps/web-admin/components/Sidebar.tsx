"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Tổng quan" },
  { href: "/duyet-xac-minh", label: "Duyệt xác minh gia phả" },
  { href: "/dong-ho", label: "Dòng họ" },
  { href: "/thanh-vien", label: "Thành viên" },
  { href: "/dang-nhap", label: "Đăng nhập" },
  { href: "/nhat-ky", label: "Nhật ký kiểm toán" },
  { href: "/cai-dat", label: "Cài đặt" },
  { href: "/app", label: "Không gian con cháu" },
  { href: "/super-admin", label: "Quản trị nền tảng" },
];

export default function Sidebar() {
  const pathname = usePathname();

  // Hai luồng khác (con cháu, nền tảng) có không gian riêng, không dùng
  // sidebar của cổng Trưởng tộc — nhưng vẫn cùng 1 domain, chung 1 lần
  // đăng nhập (token dùng chung qua lib/api.ts).
  if (
    pathname === "/app" ||
    pathname.startsWith("/app/") ||
    pathname === "/super-admin" ||
    pathname.startsWith("/super-admin/")
  ) {
    return null;
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">H</div>
        <div>
          <div className="brand-name">HỌ NHÀ TÔI</div>
          <div className="brand-sub">Bảng quản trị</div>
        </div>
      </div>

      <nav>
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link${active ? " active" : ""}`}
            >
              <span className="nav-dot" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        Phiên bản 0.3.0 — cấu trúc 1 domain: /app (con cháu),
        /admin/[họ] (Trưởng tộc), /super-admin (nền tảng), chung 1 lần
        đăng nhập.
      </div>
    </aside>
  );
}
