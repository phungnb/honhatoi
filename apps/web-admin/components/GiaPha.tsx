"use client";

/**
 * Tab Gia phả: cây xếp theo đời (thẻ, dễ bấm trên điện thoại), tìm tên,
 * bấm một người để xem hồ sơ, tra vai vế xưng hô giữa hai người.
 *
 * demo=true (trang /mau): đọc dòng họ mẫu qua /demo/*, không cần đăng
 * nhập, chỉ xem.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { del, get, put } from "@/lib/api";
import { useLineages } from "@/lib/lineage";
import { canManageLineage, roleLabel } from "@/lib/roles";
import BieuTuong from "@/components/BieuTuong";
import HoSoNguoi from "@/components/HoSoNguoi";
import GioSapToi from "@/components/GioSapToi";
import CayNhanh, { CayRelationship } from "@/components/CayNhanh";
import SoDoCay from "@/components/SoDoCay";

interface TreePerson {
  id: string;
  fullName: string;
  nickname?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  dateOfDeath?: string | null;
  generation?: number | null;
  branch?: string | null;
  roleInLineage?: string | null;
}

interface KinshipResult {
  title: string | null;
  sentence: string | null;
  note: string | null;
  myNote?: { title: string; note?: string | null } | null;
}

/** Danh xưng hay dùng để tự chọn; vùng miền và từng nhà gọi khác nhau. */
const XUNG_HO = ["Bác", "Chú", "Thím", "Cô", "Dì", "Dượng", "Cậu", "Mợ", "Ông", "Bà", "Anh", "Chị", "Em", "Cháu"];

function readMien(): "bac" | "nam" {
  try {
    return localStorage.getItem("hnt_mien") === "nam" ? "nam" : "bac";
  } catch {
    return "bac";
  }
}

