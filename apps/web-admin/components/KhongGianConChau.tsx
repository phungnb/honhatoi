"use client";

/**
 * Không gian Con cháu (Luồng 3 theo đánh giá chuyên gia 27/10/2026):
 * /app — cùng 1 domain, cùng 1 lần đăng nhập với cổng Trưởng tộc
 * (/admin) và cổng nền tảng (/super-admin). Token lấy từ lib/api.ts
 * dùng chung, không đăng nhập lại khi chuyển luồng.
 *
 * Nối API backend thật:
 * - GET /lineages: chọn dòng họ.
 * - GET /genealogy/lineages/:id/tree: cây gia phả xếp theo đời.
 * - GET /genealogy/lineages/:id/kinship?from=&to=: xem vai vế.
 *
 * demo=true (trang /mau): cùng giao diện nhưng đọc dòng họ mẫu qua /demo/*,
 * không cần đăng nhập, chỉ xem.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { get } from "@/lib/api";
import { MyLineage, canManageLineage, roleLabel } from "@/lib/roles";
import BatDau from "@/components/BatDau";

type Lineage = MyLineage;

interface TreePerson {
  id: string;
  fullName: string;
  nickname?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  dateOfDeath?: string | null;
  burialPlace?: string | null;
  generation?: number | null;
  branch?: string | null;
}

interface KinshipResult {
  title: string | null;
  sentence: string | null;
  note: string | null;
}

interface Anniversary {
  personId: string;
  fullName: string;
  burialPlace?: string | null;
  deathLunar: string;
  nextSolar: string;
  daysUntil: number;
}

function fmtSolar(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function yearOf(iso?: string | null): string {
  if (!iso) return "";
  const m = /^(\d{4})/.exec(iso);
  return m ? m[1] : "";
}

const DEMO_API = {
  tree: () => "/demo/tree?generations=6",
  anniversaries: () => "/demo/anniversaries?limit=5&days=365",
  kinship: (_: string, from: string, to: string) =>
    `/demo/kinship?from=${from}&to=${to}`,
};
const MEMBER_API = {
  tree: (lid: string) => `/genealogy/lineages/${lid}/tree?generations=6`,
  anniversaries: (lid: string) =>
    `/genealogy/lineages/${lid}/anniversaries?limit=5&days=60`,
  kinship: (lid: string, from: string, to: string) =>
    `/genealogy/lineages/${lid}/kinship?from=${from}&to=${to}`,
};

export default function KhongGianConChau({ demo = false }: { demo?: boolean }) {
  const api = demo ? DEMO_API : MEMBER_API;
  const [lineages, setLineages] = useState<Lineage[]>([]);
  const [lineageId, setLineageId] = useState("");
  const [persons, setPersons] = useState<TreePerson[]>([]);
  const [search, setSearch] = useState("");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [kinship, setKinship] = useState<KinshipResult | null>(null);
  const [kinshipBusy, setKinshipBusy] = useState(false);
  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTree = useCallback(async (lid: string) => {
    setLoading(true);
    setError(null);
    try {
      const body = await get<{ data?: { persons?: TreePerson[] } }>(
        api.tree(lid),
      );
      setPersons(body?.data?.persons ?? []);
    } catch (e) {
      setError(
        e instanceof Error && e.message.includes("API 401")
          ? "unauthorized"
          : `Không tải được cây gia phả: ${e instanceof Error ? e.message : "lỗi không xác định"}`,
      );
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mã mời từ link /app?ma=XXXX (đọc trực tiếp để khỏi cần Suspense).
  const [inviteCode, setInviteCode] = useState("");
  useEffect(() => {
    if (!demo)
      setInviteCode(new URLSearchParams(window.location.search).get("ma") ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLineages = useCallback(async () => {
      try {
        if (demo) {
          const b = await get<{ data?: { lineage?: Lineage } }>("/demo");
          const l = b?.data?.lineage;
          setLineages(l ? [l] : []);
          if (l) setLineageId(l.id);
          else setLoading(false);
          return;
        }
        const body = await get<{ data?: { lineages?: Lineage[] } }>("/lineages");
        const list = body?.data?.lineages ?? [];
        setLineages(list);
        if (list.length > 0) setLineageId(list[0].id);
        else setLoading(false);
      } catch (e) {
        setError(
          e instanceof Error && e.message.includes("API 401")
            ? "unauthorized"
            : `Không tải được danh sách dòng họ: ${e instanceof Error ? e.message : "lỗi không xác định"}`,
        );
        setLoading(false);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadLineages();
  }, [loadLineages]);

  useEffect(() => {
    if (lineageId) void loadTree(lineageId);
  }, [lineageId, loadTree]);

  useEffect(() => {
    if (!lineageId) return;
    (async () => {
      try {
        const body = await get<{
          data?: { anniversaries?: Anniversary[] };
        }>(
          api.anniversaries(lineageId),
        );
        setAnniversaries(body?.data?.anniversaries ?? []);
      } catch {
        setAnniversaries([]);
      }
    })();
  }, [lineageId]);

  async function lookupKinship() {
    if (!fromId || !toId || !lineageId) return;
    setKinshipBusy(true);
    try {
      const body = await get<{ data?: KinshipResult }>(
        api.kinship(lineageId, fromId, toId),
      );
      setKinship(body?.data ?? null);
    } catch (e) {
      setKinship({
        title: null,
        sentence: null,
        note: `Không xem được vai vế: ${e instanceof Error ? e.message : "lỗi không xác định"}`,
      });
    } finally {
      setKinshipBusy(false);
    }
  }

  if (error === "unauthorized") {
    return (
      <>
        <div className="page-head">
          <h1 className="page-title">Gia phả của tôi</h1>
          <p className="page-desc">
            Bạn chưa đăng nhập. Đăng nhập một lần là dùng chung cho cả
            không gian con cháu, cổng Trưởng tộc và cổng nền tảng.
          </p>
        </div>
        <Link
          className="btn primary"
          href={inviteCode ? `/dang-nhap?ma=${encodeURIComponent(inviteCode)}` : "/dang-nhap"}
        >
          Đăng nhập
        </Link>{" "}
        <Link className="btn" href="/mau">
          Xem dòng họ mẫu
        </Link>
      </>
    );
  }

  const onJoined = () => {
    setInviteCode("");
    window.history.replaceState(null, "", "/app");
    void loadLineages();
  };

  // Người mới chưa thuộc họ nào: chỉ hiện bước bắt đầu, ẩn cây/giỗ/vai vế trống.
  if (!demo && !loading && !error && lineages.length === 0) {
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
  }

  const filtered = persons.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      p.fullName.toLowerCase().includes(q) ||
      (p.nickname ?? "").toLowerCase().includes(q)
    );
  });
  const generations = Array.from(
    new Set(filtered.map((p) => p.generation ?? null)),
  ).sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return a - b;
  });

  const currentLineage = lineages.find((l) => l.id === lineageId);

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">
          {demo ? "Dòng họ mẫu" : "Gia phả của tôi"}
        </h1>
        <p className="page-desc">
          {demo
            ? "Một dòng họ dựng sẵn 5 đời, 2 chi để bạn xem app hoạt động thế nào: cây gia phả theo đời, ngày giỗ tính theo âm lịch, tra vai vế xưng hô."
            : "Xem cây gia phả và tra vai vế xưng hô trong dòng họ. Cùng một tài khoản, cùng một lần đăng nhập với cổng Trưởng tộc."}
        </p>
      </div>

      {demo && (
        <div className="card section-gap">
          <h2 className="card-title">Bạn đang xem dữ liệu mẫu</h2>
          <p className="muted-text">
            Đây là cái con cháu thấy khi vào họ. Trưởng tộc và Ban quản trị
            còn có trang Quản lý: duyệt đề xuất sửa gia phả, duyệt người xin
            vào họ, phân vai trò, tạo mã mời gửi qua Zalo.
          </p>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <Link className="btn primary" href="/app">
              Tạo dòng họ của bạn
            </Link>
          </div>
        </div>
      )}

      {!loading && !error && inviteCode && (
        <BatDau key={inviteCode} initialCode={inviteCode} onJoined={onJoined} />
      )}

      {error && error !== "unauthorized" && (
        <div className="card section-gap">
          <span style={{ color: "#ff6b6b" }}>{error}</span>
        </div>
      )}

      <div className="btn-row section-gap">
        <label className="muted-text">
          Dòng họ{" "}
          <select
            value={lineageId}
            onChange={(e) => setLineageId(e.target.value)}
            style={{
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "8px 12px",
              marginLeft: 8,
            }}
          >
            {lineages.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
                {demo ? "" : ` — ${roleLabel(l.myRole, l.isOwner)}`}
              </option>
            ))}
          </select>
        </label>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm tên thành viên…"
          style={{
            background: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "8px 12px",
            flex: "1 1 200px",
            minWidth: 0,
            maxWidth: 360,
          }}
        />
      </div>

      {loading ? (
        <p className="muted-text">Đang tải…</p>
      ) : generations.length === 0 ? (
        <p className="muted-text">
          {lineages.length === 0
            ? "Bạn chưa tham gia dòng họ nào."
            : "Chưa có thành viên nào trong cây gia phả."}
        </p>
      ) : (
        generations.map((g) => (
          <div key={g ?? "unknown"} className="section-gap">
            <h2 className="card-title">
              {g === null ? "Chưa rõ đời" : `Đời thứ ${g}`}
            </h2>
            <div className="table-wrap">
              <table>
                <tbody>
                  {filtered
                    .filter((p) => (p.generation ?? null) === g)
                    .sort((a, b) => a.fullName.localeCompare(b.fullName))
                    .map((p) => (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.fullName}</strong>
                          {p.nickname ? ` (${p.nickname})` : ""}
                        </td>
                        <td style={{ color: "var(--muted)" }}>
                          {[yearOf(p.dateOfBirth), yearOf(p.dateOfDeath)]
                            .filter(Boolean)
                            .join(" – ") || "—"}
                        </td>
                        <td>
                          <span
                            className={`badge ${p.dateOfDeath ? "warm" : "brand"}`}
                          >
                            {p.dateOfDeath ? "Đã mất" : "Đang sống"}
                          </span>
                        </td>
                        <td style={{ color: "var(--muted)" }}>
                          {p.dateOfDeath && p.burialPlace
                            ? `Phần mộ: ${p.burialPlace}`
                            : p.branch ?? ""}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      <div className="card section-gap">
        <h2 className="card-title">Giỗ sắp tới</h2>
        <p className="muted-text">
          Tính theo ngày âm lịch Việt Nam — ngày giỗ năm sau tự động dời
          theo lịch âm, không cần nhớ ngày dương.
        </p>
        {anniversaries.length === 0 ? (
          <p className="muted-text">Không có giỗ nào trong {demo ? 365 : 60} ngày tới.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <tbody>
                {anniversaries.map((a) => (
                  <tr key={a.personId}>
                    <td>
                      <strong>{a.fullName}</strong>
                      <span className="muted-text">
                        {" "}
                        — giỗ ngày {a.deathLunar} âm lịch
                      </span>
                    </td>
                    <td>{fmtSolar(a.nextSolar)}</td>
                    <td>
                      <span
                        className={`badge ${a.daysUntil === 0 ? "warm" : a.daysUntil <= 3 ? "brand" : ""}`}
                      >
                        {a.daysUntil === 0
                          ? "Hôm nay"
                          : `Còn ${a.daysUntil} ngày`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card section-gap">
        <h2 className="card-title">Tra vai vế xưng hô</h2>
        <p className="muted-text">
          Chọn hai người trong cây để biết người kia là gì của mình — ví
          dụ "Chú", "Bác", "Anh họ".
        </p>
        <div className="btn-row section-gap">
          <label className="muted-text">
            Tôi là{" "}
            <select
              value={fromId}
              onChange={(e) => setFromId(e.target.value)}
              style={{
                background: "var(--surface)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "8px 12px",
                marginLeft: 8,
              }}
            >
              <option value="">— Chọn —</option>
              {persons.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                </option>
              ))}
            </select>
          </label>
          <label className="muted-text">
            Người này là ai?{" "}
            <select
              value={toId}
              onChange={(e) => setToId(e.target.value)}
              style={{
                background: "var(--surface)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "8px 12px",
                marginLeft: 8,
              }}
            >
              <option value="">— Chọn —</option>
              {persons.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                </option>
              ))}
            </select>
          </label>
          <button
            className="btn primary"
            disabled={!fromId || !toId || kinshipBusy}
            onClick={() => void lookupKinship()}
          >
            {kinshipBusy ? "Đang tra…" : "Xem vai vế"}
          </button>
        </div>
        {kinship && (
          <div>
            {kinship.title ? (
              <p>
                <strong style={{ color: "var(--brand)", fontSize: 20 }}>
                  {kinship.title}
                </strong>
                {kinship.sentence && (
                  <span className="muted-text"> — {kinship.sentence}</span>
                )}
              </p>
            ) : (
              <p className="muted-text">Chưa xác định được danh xưng.</p>
            )}
            {kinship.note && <p className="muted-text">{kinship.note}</p>}
          </div>
        )}
      </div>

      {currentLineage && canManageLineage(currentLineage) && (
        <p className="muted-text section-gap">
          Bạn là {roleLabel(currentLineage.myRole, currentLineage.isOwner)} của
          họ này:{" "}
          <Link href={`/quan-ly/${currentLineage.id}`}>vào Quản lý dòng họ</Link>{" "}
          — cùng một lần đăng nhập.
        </p>
      )}
    </>
  );
}
