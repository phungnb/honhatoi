"use client";

/**
 * Cổng quản lý dòng họ — MỘT nơi cho mọi việc quản trị của một họ:
 * dựng cây gia phả, duyệt đề xuất, duyệt người vào họ, thành viên & vai
 * trò, mã mời.
 * Mục hiện theo vai trò (Người giữ gia phả / Ban quản trị / Trưởng tộc);
 * backend vẫn kiểm tra quyền ở mọi API.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { del, get, patch, post } from "@/lib/api";
import {
  MyLineage,
  canManageLineage,
  isLineageAdmin,
  roleLabel,
  type LineageRole,
} from "@/lib/roles";
import DuyetXacMinh from "@/components/DuyetXacMinh";
import BaoCaoViPham from "@/components/BaoCaoViPham";
import XacNhanLienKet from "@/components/XacNhanLienKet";
import NhatKy from "@/components/NhatKy";
import SuaGiaPha from "@/components/SuaGiaPha";

type Tab = "tree" | "proposals" | "requests" | "members" | "invites" | "reports" | "log";

interface JoinRequest {
  id: string;
  requestedBranch?: string | null;
  requestedRelation?: string | null;
  createdAt: string;
  user: { id: string; displayName: string };
}

interface Member {
  userId: string;
  role: LineageRole;
  isOwner: boolean;
  branch?: string | null;
  user: { id: string; displayName: string };
}

interface Invite {
  code: string;
  expiresAt?: string | null;
  maxUses?: number | null;
}

function errMsg(e: unknown): string {
  const m = e instanceof Error ? e.message : "lỗi không xác định";
  const json = m.replace(/^API \d+: /, "");
  try {
    const body = JSON.parse(json) as { message?: string | string[] };
    if (body.message)
      return Array.isArray(body.message) ? body.message.join(", ") : body.message;
  } catch {
    // không phải JSON — giữ nguyên
  }
  return m;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

const selectStyle = {
  background: "var(--surface)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "6px 10px",
};

export default function QuanLyHo({ lineageId }: { lineageId: string }) {
  const [me, setMe] = useState<MyLineage | null>(null);
  const [myUserId, setMyUserId] = useState<string>("");
  const [tab, setTab] = useState<Tab>("tree");
  // Mở thẳng một tab từ link, VD /quan-ly/:id?tab=invites (từ Trang chủ).
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "invites" || t === "members" || t === "requests" || t === "proposals" || t === "reports" || t === "log") setTab(t);
  }, []);
  const [state, setState] = useState<"loading" | "ready" | "unauthorized" | "forbidden">("loading");

  useEffect(() => {
    (async () => {
      try {
        const [lin, meBody] = await Promise.all([
          get<{ data?: { lineages?: MyLineage[] } }>("/lineages?limit=100"),
          get<{ data?: { user?: { id: string } } }>("/auth/me"),
        ]);
        const found = lin?.data?.lineages?.find((l) => l.id === lineageId);
        setMyUserId(meBody?.data?.user?.id ?? "");
        if (!found) return setState("forbidden");
        setMe(found);
        setState("ready");
      } catch (e) {
        const raw = e instanceof Error ? e.message : "";
        setState(raw.includes("API 401") ? "unauthorized" : "forbidden");
      }
    })();
  }, [lineageId]);

  if (state === "loading") return <p className="muted-text">Đang tải…</p>;
  if (state === "unauthorized")
    return (
      <>
        <p className="muted-text">Bạn chưa đăng nhập.</p>
        <Link className="btn primary section-gap" href="/dang-nhap">
          Đăng nhập
        </Link>
      </>
    );
  if (state === "forbidden" || !me)
    return (
      <p className="muted-text">
        Bạn không phải thành viên của dòng họ này.{" "}
        <Link href="/quan-ly">Chọn dòng họ khác</Link>
      </p>
    );

  const admin = isLineageAdmin(me);
  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: "tree", label: "Dựng cây gia phả", show: true },
    { key: "proposals", label: "Duyệt đề xuất gia phả", show: true },
    { key: "requests", label: "Yêu cầu vào họ", show: admin },
    { key: "members", label: "Thành viên & vai trò", show: true },
    { key: "invites", label: "Mã mời", show: admin },
    { key: "reports", label: "Báo cáo vi phạm", show: admin },
    { key: "log", label: "Nhật ký", show: admin },
  ];

  return (
    <>
      <div className="page-head">
        <p className="muted-text">
          <Link href="/quan-ly">Dòng họ của tôi</Link> /
        </p>
        <h1 className="page-title">{me.name}</h1>
        <p className="page-desc">
          Vai trò của bạn: <span className="badge brand">{roleLabel(me.myRole, me.isOwner)}</span>
        </p>
      </div>

      <div className="btn-row section-gap" style={{ flexWrap: "wrap" }}>
        {tabs
          .filter((t) => t.show)
          .map((t) => (
            <button
              key={t.key}
              className={`btn${tab === t.key ? " primary" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
      </div>

      <div className="section-gap">
        {tab === "tree" && <SuaGiaPha lineageId={lineageId} />}
        {tab === "proposals" && (
          <>
            {canManageLineage(me) && <XacNhanLienKet lineageId={lineageId} />}
            <DuyetXacMinh lockedLineageId={lineageId} embedded />
          </>
        )}
        {tab === "requests" && admin && (
          <JoinRequests lineageId={lineageId} isOwner={me.isOwner === true} />
        )}
        {tab === "members" && (
          <Members lineageId={lineageId} me={me} myUserId={myUserId} />
        )}
        {tab === "invites" && admin && <Invites lineageId={lineageId} />}
        {tab === "reports" && admin && <BaoCaoViPham lineageId={lineageId} />}
        {tab === "log" && admin && <NhatKy lineageId={lineageId} />}
      </div>
    </>
  );
}

function JoinRequests({
  lineageId,
  isOwner,
}: {
  lineageId: string;
  isOwner: boolean;
}) {
  const [items, setItems] = useState<JoinRequest[]>([]);
  const [roles, setRoles] = useState<Record<string, LineageRole>>({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const body = await get<{ data?: { requests?: JoinRequest[] } }>(
        `/lineages/${lineageId}/join-requests`,
      );
      setItems(body?.data?.requests ?? []);
    } catch (e) {
      setMsg(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [lineageId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function review(r: JoinRequest, approve: boolean) {
    setMsg(null);
    try {
      await post(
        `/lineages/${lineageId}/join-requests/${r.id}/${approve ? "approve" : "reject"}`,
        approve ? { role: roles[r.id] ?? "MEMBER" } : {},
      );
      setMsg(
        approve
          ? `Đã duyệt ${r.user.displayName} vào họ.`
          : `Đã từ chối ${r.user.displayName}.`,
      );
      await load();
    } catch (e) {
      setMsg(`Không xử lý được: ${errMsg(e)}`);
    }
  }

  if (loading) return <p className="muted-text">Đang tải…</p>;
  return (
    <>
      {msg && <p className="muted-text">{msg}</p>}
      {items.length === 0 ? (
        <p className="muted-text">Không có yêu cầu nào đang chờ.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Người xin vào</th>
                <th>Chi / quan hệ khai báo</th>
                <th>Ngày gửi</th>
                <th>Vai trò khi duyệt</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td>{r.user.displayName}</td>
                  <td>
                    {[r.requestedBranch, r.requestedRelation]
                      .filter(Boolean)
                      .join(" — ") || "—"}
                  </td>
                  <td>{fmtDate(r.createdAt)}</td>
                  <td>
                    <select
                      style={selectStyle}
                      value={roles[r.id] ?? "MEMBER"}
                      onChange={(e) =>
                        setRoles({ ...roles, [r.id]: e.target.value as LineageRole })
                      }
                    >
                      <option value="MEMBER">Thành viên</option>
                      <option value="EDITOR">Người giữ gia phả</option>
                      {isOwner && <option value="ADMIN">Ban quản trị</option>}
                    </select>
                  </td>
                  <td>
                    <div className="btn-row">
                      <button className="btn primary" onClick={() => review(r, true)}>
                        Duyệt
                      </button>
                      <button
                        className="btn danger-outline"
                        onClick={() => review(r, false)}
                      >
                        Từ chối
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Members({
  lineageId,
  me,
  myUserId,
}: {
  lineageId: string;
  me: MyLineage;
  myUserId: string;
}) {
  const [items, setItems] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const admin = isLineageAdmin(me);
  const owner = me.isOwner === true;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const body = await get<{ data?: { members?: Member[] } }>(
        `/lineages/${lineageId}/members?limit=100`,
      );
      setItems(body?.data?.members ?? []);
    } catch (e) {
      setMsg(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [lineageId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(label: string, fn: () => Promise<unknown>) {
    setMsg(null);
    try {
      await fn();
      setMsg(label);
      await load();
    } catch (e) {
      setMsg(`Không thực hiện được: ${errMsg(e)}`);
    }
  }

  /** Ban quản trị đổi được MEMBER/EDITOR; chỉ Trưởng tộc đụng tới ADMIN. */
  function editable(m: Member): boolean {
    if (m.isOwner || m.userId === myUserId) return false;
    if (owner) return true;
    return admin && m.role !== "ADMIN";
  }

  if (loading) return <p className="muted-text">Đang tải…</p>;
  return (
    <>
      {msg && <p className="muted-text">{msg}</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Thành viên</th>
              <th>Chi</th>
              <th>Vai trò</th>
              {admin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.userId}>
                <td>
                  {m.user.displayName}
                  {m.userId === myUserId ? " (bạn)" : ""}
                </td>
                <td>{m.branch ?? "—"}</td>
                <td>
                  {editable(m) ? (
                    <select
                      style={selectStyle}
                      value={m.role}
                      onChange={(e) =>
                        run(`Đã đổi vai trò của ${m.user.displayName}.`, () =>
                          patch(`/lineages/${lineageId}/members/${m.userId}/role`, {
                            role: e.target.value,
                          }),
                        )
                      }
                    >
                      <option value="MEMBER">Thành viên</option>
                      <option value="EDITOR">Người giữ gia phả</option>
                      {owner && <option value="ADMIN">Ban quản trị</option>}
                    </select>
                  ) : (
                    <span className={`badge${m.isOwner ? " brand" : ""}`}>
                      {roleLabel(m.role, m.isOwner)}
                    </span>
                  )}
                </td>
                {admin && (
                  <td>
                    <div className="btn-row">
                      {owner && !m.isOwner && (
                        <button
                          className="btn"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Chuyển quyền Trưởng tộc cho ${m.user.displayName}? Bạn sẽ còn là Ban quản trị.`,
                              )
                            )
                              void run(
                                `Đã chuyển quyền Trưởng tộc cho ${m.user.displayName}.`,
                                async () => {
                                  await post(`/lineages/${lineageId}/transfer-ownership`, {
                                    userId: m.userId,
                                  });
                                  window.location.reload();
                                },
                              );
                          }}
                        >
                          Chuyển Trưởng tộc
                        </button>
                      )}
                      {editable(m) && (
                        <button
                          className="btn danger-outline"
                          onClick={() => {
                            if (window.confirm(`Xóa ${m.user.displayName} khỏi họ?`))
                              void run(`Đã xóa ${m.user.displayName} khỏi họ.`, () =>
                                del(`/lineages/${lineageId}/members/${m.userId}`),
                              );
                          }}
                        >
                          Xóa khỏi họ
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Invites({ lineageId }: { lineageId: string }) {
  const [days, setDays] = useState(7);
  const [maxUses, setMaxUses] = useState(20);
  const [created, setCreated] = useState<Invite | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function create() {
    setMsg(null);
    try {
      const body = await post<{ data?: { invite?: Invite } }>(
        `/lineages/${lineageId}/invites`,
        { expiresInHours: days * 24, maxUses },
      );
      setCreated(body?.data?.invite ?? null);
    } catch (e) {
      setMsg(`Không tạo được mã: ${errMsg(e)}`);
    }
  }

  return (
    <div className="card">
      <p className="muted-text">
        Gửi mã mời qua Zalo cho con cháu. Người có mã vào thẳng họ với vai trò
        Thành viên, không cần chờ duyệt.
      </p>
      <div className="btn-row section-gap" style={{ flexWrap: "wrap", alignItems: "center" }}>
        <label className="muted-text">
          Hết hạn sau{" "}
          <select style={selectStyle} value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={1}>1 ngày</option>
            <option value={7}>7 ngày</option>
            <option value={30}>30 ngày</option>
          </select>
        </label>
        <label className="muted-text">
          Tối đa{" "}
          <select style={selectStyle} value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value))}>
            <option value={1}>1 người</option>
            <option value={20}>20 người</option>
            <option value={100}>100 người</option>
          </select>
        </label>
        <button className="btn primary" onClick={create}>
          Tạo mã mời
        </button>
      </div>
      {msg && <p className="muted-text section-gap">{msg}</p>}
      {created && (
        <p className="section-gap">
          Mã mời: <strong style={{ fontSize: 20, letterSpacing: 2 }}>{created.code}</strong>{" "}
          <span className="muted-text">
            (hết hạn {fmtDate(created.expiresAt)}, tối đa {created.maxUses ?? "không giới hạn"} người)
          </span>
          <br />
          <span className="muted-text">
            Gửi link này qua Zalo, người nhận đăng nhập là vào họ:{" "}
            <code>{`${window.location.origin}/app?ma=${created.code}`}</code>{" "}
            <button
              className="btn"
              onClick={() =>
                void navigator.clipboard?.writeText(
                  `${window.location.origin}/app?ma=${created.code}`,
                )
              }
            >
              Chép link
            </button>
          </span>
        </p>
      )}
    </div>
  );
}