/** Cách nhà mình gọi: chọn danh xưng hoặc tự điền, kèm ghi chú. Chỉ mình thấy. */
function XungHoRieng({
  lineageId,
  fromId,
  toId,
  current,
  onSaved,
}: {
  lineageId: string;
  fromId: string;
  toId: string;
  current: { title: string; note?: string | null } | null;
  onSaved: (n: { title: string; note?: string | null } | null) => void;
}) {
  const initPreset = !current || XUNG_HO.includes(current.title);
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState(current ? (initPreset ? current.title : "__khac") : "");
  const [text, setText] = useState(current && !initPreset ? current.title : "");
  const [note, setNote] = useState(current?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const title = pick === "__khac" ? text.trim() : pick;

  async function save() {
    if (!title) return setErr("Chọn hoặc điền cách gọi.");
    setBusy(true);
    setErr(null);
    try {
      const b = await put<{ data?: { myNote?: { title: string; note?: string | null } } }>(
        `/genealogy/lineages/${lineageId}/kinship-notes`,
        { fromId, toId, title, note: note.trim() || undefined },
      );
      onSaved(b?.data?.myNote ?? { title, note });
      setOpen(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không lưu được");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await del(`/genealogy/lineages/${lineageId}/kinship-notes?from=${fromId}&to=${toId}`);
      onSaved(null);
      setPick("");
      setText("");
      setNote("");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  if (!open)
    return (
      <button className="chip" style={{ marginTop: 8 }} onClick={() => setOpen(true)}>
        {current ? "Sửa cách nhà mình gọi" : "Nhà mình gọi khác? Tự chọn cách gọi"}
      </button>
    );
  return (
    <div className="xung-ho-rieng">
      <div className="btn-row" style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
        <label className="muted-text" style={{ flex: "1 1 160px" }}>
          Nhà mình gọi là
          <select className="field" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">— Chọn —</option>
            {XUNG_HO.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
            <option value="__khac">Khác (tự điền)…</option>
          </select>
        </label>
        {pick === "__khac" && (
          <label className="muted-text" style={{ flex: "1 1 160px" }}>
            Cách gọi
            <input
              className="field"
              value={text}
              maxLength={50}
              placeholder="VD: Bác Hai, Cô Út, Dượng Ba"
              onChange={(e) => setText(e.target.value)}
            />
          </label>
        )}
      </div>
      <label className="muted-text" style={{ display: "block", marginTop: 8 }}>
        Ghi chú (không bắt buộc)
        <textarea
          className="field"
          rows={2}
          maxLength={1000}
          value={note}
          placeholder="VD: Ở quê gọi theo thứ trong nhà; chồng của cô Út"
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      {err && <p style={{ color: "var(--danger)" }}>{err}</p>}
      <div className="btn-row" style={{ marginTop: 8 }}>
        <button className="btn primary" disabled={busy} onClick={() => void save()}>
          Lưu cách gọi
        </button>
        {current && (
          <button className="btn" disabled={busy} onClick={() => void remove()}>
            Bỏ, dùng gợi ý
          </button>
        )}
        <button className="btn" onClick={() => setOpen(false)}>
          Hủy
        </button>
      </div>
      <p className="muted-text" style={{ fontSize: "0.8125rem" }}>
        Chỉ bạn thấy cách gọi này.
      </p>
    </div>
  );
}

const year = (iso?: string | null) => (iso ? iso.slice(0, 4) : "");

export default function GiaPha({ demo = false }: { demo?: boolean }) {
  const member = useLineages();
  const [demoLineage, setDemoLineage] = useState<{ id: string; name: string } | null>(null);
  const lineage = demo ? demoLineage : member.current;

  const [persons, setPersons] = useState<TreePerson[]>([]);
  const [relationships, setRelationships] = useState<CayRelationship[]>([]);
  const [rootId, setRootId] = useState<string | null>(null);
  const [view, setView] = useState<"sodo" | "cay" | "doi">("sodo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [kinship, setKinship] = useState<KinshipResult | null>(null);
  const [kinshipBusy, setKinshipBusy] = useState(false);
  const [mien, setMien] = useState<"bac" | "nam">("bac");
  useEffect(() => setMien(readMien()), []);

  useEffect(() => {
    if (!demo) return;
    get<{ data?: { lineage?: { id: string; name: string } } }>("/demo")
      .then((b) => setDemoLineage(b?.data?.lineage ?? null))
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Không tải được dòng họ mẫu");
        setLoading(false);
      });
  }, [demo]);

  useEffect(() => {
    if (!lineage) {
      if (!demo && !member.loading) setLoading(false);
      return;
    }
    setLoading(true);
    setKinship(null);
    setFromId("");
    setToId("");
    get<{
      data?: { persons?: TreePerson[]; relationships?: CayRelationship[]; root?: { id: string } | null };
    }>(
      demo ? "/demo/tree?generations=6" : `/genealogy/lineages/${lineage.id}/tree?generations=6`,
    )
      .then((b) => {
        setPersons(b?.data?.persons ?? []);
        setRelationships(b?.data?.relationships ?? []);
        setRootId(b?.data?.root?.id ?? null);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "lỗi không xác định"))
      .finally(() => setLoading(false));
  }, [lineage, demo, member.loading]);

  async function lookupKinship(region: "bac" | "nam" = mien) {
    if (!fromId || !toId || !lineage) return;
    setKinshipBusy(true);
    try {
      const b = await get<{ data?: KinshipResult }>(
        demo
          ? `/demo/kinship?from=${fromId}&to=${toId}&mien=${region}`
          : `/genealogy/lineages/${lineage.id}/kinship?from=${fromId}&to=${toId}&mien=${region}`,
      );
      setKinship(b?.data ?? null);
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

  if (!demo && member.error === "unauthorized")
    return (
      <>
        <div className="page-head">
          <h1 className="page-title">Gia phả</h1>
          <p className="page-desc">Đăng nhập để xem gia phả dòng họ của bạn.</p>
        </div>
        <div className="btn-row">
          <Link className="btn primary" href="/dang-nhap">
            Đăng nhập
          </Link>
          <Link className="btn" href="/mau">
            Xem dòng họ mẫu
          </Link>
        </div>
      </>
    );

  if (!demo && !member.loading && member.lineages.length === 0)
    return (
      <>
        <div className="page-head">
          <h1 className="page-title">Gia phả</h1>
          <p className="page-desc">Bạn chưa thuộc dòng họ nào.</p>
        </div>
        <Link className="btn primary" href="/app">
          Tạo dòng họ hoặc nhập mã mời
        </Link>
      </>
    );

  const q = search.trim().toLowerCase();
  const filtered = persons.filter(
    (p) =>
      !q ||
      p.fullName.toLowerCase().includes(q) ||
      (p.nickname ?? "").toLowerCase().includes(q),
  );
  const generations = Array.from(new Set(filtered.map((p) => p.generation ?? null))).sort(
    (a, b) => (a === null ? 1 : b === null ? -1 : a - b),
  );
  const maxGen = Math.max(0, ...persons.map((p) => p.generation ?? 0));
  const byName = [...persons].sort((a, b) => a.fullName.localeCompare(b.fullName));

  return (
    <>
      <div className={`page-head${demo ? "" : " gon"}`}>
        <h1 className="page-title">{demo ? "Dòng họ mẫu" : "Gia phả"}</h1>
        <p className="page-desc">
          {lineage?.name ?? ""}
          {persons.length > 0 && ` · ${persons.length} người · ${maxGen} đời`}
        </p>
      </div>

      {demo && (
        <div className="card section-gap">
          <h2 className="card-title">Bạn đang xem dữ liệu mẫu</h2>
          <p className="muted-text">
            Đây là cái con cháu thấy khi vào họ: cây theo đời, hồ sơ từng
            người (bấm vào tên), ngày giỗ âm lịch, tra vai vế. Chủ gia phả và
            Ban quản trị còn có trang Quản lý để dựng cây, duyệt đề xuất,
            phân vai trò, mời con cháu qua Zalo.
          </p>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <Link className="btn primary" href="/app">
              Tạo dòng họ của bạn
            </Link>
          </div>
        </div>
      )}

      {!demo && member.lineages.length > 1 && (
        <label className="muted-text section-gap" style={{ display: "block", maxWidth: 420 }}>
          Dòng họ
          <select
            className="field"
            value={member.current?.id ?? ""}
            onChange={(e) => member.select(e.target.value)}
          >
            {member.lineages.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} — {roleLabel(l.myRole, l.isOwner)}
              </option>
            ))}
          </select>
        </label>
      )}

      {(error || (!demo && member.error)) && (
        <p className="section-gap" style={{ color: "var(--danger)" }}>
          {error ?? member.error}
        </p>
      )}

      <div className="chips" role="tablist" aria-label="Cách xem cây">
        <button role="tab" aria-selected={view === "sodo" && !q} className={`chip${view === "sodo" && !q ? " on" : ""}`} onClick={() => { setView("sodo"); setSearch(""); }}>
          Sơ đồ cây
        </button>
        <button role="tab" aria-selected={view === "cay" && !q} className={`chip${view === "cay" && !q ? " on" : ""}`} onClick={() => { setView("cay"); setSearch(""); }}>
          Theo nhánh
        </button>
        <button role="tab" aria-selected={view === "doi" || !!q} className={`chip${view === "doi" || q ? " on" : ""}`} onClick={() => setView("doi")}>
          Theo đời
        </button>
      </div>
      <label className="searchbar" style={{ marginBottom: 12 }}>
        <BieuTuong ten="tim" size={18} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm tên trong họ…"
          aria-label="Tìm tên trong họ"
        />
      </label>

      {loading ? (
        <p className="muted-text section-gap">Đang tải…</p>
      ) : persons.length === 0 ? (
        <p className="muted-text section-gap">
          Cây gia phả còn trống.
          {member.current && (member.current.isOwner || member.current.myRole !== "MEMBER") && (
            <>
              {" "}
              <Link href={`/quan-ly/${member.current.id}`}>Dựng cây ngay</Link>.
            </>
          )}
        </p>
      ) : view === "sodo" && !q ? (
        <div className="section-gap">
          <SoDoCay persons={persons} relationships={relationships} rootId={rootId} onOpen={setOpenId} />
        </div>
      ) : view === "cay" && !q ? (
        <div className="card section-gap">
          <CayNhanh persons={persons} relationships={relationships} rootId={rootId} onOpen={setOpenId} />
        </div>
      ) : (
        generations.map((g) => (
          <section key={g ?? "x"} className="section-gap">
            <h2 className="card-title">{g === null ? "Chưa rõ đời" : `Đời thứ ${g}`}</h2>
            <div className="list">
              {filtered
                .filter((p) => (p.generation ?? null) === g)
                .sort((a, b) => (a.dateOfBirth ?? "").localeCompare(b.dateOfBirth ?? ""))
                .map((p) => (
                  <button key={p.id} className="list-item" onClick={() => setOpenId(p.id)}>
                    <span
                      className={`avatar${p.gender === "female" ? " female" : ""}${p.dateOfDeath ? " dead" : ""}`}
                    >
                      {p.fullName.trim().split(/\s+/).pop()?.[0] ?? "?"}
                    </span>
                    <span className="grow">
                      <strong>{p.fullName}</strong>
                      <span className="sub" style={{ display: "block" }}>
                        {[
                          [year(p.dateOfBirth), year(p.dateOfDeath)].filter(Boolean).join(" – "),
                          p.roleInLineage,
                          p.branch,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </span>
                    </span>
                    {p.dateOfDeath && <span className="badge warm">Đã mất</span>}
                  </button>
                ))}
            </div>
          </section>
        ))
      )}

      {!demo && member.current && canManageLineage(member.current) && (
        <ChoXacMinh lineageId={member.current.id} />
      )}

      {demo && persons.length > 0 && <GioSapToi demo />}

      {persons.length > 1 && (
        <div className="card section-gap" id="vai-ve">
          <h2 className="card-title">Tra vai vế xưng hô</h2>
          <p className="muted-text">
            Chọn hai người để biết người kia là gì của mình, ví dụ "Chú", "Bác", "Cô". Miền Bắc và miền Nam gọi khác nhau; nhà mình gọi khác thì tự chọn hoặc tự điền.
          </p>
          <div className="btn-row section-gap" style={{ flexWrap: "wrap", alignItems: "end" }}>
            <label className="muted-text" style={{ flex: "1 1 200px" }}>
              Tôi là
              <select className="field" value={fromId} onChange={(e) => setFromId(e.target.value)}>
                <option value="">— Chọn —</option>
                {byName.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="muted-text" style={{ flex: "1 1 200px" }}>
              Người này là ai?
              <select className="field" value={toId} onChange={(e) => setToId(e.target.value)}>
                <option value="">— Chọn —</option>
                {byName.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="muted-text" style={{ flex: "0 1 150px" }}>
              Cách xưng
              <select
                className="field"
                value={mien}
                onChange={(e) => {
                  const v = e.target.value === "nam" ? "nam" : "bac";
                  setMien(v);
                  try {
                    localStorage.setItem("hnt_mien", v);
                  } catch {
                    /* không lưu được thì thôi */
                  }
                  if (kinship) void lookupKinship(v);
                }}
              >
                <option value="bac">Miền Bắc</option>
                <option value="nam">Miền Nam</option>
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
            <div style={{ marginTop: 12 }}>
              {kinship.myNote ? (
                <>
                  <p>
                    <strong style={{ color: "var(--brand)", fontSize: 20 }}>{kinship.myNote.title}</strong>
                    <span className="muted-text"> — cách nhà bạn gọi</span>
                  </p>
                  {kinship.myNote.note && <p className="muted-text">Ghi chú: {kinship.myNote.note}</p>}
                  {kinship.title && (
                    <p className="muted-text">
                      Gợi ý theo {mien === "nam" ? "miền Nam" : "miền Bắc"}: {kinship.title}
                    </p>
                  )}
                </>
              ) : kinship.title ? (
                <p>
                  <strong style={{ color: "var(--brand)", fontSize: 20 }}>{kinship.title}</strong>
                  {kinship.sentence && <span className="muted-text"> — {kinship.sentence}</span>}
                </p>
              ) : (
                <p className="muted-text">Chưa xác định được danh xưng.</p>
              )}
              {kinship.note && <p className="muted-text">{kinship.note}</p>}
              {!demo && lineage && (
                <XungHoRieng
                  key={`${fromId}-${toId}-${kinship.myNote?.title ?? ""}`}
                  lineageId={lineage.id}
                  fromId={fromId}
                  toId={toId}
                  current={kinship.myNote ?? null}
                  onSaved={(n) => setKinship((k) => (k ? { ...k, myNote: n } : k))}
                />
              )}
            </div>
          )}
        </div>
      )}

      {openId && <HoSoNguoi personId={openId} demo={demo} onClose={() => setOpenId(null)} />}
    </>
  );
}

/** Thẻ "Đề xuất đang chờ xác minh" dưới cây (người có quyền duyệt), ẩn khi không có gì chờ. */
function ChoXacMinh({ lineageId }: { lineageId: string }) {
  const [counts, setCounts] = useState<{ proposals: number; claims: number } | null>(null);

  useEffect(() => {
    let alive = true;
    void Promise.all([
      get<{ data?: { proposals?: { requestType?: string }[] } }>(`/genealogy/lineages/${lineageId}/proposals`).catch(
        () => null,
      ),
      get<{ data?: { claims?: unknown[] } }>(`/genealogy/lineages/${lineageId}/claims`).catch(() => null),
    ]).then(([p, c]) => {
      if (alive) setCounts({ proposals: p?.data?.proposals?.length ?? 0, claims: c?.data?.claims?.length ?? 0 });
    });
    return () => {
      alive = false;
    };
  }, [lineageId]);

  if (!counts || counts.proposals + counts.claims === 0) return null;
  const parts = [
    counts.proposals ? `${counts.proposals} đề xuất sửa gia phả` : "",
    counts.claims ? `${counts.claims} người nhận hồ sơ` : "",
  ].filter(Boolean);
  return (
    <div className="card pending-card">
      <div className="grow">
        <strong style={{ display: "block" }}>Đề xuất đang chờ xác minh</strong>
        <span className="sub">{parts.join(" · ")}</span>
      </div>
      <Link className="ghost-btn" href={`/quan-ly/${lineageId}?tab=proposals`}>
        Xem
      </Link>
    </div>
  );
}
