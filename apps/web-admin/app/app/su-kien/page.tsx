"use client";

/**
 * Sự kiện dòng họ (tab "Dòng họ" của app Flutter): giỗ tổ, họp họ, sinh
 * nhật, gặp mặt… Ai trong họ cũng tạo được; người tổ chức hoặc Ban quản
 * trị hủy được. Mỗi người báo Tham gia / Có thể / Không đi.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { get, getAccessToken, post } from "@/lib/api";
import { apiMessage } from "@/lib/errors";
import { useLineages } from "@/lib/lineage";
import DongHoTabs from "@/components/DongHoTabs";

interface EventItem {
  id: string;
  title: string;
  description?: string | null;
  eventType: string;
  startAt: string;
  endAt?: string | null;
  lunarDate?: string | null;
  location?: string | null;
  status: string;
  organizerId?: string | null;
}

type Rsvp = "attending" | "maybe" | "declined";

interface Detail {
  event: EventItem;
  rsvpCounts: Record<Rsvp | "invited", number>;
  myRsvp: { rsvpStatus: string } | null;
}

const TYPES: Record<string, string> = {
  ancestral_ceremony: "Giỗ tổ / lễ tế",
  death_anniversary: "Ngày giỗ",
  family_meeting: "Họp họ",
  gathering: "Gặp mặt",
  birthday: "Sinh nhật / mừng thọ",
  other: "Khác",
};

const RSVP_LABEL: Record<Rsvp, string> = {
  attending: "Tham gia",
  maybe: "Có thể",
  declined: "Không đi",
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function myUserId(): string {
  try {
    const t = getAccessToken() ?? "";
    return (JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as { sub?: string })
      .sub ?? "";
  } catch {
    return "";
  }
}

const EMPTY = { title: "", eventType: "family_meeting", startAt: "", location: "", lunarDate: "", description: "" };

export default function SuKienPage() {
  const { current, loading, error } = useLineages();
  const [past, setPast] = useState(false);
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!current) return;
    setEvents(null);
    try {
      const b = await get<{ data?: { events?: EventItem[] } }>(
        `/lineages/${current.id}/events?limit=50&upcomingOnly=${past ? "false" : "true"}`,
      );
      const list = b?.data?.events ?? [];
      setEvents(past ? list.filter((e) => new Date(e.startAt) < new Date()).reverse() : list);
    } catch (e) {
      setErr(apiMessage(e));
      setEvents([]);
    }
  }, [current, past]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    if (!current) return;
    if (!form.title.trim() || !form.startAt) return setErr("Nhập tên sự kiện và thời gian.");
    setBusy(true);
    setErr(null);
    try {
      await post(`/lineages/${current.id}/events`, {
        title: form.title.trim(),
        eventType: form.eventType,
        startAt: new Date(form.startAt).toISOString(),
        ...(form.location.trim() ? { location: form.location.trim() } : {}),
        ...(form.lunarDate.trim() ? { lunarDate: form.lunarDate.trim() } : {}),
        ...(form.description.trim() ? { description: form.description.trim() } : {}),
      });
      setMsg(`Đã tạo "${form.title.trim()}". Cả họ đã được báo.`);
      setForm(EMPTY);
      setCreating(false);
      setPast(false);
      await load();
    } catch (e) {
      setErr(apiMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (error === "unauthorized")
    return (
      <Link className="btn primary" href="/dang-nhap">
        Đăng nhập để xem sự kiện
      </Link>
    );

  if (!loading && !current)
    return (
      <p className="muted-text">
        Bạn chưa thuộc dòng họ nào. <Link href="/app">Tạo họ hoặc nhập mã mời</Link>.
      </p>
    );

  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Dòng họ</h1>
        <p className="page-desc">{current?.name}: giỗ tổ, họp họ, gặp mặt, mừng thọ.</p>
      </div>
      <DongHoTabs active="su-kien" />
      {msg && <p style={{ color: "var(--brand)" }}>{msg}</p>}
      {err && <p style={{ color: "var(--danger)" }}>{err}</p>}

      <div className="btn-row section-gap" style={{ flexWrap: "wrap" }}>
        <button className={`btn${!past ? " primary" : ""}`} onClick={() => setPast(false)}>
          Sắp tới
        </button>
        <button className={`btn${past ? " primary" : ""}`} onClick={() => setPast(true)}>
          Đã qua
        </button>
        <button className="btn" onClick={() => setCreating((v) => !v)}>
          {creating ? "Đóng" : "+ Tạo sự kiện"}
        </button>
      </div>

      {creating && (
        <div className="card section-gap" style={{ maxWidth: 560 }}>
          <h2 className="card-title">Sự kiện mới</h2>
          <label className="muted-text" style={{ display: "block" }}>
            Tên sự kiện
            <input className="field" value={form.title} onChange={set("title")} placeholder="VD: Giỗ tổ họ Nguyễn" />
          </label>
          <div className="btn-row" style={{ flexWrap: "wrap", marginTop: 12 }}>
            <label className="muted-text" style={{ flex: "1 1 180px" }}>
              Loại
              <select className="field" value={form.eventType} onChange={set("eventType")}>
                {Object.entries(TYPES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="muted-text" style={{ flex: "1 1 200px" }}>
              Bắt đầu
              <input className="field" type="datetime-local" value={form.startAt} onChange={set("startAt")} />
            </label>
          </div>
          <div className="btn-row" style={{ flexWrap: "wrap", marginTop: 12 }}>
            <label className="muted-text" style={{ flex: "2 1 220px" }}>
              Địa điểm
              <input className="field" value={form.location} onChange={set("location")} placeholder="VD: Nhà thờ họ" />
            </label>
            <label className="muted-text" style={{ flex: "1 1 120px" }}>
              Ngày âm (nếu có)
              <input className="field" value={form.lunarDate} onChange={set("lunarDate")} placeholder="VD: 10/3" />
            </label>
          </div>
          <label className="muted-text" style={{ display: "block", marginTop: 12 }}>
            Ghi chú
            <textarea className="field" rows={3} value={form.description} onChange={set("description")} />
          </label>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button className="btn primary" disabled={busy} onClick={() => void create()}>
              {busy ? "Đang tạo…" : "Tạo và báo cả họ"}
            </button>
          </div>
        </div>
      )}

      <div className="list section-gap">
        {events === null ? (
          <p className="muted-text">Đang tải…</p>
        ) : events.length === 0 ? (
          <p className="muted-text">{past ? "Chưa có sự kiện nào đã qua." : "Chưa có sự kiện nào sắp tới."}</p>
        ) : (
          events.map((e) => (
            <button key={e.id} className="list-item" onClick={() => setOpenId(e.id)}>
              <span className="grow">
                <strong>{e.title}</strong>
                <span className="sub" style={{ display: "block" }}>
                  {fmt(e.startAt)}
                  {e.lunarDate ? ` · ${e.lunarDate} âm lịch` : ""}
                  {e.location ? ` · ${e.location}` : ""}
                </span>
              </span>
              <span className={`badge${e.status === "cancelled" ? " danger" : ""}`}>
                {e.status === "cancelled" ? "Đã hủy" : TYPES[e.eventType.toLowerCase()] ?? "Sự kiện"}
              </span>
            </button>
          ))
        )}
      </div>

      {openId && current && (
        <ChiTiet
          lineageId={current.id}
          eventId={openId}
          canCancelAsAdmin={current.isOwner === true || current.myRole === "ADMIN"}
          onClose={(changed) => {
            setOpenId(null);
            if (changed) void load();
          }}
        />
      )}
    </>
  );
}

function ChiTiet({
  lineageId,
  eventId,
  canCancelAsAdmin,
  onClose,
}: {
  lineageId: string;
  eventId: string;
  canCancelAsAdmin: boolean;
  onClose: (changed: boolean) => void;
}) {
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [changed, setChanged] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const load = useCallback(async () => {
    try {
      const b = await get<{ data?: Detail }>(`/lineages/${lineageId}/events/${eventId}`);
      setD(b?.data ?? null);
    } catch (e) {
      setErr(apiMessage(e));
    }
  }, [lineageId, eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function rsvp(status: Rsvp) {
    setBusy(true);
    try {
      await post(`/lineages/${lineageId}/events/${eventId}/rsvp`, { status });
      await load();
    } catch (e) {
      setErr(apiMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!confirmCancel) return setConfirmCancel(true);
    setBusy(true);
    try {
      await post(`/lineages/${lineageId}/events/${eventId}/cancel`, {});
      setChanged(true);
      await load();
    } catch (e) {
      setErr(apiMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const e = d?.event;
  const mine = d?.myRsvp?.rsvpStatus;
  const isOrganizer = e?.organizerId === myUserId();
  const upcoming = e && e.status !== "cancelled" && new Date(e.startAt) > new Date();

  return (
    <div className="sheet-backdrop" onClick={() => onClose(changed)}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(ev) => ev.stopPropagation()}>
        {err && <p style={{ color: "var(--danger)" }}>{err}</p>}
        {!e && !err && <p className="muted-text">Đang tải…</p>}
        {e && d && (
          <>
            <span className={`badge${e.status === "cancelled" ? " danger" : " brand"}`}>
              {e.status === "cancelled" ? "Đã hủy" : TYPES[e.eventType.toLowerCase()] ?? "Sự kiện"}
            </span>
            <h2 style={{ fontSize: 20, marginTop: 8 }}>{e.title}</h2>
            <dl className="kv">
              <dt>Thời gian</dt>
              <dd>{fmt(e.startAt)}</dd>
              {e.lunarDate && (
                <>
                  <dt>Âm lịch</dt>
                  <dd>{e.lunarDate}</dd>
                </>
              )}
              {e.location && (
                <>
                  <dt>Địa điểm</dt>
                  <dd>{e.location}</dd>
                </>
              )}
              <dt>Đã báo</dt>
              <dd>
                {d.rsvpCounts.attending} tham gia · {d.rsvpCounts.maybe} có thể · {d.rsvpCounts.declined} không đi
              </dd>
            </dl>
            {e.description && <p style={{ marginTop: 12, whiteSpace: "pre-line" }}>{e.description}</p>}
            {upcoming && (
              <div className="btn-row" style={{ marginTop: 16, flexWrap: "wrap" }}>
                {(Object.keys(RSVP_LABEL) as Rsvp[]).map((r) => (
                  <button
                    key={r}
                    className={`btn${mine === r ? " primary" : ""}`}
                    disabled={busy}
                    onClick={() => void rsvp(r)}
                  >
                    {RSVP_LABEL[r]}
                  </button>
                ))}
              </div>
            )}
            {upcoming && (isOrganizer || canCancelAsAdmin) && (
              <div className="btn-row" style={{ marginTop: 12 }}>
                <button className="btn danger-outline" disabled={busy} onClick={() => void cancel()}>
                  {confirmCancel ? "Bấm lần nữa để hủy sự kiện" : "Hủy sự kiện"}
                </button>
              </div>
            )}
          </>
        )}
        <div className="btn-row" style={{ marginTop: 16 }}>
          <button className="btn" onClick={() => onClose(changed)}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
