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
import { get } from "@/lib/api";
import { useLineages } from "@/lib/lineage";
import { roleLabel } from "@/lib/roles";
import HoSoNguoi from "@/components/HoSoNguoi";
import GioSapToi from "@/components/GioSapToi";
import CayNhanh, { CayRelationship } from "@/components/CayNhanh";

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
}

const year = (iso?: string | null) => (iso ? iso.slice(0, 4) : "");

export default function GiaPha({ demo = false }: { demo?: boolean }) {
  const member = useLineages();
  const [demoLineage, setDemoLineage] = useState<{ id: string; name: string } | null>(null);
  const lineage = demo ? demoLineage : member.current;

  const [persons, setPersons] = useState<TreePerson[]>([]);
  const [relationships, setRelationships] = useState<CayRelationship[]>([]);
  const [rootId, setRootId] = useState<string | null>(null);
  const [view, setView] = useState<"cay" | "doi">("cay");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [kinship, setKinship] = useState<KinshipResult | null>(null);
  const [kinshipBusy, setKinshipBusy] = useState(false);

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

  async function lookupKinship() {
    if (!fromId || !toId || !lineage) return;
    setKinshipBusy(true);
    try {
      const b = await get<{ data?: KinshipResult }>(
        demo
          ? `/demo/kinship?from=${fromId}&to=${toId}`
          : `/genealogy/lineages/${lineage.id}/kinship?from=${fromId}&to=${toId}`,
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
      <div className="page-head">
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
            người (bấm vào tên), ngày giỗ âm lịch, tra vai vế. Trưởng tộc và
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

      <div className="btn-row section-gap" style={{ flexWrap: "wrap", alignItems: "center" }}>
        <button className={`btn${view === "cay" && !q ? " primary" : ""}`} onClick={() => { setView("cay"); setSearch(""); }}>
          Sơ đồ cây
        </button>
        <button className={`btn${view === "doi" || q ? " primary" : ""}`} onClick={() => setView("doi")}>
          Theo đời
        </button>
        <input
          className="field"
          style={{ flex: "1 1 200px", minWidth: 0, maxWidth: 360, marginTop: 0 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm tên trong họ…"
        />
      </div>

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

      {demo && persons.length > 0 && <GioSapToi demo />}

      {persons.length > 1 && (
        <div className="card section-gap" id="vai-ve">
          <h2 className="card-title">Tra vai vế xưng hô</h2>
          <p className="muted-text">
            Chọn hai người để biết người kia là gì của mình, ví dụ "Chú", "Bác", "Cô".
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
              {kinship.title ? (
                <p>
                  <strong style={{ color: "var(--brand)", fontSize: 20 }}>{kinship.title}</strong>
                  {kinship.sentence && <span className="muted-text"> — {kinship.sentence}</span>}
                </p>
              ) : (
                <p className="muted-text">Chưa xác định được danh xưng.</p>
              )}
              {kinship.note && <p className="muted-text">{kinship.note}</p>}
            </div>
          )}
        </div>
      )}

      {openId && <HoSoNguoi personId={openId} demo={demo} onClose={() => setOpenId(null)} />}
    </>
  );
}
