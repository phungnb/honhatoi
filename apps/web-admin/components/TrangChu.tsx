"use client";

/**
 * Trang chủ của con cháu: dòng họ đang xem, số người/đời, việc nhanh,
 * giỗ sắp tới, sự kiện sắp tới, thông báo mới. Chưa thuộc họ nào thì hiện
 * màn Bắt đầu (tạo họ / nhập mã mời, kể cả mã từ link /app?ma=XXXX).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { get } from "@/lib/api";
import { useLineages } from "@/lib/lineage";
import { canManageLineage, isLineageAdmin, roleLabel } from "@/lib/roles";
import BatDau from "@/components/BatDau";
import GioSapToi from "@/components/GioSapToi";

interface EventItem {
  id: string;
  title: string;
  startAt: string;
  location?: string | null;
  lunarDate?: string | null;
}

interface NotificationItem {
  id: string;
  title: string;
  body?: string | null;
  createdAt: string;
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TrangChu() {
  const { lineages, current, select, loading, error, reload } = useLineages();
  const [inviteCode, setInviteCode] = useState("");
  const [name, setName] = useState("");
  const [stats, setStats] = useState<{ persons: number; generations: number } | null>(null);
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [unread, setUnread] = useState<NotificationItem[]>([]);

  // Mã mời từ link /app?ma=XXXX (đọc trực tiếp để khỏi cần Suspense).
  useEffect(() => {
    setInviteCode(new URLSearchParams(window.location.search).get("ma") ?? "");
  }, []);

  useEffect(() => {
    if (error) return;
    get<{ data?: { user?: { displayName?: string } } }>("/auth/me")
      .then((b) => setName(b?.data?.user?.displayName ?? ""))
      .catch(() => undefined);
    get<{ data?: { notifications?: NotificationItem[] } }>("/notifications?unreadOnly=true&limit=3")
      .then((b) => setUnread(b?.data?.notifications ?? []))
      .catch(() => setUnread([]));
  }, [error]);

  useEffect(() => {
    if (!current) return;
    setStats(null);
    setEvents(null);
    get<{ data?: { persons?: { generation?: number | null }[] } }>(
      `/genealogy/lineages/${current.id}/tree?generations=6`,
    )
      .then((b) => {
        const ps = b?.data?.persons ?? [];
        setStats({
          persons: ps.length,
          generations: Math.max(0, ...ps.map((p) => p.generation ?? 0)),
        });
      })
      .catch(() => setStats({ persons: 0, generations: 0 }));
    get<{ data?: { events?: EventItem[] } }>(`/lineages/${current.id}/events?limit=3`)
      .then((b) => setEvents(b?.data?.events ?? []))
      .catch(() => setEvents([]));
  }, [current]);

  const onJoined = () => {
    setInviteCode("");
    window.history.replaceState(null, "", "/app");
    void reload();
  };

  if (error === "unauthorized")
    return (
      <>
        <div className="page-head">
          <h1 className="page-title">Họ Nhà Tôi</h1>
          <p className="page-desc">
            Gia phả số của dòng họ: cây gia phả theo đời, ngày giỗ tính theo
            âm lịch, tra vai vế xưng hô, mời con cháu qua Zalo.
          </p>
        </div>
        <div className="btn-row">
          <Link
            className="btn primary"
            href={inviteCode ? `/dang-nhap?ma=${encodeURIComponent(inviteCode)}` : "/dang-nhap"}
          >
            Đăng nhập
          </Link>
          <Link className="btn" href="/mau">
            Xem dòng họ mẫu
          </Link>
        </div>
      </>
    );

  if (loading) return <p className="muted-text">Đang tải…</p>;

  if (error)
    return <p style={{ color: "var(--danger)" }}>{error}</p>;

  if (lineages.length === 0)
    return (
      <>
        <div className="page-head">
          <h1 className="page-title">Bắt đầu</h1>
          <p className="page-desc">
            Bạn chưa thuộc dòng họ nào. Nhập mã mời người trong họ gửi cho
            bạn, hoặc tự tạo dòng họ của mình. Muốn hình dung trước?{" "}
            <Link href="/mau">Xem dòng họ mẫu</Link>.
          </p>
        </div>
        <BatDau key={inviteCode} initialCode={inviteCode} onJoined={onJoined} />
      </>
    );

  const manages = current ? canManageLineage(current) : false;
  const admin = current ? isLineageAdmin(current) : false;

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">{name ? `Chào ${name.split(" ").pop()}` : "Trang chủ"}</h1>
        {lineages.length > 1 ? (
          <select
            className="field"
            style={{ maxWidth: 420 }}
            value={current?.id ?? ""}
            onChange={(e) => select(e.target.value)}
          >
            {lineages.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        ) : (
          <p className="page-desc">{current?.name}</p>
        )}
      </div>

      {inviteCode && <BatDau key={inviteCode} initialCode={inviteCode} onJoined={onJoined} />}

      {current && (
        <div className="card section-gap">
          <p className="muted-text">
            Vai trò của bạn: <span className="badge brand">{roleLabel(current.myRole, current.isOwner)}</span>
          </p>
          <div className="stat-grid" style={{ marginTop: 12 }}>
            <div className="stat">
              <div className="stat-value">{stats?.persons ?? "…"}</div>
              <div className="stat-label">người trong cây</div>
            </div>
            <div className="stat">
              <div className="stat-value">{stats?.generations ?? "…"}</div>
              <div className="stat-label">đời</div>
            </div>
            <div className="stat">
              <div className="stat-value">{events?.length ?? "…"}</div>
              <div className="stat-label">sự kiện sắp tới</div>
            </div>
          </div>
        </div>
      )}

      <div className="action-grid section-gap">
        <Link className="action" href="/app/gia-pha">
          Xem gia phả
          <div className="sub">Cây theo đời, hồ sơ từng người</div>
        </Link>
        <Link className="action" href="/app/gia-pha#vai-ve">
          Tra vai vế
          <div className="sub">Người kia là gì của mình</div>
        </Link>
        {manages && current && (
          <Link className="action" href={`/quan-ly/${current.id}`}>
            Quản lý dòng họ
            <div className="sub">Dựng cây, duyệt đề xuất</div>
          </Link>
        )}
        <Link className="action" href="/app/tin-nhan">
          Nhắn tin
          <div className="sub">Nhóm chat cả họ, nhắn riêng</div>
        </Link>
        {admin && current && (
          <Link className="action" href={`/quan-ly/${current.id}?tab=invites`}>
            Mời người thân
            <div className="sub">Tạo link mời gửi qua Zalo</div>
          </Link>
        )}
      </div>

      {unread.length > 0 && (
        <div className="card section-gap">
          <h2 className="card-title">Thông báo mới</h2>
          <div className="list">
            {unread.map((n) => (
              <Link key={n.id} href="/app/thong-bao" className="list-item unread">
                <span className="grow">
                  <strong>{n.title}</strong>
                  {n.body && (
                    <span className="sub" style={{ display: "block" }}>
                      {n.body}
                    </span>
                  )}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {current && <GioSapToi lineageId={current.id} />}

      <div className="card section-gap">
        <div className="btn-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="card-title">Sự kiện sắp tới</h2>
          <Link href="/app/su-kien">Xem tất cả</Link>
        </div>
        {events === null ? (
          <p className="muted-text">Đang tải…</p>
        ) : events.length === 0 ? (
          <p className="muted-text">Chưa có sự kiện nào sắp diễn ra.</p>
        ) : (
          <div className="list">
            {events.map((e) => (
              <Link key={e.id} href="/app/su-kien" className="list-item">
                <span className="grow">
                  <strong>{e.title}</strong>
                  <span className="sub" style={{ display: "block" }}>
                    {fmtDateTime(e.startAt)}
                    {e.lunarDate ? ` · ${e.lunarDate} âm lịch` : ""}
                    {e.location ? ` · ${e.location}` : ""}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
