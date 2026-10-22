"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Tổng quan" },
  { href: "/duyet-xac-minh", label: "Duyệt xác minh gia phả" },
  { href: "/dong-ho", label: "Dòng họ" },
  { href: "/thanh-vien", label: "Thành viên" },
  { href: "/nhat-ky", label: "Nhật ký kiểm toán" },
  { href: "/cai-dat", label: "Cài đặt" },
];

export default function Sidebar() {
  const pathname = usePathname();

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
        Phiên bản 0.1.0 — khung giao diện
        <br />
        Dữ liệu mẫu, chưa nối backend
      </div>
    </aside>
  );
}
