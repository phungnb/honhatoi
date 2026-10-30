"use client";

/**
 * Trang chủ của con cháu, bố cục theo bản mẫu (prototype/index.html):
 * thẻ dòng họ + 2 ô số liệu, "Hôm nay trong dòng họ" (giỗ, sinh nhật,
 * sự kiện trong 60 ngày tới, gần nhất trước), thông báo mới, bảng tin.
 * Chưa thuộc họ nào thì hiện màn Bắt đầu (tạo họ / nhập mã mời, kể cả mã
 * từ link /app?ma=XXXX).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { get } from "@/lib/api";
import { useLineages } from "@/lib/lineage";
import { canManageLineage, isLineageAdmin, roleLabel } from "@/lib/roles";
import BatDau from "@/components/BatDau";
import GioiThieu from "@/components/GioiThieu";

interface EventItem {
  id: string;
  title: string;
  eventType?: string;
  startAt: string;
  location?: string | null;
  lunarDate?: string | null;
}

interface Anniversary {
  personId: string;
  fullName: string;
  deathLunar: string;
  nextSolar: string;
  daysUntil: number;
}

interface TreePerson {
  id: string;
  fullName: string;
  generation?: number | null;
  dateOfBirth?: string | null;
  birthYearOnly?: boolean;
  dateOfDeath?: string | null;
  branch?: string | null;
}

interface PostItem {
  id: string;
  title: string | null;
  content: string;
  category: string | null;
  isPinned: boolean;
  createdAt: string;
  author: { name: string };
  reactions: Record<string, number>;
  commentCount: number;
}

/** Một dòng trong "Hôm nay trong dòng họ". */
interface Upcoming {
  key: string;
  date: Date;
  title: string;
  sub: string;
  tag: string;
  cls: string;
  href: string;
}

const DAY = 86400000;
const WINDOW_DAYS = 60;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function whenLabel(days: number): string {
  if (days <= 0) return "Hôm nay";
  if (days === 1) return "Ngày mai";
  return `Còn ${days} ngày`;
}

const EVENT_TAG: Record<string, [string, string]> = {
  family_meeting: ["Họp họ", "green"],
  ancestral_ceremony: ["Lễ tổ", "warm"],
  death_anniversary: ["Giỗ", "warm"],
  birthday: ["Sinh nhật", "blue"],
  gathering: ["Gặp mặt", "green"],
};

const CATEGORY: Record<string, [string, string]> = {
  thong_bao: ["Thông báo", "green"],
  hoat_dong: ["Hoạt động", ""],
  tu_lieu: ["Tư liệu", "blue"],
  ky_niem: ["Kỷ niệm", ""],
  tim_nguoi_than: ["Tìm người thân", "warm"],
};

