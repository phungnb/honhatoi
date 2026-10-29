"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { get, getAccessToken } from "@/lib/api";
import { MyLineage, canManageLineage } from "@/lib/roles";

/**
 * Điều hướng chung cho mọi luồng (con cháu, quản lý, nền tảng): sidebar
 * trên máy tính; trên điện thoại là thanh trên (tên app + chuông) và thanh
 * dưới đáy như app Flutter. Mục chỉ hiện khi tài khoản có việc ở đó.
 */
export default function Sidebar() {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const [platformAdmin, setPlatformAdmin] = useState(false);
  const [manages, setManages] = useState(false);
  const [unread, setUnread] = useState(0);

  const loadUnread = useCallback(() => {
    if (!getAccessToken()) return;
    get<{ data?: { unreadCount?: number } }>("/notifications/unread-count")
      .then((b) => setUnread(b?.data?.unreadCount ?? 0))
      .catch(() => setUnread(0));
  }, []);

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
    loadUnread();
  }, [pathname, loadUnread]);

  useEffect(() => {
    window.addEventListener("hnt:notifications", loadUnread);
    return () => window.removeEventListener("hnt:notifications", loadUnread);
  }, [loadUnread]);

  type Item = { href: string; label: string; short: string; mobile: boolean };
  const items: Item[] = loggedIn
    ? [
        { href: "/app", label: "Trang chủ", short: "Trang chủ", mobile: true },
        { href: "/app/gia-pha", label: "Gia phả", short: "Gia phả", mobile: true },
        {
          href: "/app/thong-bao",
          label: unread > 0 ? `Thông báo (${unread})` : "Thông báo",
          short: "Thông báo",
          mobile: false,
        },
        ...(manages || pathname.startsWith("/quan-ly")
          ? [{ href: "/quan-ly", label: "Quản lý dòng họ", short: "Quản lý", mobile: true }]
          : []),
        ...(platformAdmin
          ? [{ href: "/super-admin", label: "Quản trị nền tảng", short: "Nền tảng", mobile: false }]
          : []),
        { href: "/tai-khoan", label: "Cá nhân", short: "Cá nhân", mobile: true },
      ]
    : [
        { href: "/app", label: "Giới thiệu", short: "Giới thiệu", mobile: true },
        { href: "/mau", label: "Dòng họ mẫu", short: "Họ mẫu", mobile: true },
        { href: "/dang-nhap", label: "Đăng nhập", short: "Đăng nhập", mobile: true },
      ];
  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <header className="topbar">
        <Link href="/app" className="brand" style={{ padding: 0 }}>
          <div className="brand-mark" style={{ width: 32, height: 32, fontSize: 16 }}>
            H
          </div>
          <div className="brand-name" style={{ fontSize: 15 }}>
            HỌ NHÀ TÔI
          </div>
        </Link>
        {loggedIn && (
          <Link href="/app/thong-bao" className="bell" aria-label="Thông báo">
            Thông báo
            {unread > 0 && <span className="bell-count">{unread > 99 ? "99+" : unread}</span>}
          </Link>
        )}
      </header>

      <aside className="sidebar">
        <Link href="/app" className="brand">
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
          {loggedIn && (
            <Link href="/mau" className={`nav-link${isActive("/mau") ? " active" : ""}`}>
              <span className="nav-dot" />
              Dòng họ mẫu
            </Link>
          )}
        </nav>

        <div className="sidebar-foot">
          Một tài khoản cho mọi vai trò: Thành viên, Người giữ gia phả, Ban
          quản trị, Trưởng tộc.
        </div>
      </aside>

      <nav className="bottom-nav" aria-label="Điều hướng">
        {items
          .filter((i) => i.mobile)
          .map((item) => (
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
