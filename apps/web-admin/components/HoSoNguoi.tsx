"use client";

/**
 * Hồ sơ một người trong cây — bảng trượt từ dưới lên trên điện thoại,
 * hộp giữa màn hình trên máy tính. Số điện thoại/email chỉ hiện với người
 * có quyền sửa gia phả (backend đã ẩn sẵn).
 *
 * Nút "Sửa / đề xuất sửa": người có quyền sửa thì lưu ngay; Thành viên thì
 * API tạo đề xuất chờ Ban quản trị duyệt (PATCH /genealogy/persons/:id).
 */

import { useEffect, useState } from "react";
import { get, patch } from "@/lib/api";
import { apiMessage } from "@/lib/errors";

interface Person {
  id: string;
  fullName: string;
  nickname?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  birthYearOnly?: boolean;
  dateOfDeath?: string | null;
  burialPlace?: string | null;
  hometown?: string | null;
  currentPlace?: string | null;
  occupation?: string | null;
  generation?: number | null;
  branch?: string | null;
  roleInLineage?: string | null;
  bio?: string | null;
  phone?: string | null;
  email?: string | null;
}

function fmtDate(iso?: string | null, yearOnly?: boolean): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return yearOnly ? y : `${d}/${m}/${y}`;
}

export default function HoSoNguoi({
  personId,
  demo = false,
  onClose,
}: {
  personId: string;
  demo?: boolean;
  onClose: () => void;
}) {
  const [p, setP] = useState<Person | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [reload, setReload] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setP(null);
    setError(null);
    get<{ data?: { person?: Person } }>(
      demo ? `/demo/persons/${personId}` : `/genealogy/persons/${personId}`,
    )
      .then((b) => setP(b?.data?.person ?? null))
      .catch((e) => setError(apiMessage(e)));
  }, [personId, demo, reload]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rows: [string, string | null | undefined][] = p
    ? [
        ["Tên thường gọi", p.nickname],
        ["Giới tính", p.gender === "female" ? "Nữ" : p.gender === "male" ? "Nam" : null],
        ["Đời", p.generation ? `Đời thứ ${p.generation}` : null],
        ["Chi", p.branch],
        ["Vai trò trong họ", p.roleInLineage],
        ["Sinh", fmtDate(p.dateOfBirth, p.birthYearOnly)],
        ["Mất", fmtDate(p.dateOfDeath)],
        ["Phần mộ", p.burialPlace],
        ["Quê quán", p.hometown],
        ["Nơi ở", p.currentPlace],
        ["Nghề nghiệp", p.occupation],
        ["Điện thoại", p.phone],
        ["Email", p.email],
      ]
    : [];

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
        {!p && !error && <p className="muted-text">Đang tải…</p>}
        {p && (
          <>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div
                className={`avatar${p.gender === "female" ? " female" : ""}${p.dateOfDeath ? " dead" : ""}`}
                style={{ width: 52, height: 52, fontSize: 20 }}
              >
                {p.fullName.trim().split(/\s+/).pop()?.[0] ?? "?"}
              </div>
              <div className="grow">
                <h2 style={{ fontSize: 20 }}>{p.fullName}</h2>
                <span className={`badge ${p.dateOfDeath ? "warm" : "brand"}`}>
                  {p.dateOfDeath ? "Đã mất" : "Đang sống"}
                </span>
              </div>
            </div>
            <dl className="kv">
              {rows
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} style={{ display: "contents" }}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
            </dl>
            {p.bio && (
              <p style={{ marginTop: 12, whiteSpace: "pre-line" }}>{p.bio}</p>
            )}
            {msg && <p style={{ color: "var(--brand)", marginTop: 12 }}>{msg}</p>}
            {editing && (
              <SuaHoSo
                person={p}
                onCancel={() => setEditing(false)}
                onDone={(m) => {
                  setEditing(false);
                  setMsg(m);
                  setReload((x) => x + 1);
                }}
              />
            )}
          </>
        )}
        <div className="btn-row" style={{ marginTop: 16 }}>
          {p && !demo && !editing && (
            <button className="btn" onClick={() => { setMsg(null); setEditing(true); }}>
              Sửa / đề xuất sửa
            </button>
          )}
          <button className="btn" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

const FIELDS: { key: keyof Person; label: string; type?: "date" | "area" }[] = [
  { key: "fullName", label: "Họ tên" },
  { key: "nickname", label: "Tên thường gọi" },
  { key: "dateOfBirth", label: "Ngày sinh", type: "date" },
  { key: "dateOfDeath", label: "Ngày mất", type: "date" },
  { key: "hometown", label: "Quê quán" },
  { key: "burialPlace", label: "Phần mộ" },
  { key: "bio", label: "Tiểu sử", type: "area" },
];

function SuaHoSo({
  person,
  onCancel,
  onDone,
}: {
  person: Person;
  onCancel: () => void;
  onDone: (msg: string) => void;
}) {
  const initial = (k: keyof Person, type?: string) => {
    const v = person[k];
    if (typeof v !== "string") return "";
    return type === "date" ? v.slice(0, 10) : v;
  };
  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries(FIELDS.map((f) => [f.key, initial(f.key, f.type)])),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    // Chỉ gửi trường đã đổi; ngày gửi dạng ISO.
    const changed: Record<string, string> = {};
    for (const f of FIELDS) {
      const v = form[f.key].trim();
      if (v === initial(f.key, f.type)) continue;
      if (!v) continue;
      changed[f.key] = f.type === "date" ? new Date(v + "T00:00:00Z").toISOString() : v;
    }
    if (Object.keys(changed).length === 0) {
      setError("Bạn chưa thay đổi gì.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const b = await patch<{ data?: { change_request?: unknown } }>(
        `/genealogy/persons/${person.id}`,
        changed,
      );
      onDone(
        b?.data?.change_request
          ? "Đã gửi đề xuất. Ban quản trị dòng họ sẽ duyệt trước khi cập nhật."
          : "Đã lưu thay đổi.",
      );
    } catch (e) {
      setError(apiMessage(e));
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <h3 className="card-title">Sửa thông tin</h3>
      {FIELDS.map((f) => (
        <label key={f.key} className="muted-text" style={{ display: "block", marginTop: 8 }}>
          {f.label}
          {f.type === "area" ? (
            <textarea
              className="field"
              rows={3}
              value={form[f.key]}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
            />
          ) : (
            <input
              className="field"
              type={f.type === "date" ? "date" : "text"}
              value={form[f.key]}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
            />
          )}
        </label>
      ))}
      {error && <p style={{ color: "var(--danger)", marginTop: 8 }}>{error}</p>}
      <div className="btn-row" style={{ marginTop: 12 }}>
        <button className="btn primary" disabled={busy} onClick={() => void submit()}>
          {busy ? "Đang gửi…" : "Gửi"}
        </button>
        <button className="btn" onClick={onCancel}>
          Thôi
        </button>
      </div>
    </div>
  );
}
