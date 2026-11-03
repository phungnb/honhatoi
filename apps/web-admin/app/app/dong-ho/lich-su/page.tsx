"use client";

/**
 * Lịch sử dòng họ: giỗ chạp chung của họ/chi (giỗ tổ, giỗ họ, giỗ chi, tảo
 * mộ) theo âm lịch, các mục lịch sử (nguồn gốc, di cư, nhà thờ họ…), và mộ
 * phần các đời lấy từ hồ sơ người đã mất. Cả họ xem; Người giữ gia phả trở
 * lên thêm/sửa/xóa.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { del, get, patch, post } from "@/lib/api";
import { apiMessage } from "@/lib/errors";
import { useLineages } from "@/lib/lineage";
import DongHoTabs from "@/components/DongHoTabs";
import HoSoNguoi from "@/components/HoSoNguoi";

interface Entry {
  id: string;
  title: string;
  period?: string | null;
  content: string;
  sortOrder: number;
}

interface Ceremony {
  id: string;
  name: string;
  kind: string;
  lunarDay: number;
  lunarMonth: number;
  lunarLeap: boolean;
  lunarDisplay: string;
  branch?: string | null;
  location?: string | null;
  note?: string | null;
  nextSolar?: string | null;
  daysUntil?: number | null;
}

interface Grave {
  id: string;
  fullName: string;
  generation?: number | null;
  branch?: string | null;
  burialPlace: string;
}

interface History {
  canEdit: boolean;
  entries: Entry[];
  ceremonies: Ceremony[];
  graves: Grave[];
}

const KINDS: Record<string, string> = {
  gio_to: "Giỗ tổ",
  gio_ho: "Giỗ họ",
  gio_chi: "Giỗ chi",
  tao_mo: "Tảo mộ",
  khac: "Khác",
};

const dmy = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const EMPTY_C = { name: "", kind: "gio_ho", lunar: "", lunarLeap: false, branch: "", location: "", note: "" };
const EMPTY_E = { title: "", period: "", content: "", sortOrder: "0" };

export default function LichSuPage() {
  const { current, loading, error } = useLineages();
  const [data, setData] = useState<History | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [cForm, setCForm] = useState<typeof EMPTY_C | null>(null);
  const [cEdit, setCEdit] = useState<string | null>(null);
  const [eForm, setEForm] = useState<typeof EMPTY_E | null>(null);
  const [eEdit, setEEdit] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!current) return;
    get<{ data?: History }>(`/lineages/${current.id}/history`)
      .then((b) => setData(b?.data ?? null))
      .catch((e) => setErr(apiMessage(e)));
  }, [current]);

  useEffect(() => {
    setData(null);
    load();
  }, [load]);

  const byGen = useMemo(() => {
    const m = new Map<string, Grave[]>();
    for (const g of data?.graves ?? []) {
      const k = g.generation ? `Đời ${g.generation}` : "Chưa rõ đời";
      m.set(k, [...(m.get(k) ?? []), g]);
    }
    return Array.from(m.entries());
  }, [data]);

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg(label);
      load();
      return true;
    } catch (e) {
      setMsg(`Không lưu được: ${apiMessage(e)}`);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveCeremony() {
    if (!current || !cForm) return;
    const m = /^\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*$/.exec(cForm.lunar);
    const day = m ? Number(m[1]) : 0;
    const month = m ? Number(m[2]) : 0;
    if (!cForm.name.trim()) return setMsg("Nhập tên ngày giỗ chạp.");
    if (!(day >= 1 && day <= 30 && month >= 1 && month <= 12))
      return setMsg("Ngày âm lịch dạng ngày/tháng, VD 10/3.");
    const body = {
      name: cForm.name.trim(),
      kind: cForm.kind,
      lunarDay: day,
      lunarMonth: month,
      lunarLeap: cForm.lunarLeap,
      branch: cForm.branch,
      location: cForm.location,
      note: cForm.note,
    };
    const ok = await run(cEdit ? "Đã lưu ngày giỗ chạp." : "Đã thêm ngày giỗ chạp.", () =>
      cEdit
        ? patch(`/lineages/${current.id}/history/ceremonies/${cEdit}`, body)
        : post(`/lineages/${current.id}/history/ceremonies`, body),
    );
    if (ok) {
      setCForm(null);
      setCEdit(null);
    }
  }

  async function saveEntry() {
    if (!current || !eForm) return;
    if (!eForm.title.trim() || !eForm.content.trim()) return setMsg("Nhập tiêu đề và nội dung.");
    const body = {
      title: eForm.title.trim(),
      period: eForm.period,
      content: eForm.content,
      sortOrder: Number(eForm.sortOrder) || 0,
    };
    const ok = await run(eEdit ? "Đã lưu mục lịch sử." : "Đã thêm mục lịch sử.", () =>
      eEdit
        ? patch(`/lineages/${current.id}/history/entries/${eEdit}`, body)
        : post(`/lineages/${current.id}/history/entries`, body),
    );
    if (ok) {
      setEForm(null);
      setEEdit(null);
    }
  }

  if (error === "unauthorized")
    return (
      <Link className="btn primary" href="/dang-nhap">
        Đăng nhập để xem lịch sử dòng họ
      </Link>
    );
  if (!loading && !current)
    return (
      <p className="muted-text">
        Bạn chưa thuộc dòng họ nào. <Link href="/app">Tạo họ hoặc nhập mã mời</Link>.
      </p>
    );

  const canEdit = data?.canEdit === true;

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Dòng họ</h1>
        <p className="page-desc">{current?.name}</p>
      </div>
      <DongHoTabs active="lich-su" />
      {err && <p style={{ color: "var(--danger)" }}>{err}</p>}
      {msg && (
        <p className="muted-text" role="status">
          {msg}
        </p>
      )}
      {!data && !err && <p className="muted-text section-gap">Đang tải…</p>}

      {data && (
        <>
          {/* ---- Giỗ chạp ---- */}
          <div className="sec-head section-gap">
            <h2 className="sec-title">Giỗ chạp của họ</h2>
            {canEdit && !cForm && (
              <button
                className="chip"
                onClick={() => {
                  setCEdit(null);
                  setCForm(EMPTY_C);
                }}
              >
                + Thêm ngày giỗ chạp
              </button>
            )}
          </div>
          {cForm && (
            <div className="card lich-su-form">
              <label className="muted-text">
                Tên
                <input
                  className="field"
                  value={cForm.name}
                  maxLength={200}
                  placeholder="VD: Giỗ Tổ họ Nguyễn"
                  onChange={(e) => setCForm({ ...cForm, name: e.target.value })}
                />
              </label>
              <div className="btn-row" style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
                <label className="muted-text" style={{ flex: "1 1 140px" }}>
                  Loại
                  <select
                    className="field"
                    value={cForm.kind}
                    onChange={(e) => setCForm({ ...cForm, kind: e.target.value })}
                  >
                    {Object.entries(KINDS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="muted-text" style={{ flex: "1 1 120px" }}>
                  Ngày âm lịch
                  <input
                    className="field"
                    value={cForm.lunar}
                    inputMode="numeric"
                    maxLength={5}
                    placeholder="VD 10/3"
                    onChange={(e) => setCForm({ ...cForm, lunar: e.target.value })}
                  />
                </label>
                <label className="muted-text" style={{ display: "flex", gap: 8, alignItems: "center", paddingBottom: 10 }}>
                  <input
                    type="checkbox"
                    checked={cForm.lunarLeap}
                    onChange={(e) => setCForm({ ...cForm, lunarLeap: e.target.checked })}
                  />
                  Tháng nhuận
                </label>
              </div>
              <label className="muted-text">
                Chi/nhánh đứng ra tổ chức (trống là cả họ)
                <input
                  className="field"
                  value={cForm.branch}
                  maxLength={255}
                  placeholder="VD: Chi trưởng"
                  onChange={(e) => setCForm({ ...cForm, branch: e.target.value })}
                />
              </label>
              <label className="muted-text">
                Nơi làm giỗ
                <input
                  className="field"
                  value={cForm.location}
                  maxLength={255}
                  placeholder="VD: Nhà thờ họ, xã Thanh Ngọc"
                  onChange={(e) => setCForm({ ...cForm, location: e.target.value })}
                />
              </label>
              <label className="muted-text">
                Ghi chú
                <textarea
                  className="field"
                  value={cForm.note}
                  maxLength={2000}
                  rows={2}
                  placeholder="VD: Mỗi suất đinh góp 200.000đ; con cháu về trước 8 giờ sáng"
                  onChange={(e) => setCForm({ ...cForm, note: e.target.value })}
                />
              </label>
              <div className="btn-row">
                <button className="btn primary" disabled={busy} onClick={() => void saveCeremony()}>
                  {busy ? "Đang lưu…" : "Lưu"}
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    setCForm(null);
                    setCEdit(null);
                  }}
                >
                  Hủy
                </button>
              </div>
            </div>
          )}
          {data.ceremonies.length === 0 && !cForm && (
            <p className="muted-text">
              Chưa có ngày giỗ chạp chung.{" "}
              {canEdit ? "Thêm giỗ tổ, giỗ họ, giỗ các chi để cả họ cùng nhớ." : "Người giữ gia phả sẽ bổ sung."}
            </p>
          )}
          {data.ceremonies.map((c) => (
            <div key={c.id} className="card row ev-row">
              <span className="ev-date">
                <span className="d">{c.lunarDay}</span>
                <span className="m">
                  Th{c.lunarMonth}
                  {c.lunarLeap ? "N" : ""}
                </span>
              </span>
              <span className="grow">
                <span className="t1">{c.name}</span>
                <span className="t2">
                  {c.lunarDisplay} âm lịch
                  {c.nextSolar
                    ? ` · ${c.daysUntil === 0 ? "Hôm nay" : `còn ${c.daysUntil} ngày`} (${dmy(c.nextSolar)})`
                    : ""}
                  {c.branch ? ` · ${c.branch}` : ""}
                  {c.location ? ` · ${c.location}` : ""}
                </span>
                {c.note && <span className="t2 lich-su-note">{c.note}</span>}
              </span>
              <span className="lich-su-actions">
                <span className={`pill${c.kind === "gio_to" ? " warm" : c.kind === "tao_mo" ? " blue" : " green"}`}>
                  {KINDS[c.kind] ?? c.kind}
                </span>
                {canEdit && (
                  <>
                    <button
                      className="ghost-btn"
                      onClick={() => {
                        setCEdit(c.id);
                        setCForm({
                          name: c.name,
                          kind: c.kind,
                          lunar: `${c.lunarDay}/${c.lunarMonth}`,
                          lunarLeap: c.lunarLeap,
                          branch: c.branch ?? "",
                          location: c.location ?? "",
                          note: c.note ?? "",
                        });
                      }}
                    >
                      Sửa
                    </button>
                    <button
                      className="ghost-btn"
                      onClick={() => {
                        if (current && window.confirm(`Xóa "${c.name}"?`))
                          void run("Đã xóa.", () => del(`/lineages/${current.id}/history/ceremonies/${c.id}`));
                      }}
                    >
                      Xóa
                    </button>
                  </>
                )}
              </span>
            </div>
          ))}

          {/* ---- Lịch sử ---- */}
          <div className="sec-head section-gap">
            <h2 className="sec-title">Lịch sử dòng họ</h2>
            {canEdit && !eForm && (
              <button
                className="chip"
                onClick={() => {
                  setEEdit(null);
                  setEForm(EMPTY_E);
                }}
              >
                + Thêm mục
              </button>
            )}
          </div>
          {eForm && (
            <div className="card lich-su-form">
              <label className="muted-text">
                Tiêu đề
                <input
                  className="field"
                  value={eForm.title}
                  maxLength={200}
                  placeholder="VD: Nguồn gốc họ Nguyễn ở Thanh Ngọc"
                  onChange={(e) => setEForm({ ...eForm, title: e.target.value })}
                />
              </label>
              <div className="btn-row" style={{ flexWrap: "wrap" }}>
                <label className="muted-text" style={{ flex: "2 1 200px" }}>
                  Mốc thời gian (không bắt buộc)
                  <input
                    className="field"
                    value={eForm.period}
                    maxLength={100}
                    placeholder="VD: Thế kỷ 17, đời thứ 1"
                    onChange={(e) => setEForm({ ...eForm, period: e.target.value })}
                  />
                </label>
                <label className="muted-text" style={{ flex: "1 1 100px" }}>
                  Thứ tự
                  <input
                    className="field"
                    value={eForm.sortOrder}
                    inputMode="numeric"
                    onChange={(e) => setEForm({ ...eForm, sortOrder: e.target.value })}
                  />
                </label>
              </div>
              <label className="muted-text">
                Nội dung
                <textarea
                  className="field"
                  value={eForm.content}
                  rows={8}
                  maxLength={20000}
                  placeholder="Ghi lại nguồn gốc, các lần di cư, việc xây nhà thờ họ, người có công…"
                  onChange={(e) => setEForm({ ...eForm, content: e.target.value })}
                />
              </label>
              <div className="btn-row">
                <button className="btn primary" disabled={busy} onClick={() => void saveEntry()}>
                  {busy ? "Đang lưu…" : "Lưu"}
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    setEForm(null);
                    setEEdit(null);
                  }}
                >
                  Hủy
                </button>
              </div>
            </div>
          )}
          {data.entries.length === 0 && !eForm && (
            <p className="muted-text">
              Chưa có mục lịch sử nào.{" "}
              {canEdit ? "Bắt đầu bằng nguồn gốc dòng họ và ông tổ đời thứ nhất." : "Người giữ gia phả sẽ bổ sung."}
            </p>
          )}
          {data.entries.map((e) => (
            <article key={e.id} className="card lich-su-entry">
              <div className="feed-head">
                <span className="grow">
                  <strong>{e.title}</strong>
                  {e.period && <span className="muted-text"> · {e.period}</span>}
                </span>
                {canEdit && (
                  <span className="lich-su-actions">
                    <button
                      className="ghost-btn"
                      onClick={() => {
                        setEEdit(e.id);
                        setEForm({
                          title: e.title,
                          period: e.period ?? "",
                          content: e.content,
                          sortOrder: String(e.sortOrder),
                        });
                      }}
                    >
                      Sửa
                    </button>
                    <button
                      className="ghost-btn"
                      onClick={() => {
                        if (current && window.confirm(`Xóa mục "${e.title}"?`))
                          void run("Đã xóa.", () => del(`/lineages/${current.id}/history/entries/${e.id}`));
                      }}
                    >
                      Xóa
                    </button>
                  </span>
                )}
              </div>
              <p className="feed-text" style={{ whiteSpace: "pre-wrap" }}>
                {e.content}
              </p>
            </article>
          ))}

          {/* ---- Mộ phần ---- */}
          <h2 className="sec-title section-gap">Mộ phần các đời</h2>
          {byGen.length === 0 ? (
            <p className="muted-text">
              Chưa có thông tin mộ phần. Ghi ở ô “Phần mộ ở đâu” trong hồ sơ người đã mất (Quản lý dòng họ →
              Dựng cây gia phả).
            </p>
          ) : (
            byGen.map(([gen, list]) => (
              <div key={gen} className="card rows-card section-gap">
                <div className="muted-text mo-phan-gen">{gen}</div>
                {list.map((g) => (
                  <button key={g.id} className="row" onClick={() => setOpenId(g.id)}>
                    <span className="grow">
                      <span className="t1">{g.fullName}</span>
                      <span className="t2 lich-su-note">
                        {g.burialPlace}
                        {g.branch ? ` · ${g.branch}` : ""}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ))
          )}
        </>
      )}
      {openId && <HoSoNguoi personId={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}
