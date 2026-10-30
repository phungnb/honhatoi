"use client";

/** Thanh chuyển mục của tab Dòng họ (đặc tả 3.1): Bảng tin, Sự kiện, Thành viên. */

import Link from "next/link";

const TABS = [
  { href: "/app/dong-ho", key: "bang-tin", label: "Bảng tin" },
  { href: "/app/su-kien", key: "su-kien", label: "Sự kiện" },
  { href: "/app/dong-ho/thanh-vien", key: "thanh-vien", label: "Thành viên" },
] as const;

export default function DongHoTabs({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    <nav className="btn-row dong-ho-tabs" aria-label="Mục của dòng họ">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`btn${t.key === active ? " primary" : ""}`}
          aria-current={t.key === active ? "page" : undefined}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
