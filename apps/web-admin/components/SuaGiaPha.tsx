"use client";

/**
 * Dựng cây gia phả trên web (Người giữ gia phả / Ban quản trị / Trưởng tộc):
 * thêm người kèm quan hệ với người đã có, sửa thông tin, xóa. Đời được tự
 * tính từ quan hệ (con = đời cha mẹ + 1, vợ/chồng = cùng đời). Backend
 * vẫn kiểm tra quyền; người không đủ quyền sẽ thành đề xuất chờ duyệt.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { del, get, patch, post } from "@/lib/api";
import { apiMessage } from "@/lib/errors";

interface Person {
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

type Relation = "child" | "spouse" | "parent";

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 6,
  background: "var(--surface)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "9px 12px",
};

const RELATION_LABEL: Record<Relation, string> = {
  child: "là con của",
  spouse: "là vợ/chồng của",
  parent: "là cha/mẹ của",
};

const year = (iso?: string | null) => (iso ? iso.slice(0, 4) : "");

/** Chuẩn hoá tên để so trùng: bỏ dấu, gộp khoảng trắng, chữ thường. */
const foldName = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const EMPTY = {
  fullName: "",
  gender: "male",
  birthYear: "",
  dateOfDeath: "",
  burialPlace: "",
  branch: "",
  relation: "child" as Relation,
  relatedId: "",
};