function ago(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "vừa xong";
  if (min < 60) return `${min} phút trước`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

/** Gộp giỗ, sinh nhật người còn sống, sự kiện trong WINDOW_DAYS ngày tới. */
function buildUpcoming(anns: Anniversary[], persons: TreePerson[], events: EventItem[]): Upcoming[] {
  const today = startOfDay(new Date());
  const out: Upcoming[] = [];
  for (const a of anns) {
    if (a.daysUntil > WINDOW_DAYS) continue;
    const [y, m, d] = a.nextSolar.split("-").map(Number);
    out.push({
      key: `gio-${a.personId}`,
      date: new Date(y, m - 1, d),
      title: `Giỗ ${a.fullName}`,
      sub: `${whenLabel(a.daysUntil)} · ${a.deathLunar} âm lịch`,
      tag: "Giỗ",
      cls: "warm",
      href: "/app/gia-pha",
    });
  }
  for (const p of persons) {
    if (!p.dateOfBirth || p.birthYearOnly || p.dateOfDeath) continue;
    const [by, bm, bd] = p.dateOfBirth.slice(0, 10).split("-").map(Number);
    let next = new Date(today.getFullYear(), bm - 1, bd);
    if (next < today) next = new Date(today.getFullYear() + 1, bm - 1, bd);
    const days = Math.round((next.getTime() - today.getTime()) / DAY);
    if (days > WINDOW_DAYS) continue;
    out.push({
      key: `sn-${p.id}`,
      date: next,
      title: `Sinh nhật ${p.fullName}`,
      sub: `${whenLabel(days)} · tròn ${next.getFullYear() - by} tuổi${p.branch ? ` · ${p.branch}` : ""}`,
      tag: "Sinh nhật",
      cls: "blue",
      href: "/app/gia-pha",
    });
  }
  for (const e of events) {
    const at = new Date(e.startAt);
    const days = Math.round((startOfDay(at).getTime() - today.getTime()) / DAY);
    if (days < 0 || days > WINDOW_DAYS) continue;
    const [tag, cls] = EVENT_TAG[(e.eventType ?? "").toLowerCase()] ?? ["Sự kiện", "green"];
    const time = at.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    out.push({
      key: `ev-${e.id}`,
      date: at,
      title: e.title,
      sub: [whenLabel(days), time, e.location].filter(Boolean).join(" · "),
      tag,
      cls,
      href: "/app/su-kien",
    });
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 5);
}

interface NotificationItem {
  id: string;
  title: string;
  body?: string | null;
  createdAt: string;
}


export default function TrangChu() {
  const { lineages, current, select, loading, error, reload } = useLineages();
  const [inviteCode, setInviteCode] = useState("");
  const [name, setName] = useState("");
  const [stats, setStats] = useState<{ members: number; generations: number } | null>(null);
  const [hometown, setHometown] = useState<string>("");
  const [upcoming, setUpcoming] = useState<Upcoming[] | null>(null);
  const [posts, setPosts] = useState<PostItem[] | null>(null);
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
    let alive = true;
    setStats(null);
    setUpcoming(null);
    setPosts(null);
    const id = current.id;
    const safe = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback);
    void Promise.all([
      safe(
        get<{ data?: { lineage?: { memberCount?: number; hometownProvince?: string | null; hometown?: string | null } } }>(
          `/lineages/${id}`,
        ),
        null,
      ),
      safe(get<{ data?: { persons?: TreePerson[] } }>(`/genealogy/lineages/${id}/tree?generations=8`), null),
      safe(
        get<{ data?: { anniversaries?: Anniversary[] } }>(
          `/genealogy/lineages/${id}/anniversaries?limit=10&days=${WINDOW_DAYS}`,
        ),
        null,
      ),
      safe(get<{ data?: { events?: EventItem[] } }>(`/lineages/${id}/events?limit=10`), null),
      safe(get<{ data?: { posts?: PostItem[] } }>(`/lineages/${id}/posts?limit=3`), null),
    ]).then(([lin, tree, anns, evs, ps]) => {
      if (!alive) return;
      const persons = tree?.data?.persons ?? [];
      const l = lin?.data?.lineage;
      setHometown(l?.hometownProvince ?? l?.hometown ?? "");
      setStats({
        members: l?.memberCount ?? 0,
        generations: Math.max(0, ...persons.map((p) => p.generation ?? 0)),
      });
      setUpcoming(buildUpcoming(anns?.data?.anniversaries ?? [], persons, evs?.data?.events ?? []));
      setPosts(ps?.data?.posts ?? []);
    });
    return () => {
      alive = false;
    };
  }, [current]);

  const onJoined = () => {
    setInviteCode("");
    window.history.replaceState(null, "", "/app");
    void reload();
  };

  if (error === "unauthorized") return <GioiThieu inviteCode={inviteCode} />;

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
      <div className="page-head gon">
        <h1 className="page-title">{name ? `Chào ${name.split(" ").pop()}` : "Trang chủ"}</h1>
      </div>

      {inviteCode && <BatDau key={inviteCode} initialCode={inviteCode} onJoined={onJoined} />}

      {current && (
        <div className="card hero-card">
          <div className="hero-head">
            <div className="hero-mark" aria-hidden="true">
              {current.name.replace(/^(họ|dòng họ)\s+/i, "").trim()[0]?.toUpperCase() ?? "H"}
            </div>
            <div className="grow">
              {lineages.length > 1 ? (
                <select
                  className="hero-select"
                  aria-label="Chọn dòng họ"
                  value={current.id}
                  onChange={(e) => select(e.target.value)}
                >
                  {lineages.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="hero-name">{current.name}</div>
              )}
              <div className="sub">
                {hometown ? `Quê quán ${hometown} · ` : ""}
                {roleLabel(current.myRole, current.isOwner)}
              </div>
            </div>
          </div>
          <div className="grid2">
            <div className="stat2">
              <div className="n">{stats?.members ?? "…"}</div>
              <div className="l">Thành viên</div>
            </div>
            <div className="stat2">
              <div className="n">{stats?.generations ?? "…"}</div>
              <div className="l">Thế hệ</div>
            </div>
          </div>
        </div>
      )}

      <div className="chips section-gap" style={{ flexWrap: "wrap" }}>
        <Link className="chip" href="/app/gia-pha#vai-ve">
          Tra vai vế
        </Link>
        {manages && current && (
          <Link className="chip" href={`/quan-ly/${current.id}`}>
            Quản lý dòng họ
          </Link>
        )}
        {admin && current && (
          <Link className="chip" href={`/quan-ly/${current.id}?tab=invites`}>
            Mời người thân
          </Link>
        )}
      </div>

      <h2 className="sec-title">Hôm nay trong dòng họ</h2>
      {upcoming === null ? (
        <p className="muted-text">Đang tải…</p>
      ) : upcoming.length === 0 ? (
        <div className="card">
          <p className="muted-text">
            Chưa có giỗ, sinh nhật hay sự kiện nào trong {WINDOW_DAYS} ngày tới.{" "}
            <Link href="/app/su-kien">Tạo sự kiện</Link>
          </p>
        </div>
      ) : (
        upcoming.map((u, i) => (
          <Link key={u.key} href={u.href} className={`card row ev-row${i === 0 && u.cls === "warm" ? " hot" : ""}`} style={{ marginBottom: 10, padding: 12 }}>
            <div className="ev-date">
              <span className="d">{u.date.getDate()}</span>
              <span className="m">Th{u.date.getMonth() + 1}</span>
            </div>
            <span className="grow">
              <span className="t1">{u.title}</span>
              <span className="t2">{u.sub}</span>
            </span>
            <span className={`pill ${u.cls}`}>{u.tag}</span>
          </Link>
        ))
      )}

      {unread.length > 0 && (
        <>
          <h2 className="sec-title">Thông báo mới</h2>
          <div className="card rows-card">
            {unread.map((n) => (
              <Link key={n.id} href="/app/thong-bao" className="row unread">
                <span className="grow">
                  <span className="t1">{n.title}</span>
                  {n.body && <span className="t2">{n.body}</span>}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="btn-row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 className="sec-title">Bảng tin dòng họ</h2>
        <Link href="/app/dong-ho" className="sub">
          Xem tất cả
        </Link>
      </div>
      {posts === null ? (
        <p className="muted-text">Đang tải…</p>
      ) : posts.length === 0 ? (
        <div className="card">
          <p className="muted-text">
            Chưa có bài nào. <Link href="/app/dong-ho">Viết bài đầu tiên</Link>
          </p>
        </div>
      ) : (
        posts.map((p) => {
          const [tag, cls] = (p.category && CATEGORY[p.category]) || ["", ""];
          const likes = Object.values(p.reactions ?? {}).reduce((a, b) => a + b, 0);
          return (
            <Link key={p.id} href="/app/dong-ho" className="card feed-card">
              <div className="feed-head">
                <span className="av">{p.author.name.trim().split(/\s+/).pop()?.[0] ?? "?"}</span>
                <span className="grow">
                  <strong style={{ display: "block" }}>{p.author.name}</strong>
                  <span className="sub">{ago(p.createdAt)}</span>
                </span>
                {p.isPinned ? <span className="pill green">Đã ghim</span> : tag && <span className={`pill ${cls}`}>{tag}</span>}
              </div>
              {p.title && <strong style={{ display: "block", marginBottom: 4 }}>{p.title}</strong>}
              <p className="feed-text">{p.content}</p>
              <div className="feed-stats">
                {likes > 0 ? `${likes} cảm xúc · ` : ""}
                {p.commentCount} bình luận
              </div>
            </Link>
          );
        })
      )}
    </>
  );
}
