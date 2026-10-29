"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { get, getAccessToken } from "@/lib/api";
import { MyLineage, canManageLineage } from "@/lib/roles";

/**
 * Điều hướng chung cho mọi luồng (con cháu, quản lý, nền tảng): sidebar
 * trên máy tính, thanh dưới đáy trên điện thoại. Mục chỉ hiện khi tài
 * khoản có việc ở đó (quản lý: có vai trò quản lý ở ít nhất 1 họ).
 */
export default function Sidebar() {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const [platformAdmin, setPlatformAdmin] = useState(false);
  const [manages, setManages] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      setLoggedIn(false);
      return;
    }
    setLoggedIn(true);
    get<{ data?: { user?: { isPlatformAdmin?: boolean } } }>("/auth/me")
      .then((b) => setPlatformAdmin(b?.data?.user?.isPlatformAdmin === true))
      .catch(() => setLoggedIn(false));
    get<{ data?: { lineages?: MyLineage[] } }>("/lineages?limit=100")
      .then((b) => setManages((b?.data?.lineages ?? []).some(canManageLineage)))
      .catch(() => setManages(false));
  }, [pathname]);

  const items = [
    ...(loggedIn ? [{ href: "/app", label: "Gia phả", short: "Gia phả" }] : []),
    ...(manages || pathname.startsWith("/quan-ly")
      ? [{ href: "/quan-ly", label: "Quản lý dòng họ", short: "Quản lý" }]
      : []),
    { href: "/mau", label: "Dòng họ mẫu", short: "Họ mẫu" },
    ...(platformAdmin
      ? [{ href: "/super-admin", label: "Quản trị nền tảng", short: "Nền tảng" }]
      : []),
    loggedIn
      ? { href: "/tai-khoan", label: "Tài khoản", short: "Tài khoản" }
      : { href: "/dang-nhap", label: "Đăng nhập", short: "Đăng nhập" },
  ];
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <aside className="sidebar">
        <Link href={loggedIn ? "/app" : "/mau"} className="brand">
          <div className="brand-mark">H</div>
          <div>
            <div className="brand-name">HỌ NHÀ TÔI</div>
            <div className="brand-sub">Gia phả số của dòng họ</div>
          </div>
        </Link>

        <nav>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link${isActive(item.href) ? " active" : ""}`}
            >
              <span className="nav-dot" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-foot">
          Một tài khoản cho mọi vai trò: Thành viên, Người giữ gia phả, Ban
          quản trị, Trưởng tộc.
        </div>
      </aside>

      <nav className="bottom-nav" aria-label="Điều hướng">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={isActive(item.href) ? "active" : ""}
          >
            <span className="nav-dot" />
            {item.short}
          </Link>
        ))}
      </nav>
    </>
  );
}