export default function SuaGiaPha({ lineageId }: { lineageId: string }) {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [dupOk, setDupOk] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const b = await get<{ data?: { persons?: Person[] } }>(
        `/genealogy/lineages/${lineageId}/tree?generations=6`,
      );
      setPersons(b?.data?.persons ?? []);
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setLoading(false);
    }
  }, [lineageId]);

  useEffect(() => {
    void load();
  }, [load]);

  const set = (k: keyof typeof EMPTY) => (v: string) => {
    if (k === "fullName" || k === "birthYear") setDupOk(false);
    setForm((f) => ({ ...f, [k]: v }));
  };

  // Cảnh báo trùng: cùng tên (không phân biệt dấu) và năm sinh lệch ≤ 2
  // (hoặc một bên chưa có năm sinh). Không chặn hẳn vì trong họ có thể
  // trùng tên thật.
  const dups = useMemo(() => {
    const name = foldName(form.fullName);
    if (name.length < 3) return [];
    const y = Number(form.birthYear.trim()) || null;
    return persons.filter((p) => {
      if (editing && p.id === editing.id) return false;
      if (foldName(p.fullName) !== name) return false;
      const py = Number(year(p.dateOfBirth)) || null;
      return !y || !py || Math.abs(py - y) <= 2;
    });
  }, [form.fullName, form.birthYear, persons, editing]);

  function personBody() {
    const y = form.birthYear.trim();
    return {
      fullName: form.fullName.trim(),
      gender: form.gender,
      ...(y ? { dateOfBirth: `${y}-01-01`, birthYearOnly: true } : {}),
      ...(form.dateOfDeath ? { dateOfDeath: form.dateOfDeath } : {}),
      ...(form.burialPlace.trim() ? { burialPlace: form.burialPlace.trim() } : {}),
      ...(form.branch.trim() ? { branch: form.branch.trim() } : {}),
    };
  }

  async function save() {
    if (!form.fullName.trim()) return setError("Nhập họ tên.");
    if (form.birthYear && !/^\d{4}$/.test(form.birthYear.trim()))
      return setError("Năm sinh gồm 4 số, VD 1958.");
    if (!editing && persons.length > 0 && !form.relatedId)
      return setError("Chọn người có quan hệ với người mới.");
    if (dups.length > 0 && !dupOk)
      return setError("Có thể trùng người đã có trong cây — kiểm tra rồi đánh dấu “Đây là người khác”.");
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      let done: string;
      if (editing) {
        await patch(`/genealogy/persons/${editing.id}`, personBody());
        done = `Đã lưu ${form.fullName.trim()}.`;
      } else {
        const related = persons.find((p) => p.id === form.relatedId);
        const g = related?.generation ?? null;
        const generation =
          !related
            ? 1
            : g === null
              ? undefined
              : form.relation === "child"
                ? g + 1
                : form.relation === "parent"
                  ? g - 1
                  : g;
        const b = await post<{
          data?: { person?: { id: string }; change_request?: unknown };
        }>(`/genealogy/lineages/${lineageId}/persons`, {
          ...personBody(),
          ...(generation !== undefined ? { generation } : {}),
          ...(!form.branch.trim() && related?.branch ? { branch: related.branch } : {}),
        });
        const newId = b?.data?.person?.id;
        if (!newId) {
          done = "Đã gửi đề xuất, chờ người giữ gia phả duyệt.";
        } else {
          if (related) {
            // Bản ghi (A, B, 'parent'): A là cha/mẹ của B.
            const rel =
              form.relation === "child"
                ? { personId: related.id, relatedPersonId: newId, relationshipType: "parent" }
                : form.relation === "parent"
                  ? { personId: newId, relatedPersonId: related.id, relationshipType: "parent" }
                  : { personId: newId, relatedPersonId: related.id, relationshipType: "spouse" };
            await post(`/genealogy/lineages/${lineageId}/relationships`, rel);
          }
          done = related
            ? `Đã thêm ${form.fullName.trim()} ${RELATION_LABEL[form.relation]} ${related.fullName}.`
            : `Đã thêm ${form.fullName.trim()} làm người đầu tiên của cây.`;
        }
      }
      setForm((f) => ({ ...EMPTY, relation: f.relation, relatedId: f.relatedId }));
      setEditing(null);
      await load();
      setMsg(done);
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function startEdit(p: Person) {
    setEditing(p);
    setMsg(null);
    setError(null);
    setForm({
      ...EMPTY,
      fullName: p.fullName,
      gender: p.gender ?? "male",
      birthYear: year(p.dateOfBirth),
      dateOfDeath: p.dateOfDeath ? p.dateOfDeath.slice(0, 10) : "",
      burialPlace: p.burialPlace ?? "",
      branch: p.branch ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(p: Person) {
    if (confirmDelete !== p.id) return setConfirmDelete(p.id);
    setBusy(true);
    setError(null);
    try {
      await del(`/genealogy/persons/${p.id}`);
      setConfirmDelete(null);
      await load();
      setMsg(`Đã xóa ${p.fullName}.`);
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const sorted = [...persons].sort(
    (a, b) =>
      (a.generation ?? 99) - (b.generation ?? 99) ||
      a.fullName.localeCompare(b.fullName),
  );

  return (
    <>
      <div className="card" style={{ maxWidth: 640 }}>
        <h2 className="card-title">
          {editing ? `Sửa: ${editing.fullName}` : "Thêm người vào cây"}
        </h2>
        {!editing && persons.length === 0 && !loading && (
          <p className="muted-text">
            Cây đang trống. Người đầu tiên thường là Thủy tổ hoặc người cao
            đời nhất mà họ còn nhớ; những người sau gắn vào người này.
          </p>
        )}
        {msg && <p style={{ color: "var(--brand)" }}>{msg}</p>}
        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

        {!editing && persons.length > 0 && (
          <div className="btn-row" style={{ flexWrap: "wrap", alignItems: "end" }}>
            <label className="muted-text" style={{ flex: "1 1 160px" }}>
              Người mới
              <select
                style={inputStyle}
                value={form.relation}
                onChange={(e) => set("relation")(e.target.value)}
              >
                {(Object.keys(RELATION_LABEL) as Relation[]).map((r) => (
                  <option key={r} value={r}>
                    {RELATION_LABEL[r]}
                  </option>
                ))}
              </select>
            </label>
            <label className="muted-text" style={{ flex: "2 1 220px" }}>
              Người đã có trong cây
              <select
                style={inputStyle}
                value={form.relatedId}
                onChange={(e) => set("relatedId")(e.target.value)}
              >
                <option value="">— Chọn —</option>
                {sorted.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}
                    {p.generation ? ` (đời ${p.generation})` : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <label className="muted-text" style={{ display: "block", marginTop: 12 }}>
          Họ và tên
          <input
            style={inputStyle}
            value={form.fullName}
            onChange={(e) => set("fullName")(e.target.value)}
            placeholder="VD: Nguyễn Văn An"
          />
        </label>
        {dups.length > 0 && (
          <div className="canh-bao-trung" role="alert">
            <strong>Có thể đã có người này trong cây:</strong>
            <ul>
              {dups.map((p) => (
                <li key={p.id}>
                  {p.fullName}
                  {year(p.dateOfBirth) ? ` (sinh ${year(p.dateOfBirth)})` : ""}
                  {p.generation ? ` · đời ${p.generation}` : ""}
                  {p.branch ? ` · ${p.branch}` : ""}
                </li>
              ))}
            </ul>
            <label>
              <input type="checkbox" checked={dupOk} onChange={(e) => setDupOk(e.target.checked)} /> Đây là
              người khác, vẫn lưu
            </label>
          </div>
        )}
        <div className="btn-row" style={{ flexWrap: "wrap", marginTop: 12 }}>
          <label className="muted-text" style={{ flex: "1 1 120px" }}>
            Giới tính
            <select
              style={inputStyle}
              value={form.gender}
              onChange={(e) => set("gender")(e.target.value)}
            >
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
            </select>
          </label>
          <label className="muted-text" style={{ flex: "1 1 120px" }}>
            Năm sinh
            <input
              style={inputStyle}
              value={form.birthYear}
              onChange={(e) => set("birthYear")(e.target.value)}
              placeholder="VD: 1958"
              inputMode="numeric"
              maxLength={4}
            />
          </label>
          <label className="muted-text" style={{ flex: "1 1 160px" }}>
            Ngày mất (dương lịch, nếu đã mất)
            <input
              style={inputStyle}
              type="date"
              value={form.dateOfDeath}
              onChange={(e) => set("dateOfDeath")(e.target.value)}
            />
          </label>
        </div>
        {form.dateOfDeath && (
          <label className="muted-text" style={{ display: "block", marginTop: 12 }}>
            Phần mộ ở đâu
            <input
              style={inputStyle}
              value={form.burialPlace}
              onChange={(e) => set("burialPlace")(e.target.value)}
              placeholder="VD: Nghĩa trang họ, xã Thanh Ngọc"
            />
          </label>
        )}
        <label className="muted-text" style={{ display: "block", marginTop: 12 }}>
          Chi / nhánh (không bắt buộc, để trống thì theo người liên quan)
          <input
            style={inputStyle}
            value={form.branch}
            onChange={(e) => set("branch")(e.target.value)}
            placeholder="VD: Chi trưởng"
          />
        </label>
        <div className="btn-row" style={{ marginTop: 16 }}>
          <button className="btn primary" disabled={busy} onClick={() => void save()}>
            {busy ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Thêm vào cây"}
          </button>
          {editing && (
            <button
              className="btn"
              onClick={() => {
                setEditing(null);
                setForm(EMPTY);
              }}
            >
              Hủy
            </button>
          )}
        </div>
      </div>

      <div className="card section-gap">
        <h2 className="card-title">Trong cây ({persons.length} người)</h2>
        {loading ? (
          <p className="muted-text">Đang tải…</p>
        ) : persons.length === 0 ? (
          <p className="muted-text">Chưa có ai.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <tbody>
                {sorted.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.fullName}</strong>
                      <span className="muted-text">
                        {" "}
                        {[year(p.dateOfBirth), year(p.dateOfDeath)]
                          .filter(Boolean)
                          .join(" – ")}
                      </span>
                    </td>
                    <td className="muted-text">
                      {p.generation ? `Đời ${p.generation}` : "—"}
                      {p.branch ? ` · ${p.branch}` : ""}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="btn" disabled={busy} onClick={() => startEdit(p)}>
                        Sửa
                      </button>{" "}
                      <button className="btn" disabled={busy} onClick={() => void remove(p)}>
                        {confirmDelete === p.id ? "Bấm lần nữa để xóa" : "Xóa"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
