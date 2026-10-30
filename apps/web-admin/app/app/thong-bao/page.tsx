"use client";

/** Thông báo của tài khoản: duyệt đề xuất, người xin vào họ, sự kiện… */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { get, post } from "@/lib/api";
import { apiMessage } from "@/lib/errors";

interface Item {
  id: string;
  title: string;
  body?: string | null;
  isRead: boolean;
  createdAt: string;
  type?: string;
  data?: { lineageId?: string } | null;
}

/** Trang cần mở khi bấm vào thông báo, theo loại. */
function linkOf(n: Item): string | null {
  const t = n.type ?? "";
  if (t === "report_new" && n.data?.lineageId) return `/quan-ly/${n.data.lineageId}?tab=reports`;
  if (t.startsWith("post_")) return "/app/dong-ho";
  if (t.startsWith("event_")) return "/app/su-kien";
  if (t.startsWith("genealogy_")) return "/app/gia-pha";
  return null;
}

function ago(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "vừa xong";
  if (min < 60) return `${min} phút trước`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} giờ trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

export default function ThongBaoPage() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const b = await get<{ data?: { notifications?: Item[] } }>("/notifications?limit=50");
      setItems(b?.data?.notifications ?? []);
      setError(null);
    } catch (e) {
      const m = apiMessage(e);
      setError(e instanceof Error && e.message.includes("API 401") ? "unauthorized" : m);
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function read(n: Item) {
    const href = linkOf(n);
    if (href) router.push(href);
    if (n.isRead) return;
    setItems((xs) => xs?.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)) ?? null);
    await post(`/notifications/${n.id}/read`, {}).catch(() => undefined);
    window.dispatchEvent(new Event("hnt:notifications"));
  }

  async function readAll() {
    await post("/notifications/read-all", {}).catch(() => undefined);
    window.dispatchEvent(new Event("hnt:notifications"));
    await load();
  }

  if (error === "unauthorized")
    return (
      <Link className="btn primary" href="/dang-nhap">
        Đăng nhập để xem thông báo
      </Link>
    );

  const unread = items?.filter((n) => !n.isRead).length ?? 0;

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Thông báo</h1>
        <p className="page-desc">
          {unread > 0 ? `${unread} thông báo chưa đọc` : "Không có thông báo chưa đọc"}
        </p>
      </div>
      {unread > 0 && (
        <div className="btn-row section-gap">
          <button className="btn" onClick={() => void readAll()}>
            Đánh dấu đã đọc hết
          </button>
        </div>
      )}
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      {items === null ? (
        <p className="muted-text">Đang tải…</p>
      ) : items.length === 0 ? (
        <p className="muted-text">Chưa có thông báo nào.</p>
      ) : (
        <div className="list section-gap">
          {items.map((n) => (
            <button
              key={n.id}
              className={`list-item${n.isRead ? "" : " unread"}`}
              onClick={() => void read(n)}
            >
              <span className="grow">
                <strong style={{ opacity: n.isRead ? 0.75 : 1 }}>{n.title}</strong>
                {n.body && (
                  <span className="sub" style={{ display: "block" }}>
                    {n.body}
                  </span>
                )}
                <span className="sub" style={{ display: "block" }}>
                  {ago(n.createdAt)}
                </span>
              </span>
              {!n.isRead && <span className="badge brand">Mới</span>}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
