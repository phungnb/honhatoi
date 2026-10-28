"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { get, getAccessToken } from "@/lib/api";

export default function Sidebar() {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const [platformAdmin, setPlatformAdmin] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) return;
    setLoggedIn(true);
    get<{ data?: { user?: { isPlatformAdmin?: boolean } } }>("/auth/me")
      .then((b) => setPlatformAdmin(b?.data?.user?.isPlatformAdmin === true))
      .catch(() => setLoggedIn(false));
  }, [pathname]);

  // Menu gọn: 1 cổng quản lý + không gian con cháu; mục nền tảng chỉ hiện
  // với tài khoản quản trị nền tảng.
  const NAV_ITEMS = [
    { href: "/quan-ly", label: "Quản lý dòng họ" },
    { href: "/app", label: "Không gian con cháu" },
    ...(platformAdmin ? [{ href: "/super-admin", label: "Quản trị nền tảng" }] : []),
    ...(loggedIn ? [] : [{ href: "/dang-nhap", label: "Đăng nhập" }]),
  ];

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
          const active = pathname.startsWith(item.href);
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
        Phiên bản 0.4.0 — 3 vai trò: Thành viên, Người giữ gia phả, Ban
        quản trị (Trưởng tộc là người sở hữu họ).
      </div>
    </aside>
  );
}
