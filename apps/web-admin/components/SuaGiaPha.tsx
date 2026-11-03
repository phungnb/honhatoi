"use client";

/**
 * Dựng cây gia phả trên web (Người giữ gia phả / Ban quản trị / Chủ gia phả):
 * thêm người kèm quan hệ với người đã có, sửa thông tin, xóa. Đời được tự
 * tính từ quan hệ (con = đời cha mẹ + 1, vợ/chồng = cùng đời). Backend
 * vẫn kiểm tra quyền; người không đủ quyền sẽ thành đề xuất chờ duyệt.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { del, get, patch, post, put } from "@/lib/api";
import { apiMessage } from "@/lib/errors";

interface Person {
  id: string;
  fullName: string;
  nickname?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  dateOfDeath?: string | null;
  deathYearOnly?: boolean;
  isDeceased?: boolean;
  burialPlace?: string | null;
  deathLunarDay?: number | null;
  deathLunarMonth?: number | null;
  deathLunarLeap?: boolean;
  deathLunarText?: string | null;
  annivSolarDay?: number | null;
  annivSolarMonth?: number | null;
  sortOrder?: number | null;
  generation?: number | null;
  branch?: string | null;
  updatedAt?: string;
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

/** Dữ liệu ngày mất đã lưu → ô "Ngày mất" (ưu tiên âm lịch vì đó là ngày làm giỗ). */
function deathForm(p: Person) {
  const y = year(p.dateOfDeath);
  const dead = !!(p.isDeceased || p.dateOfDeath || p.deathLunarDay || p.annivSolarDay);
  const gio =
    p.deathLunarDay && p.deathLunarMonth
      ? { gioCal: "al" as const, gioText: `${p.deathLunarDay}/${p.deathLunarMonth}`, lunarLeap: !!p.deathLunarLeap }
      : p.annivSolarDay && p.annivSolarMonth
        ? { gioCal: "dl" as const, gioText: `${p.annivSolarDay}/${p.annivSolarMonth}`, lunarLeap: false }
        : { gioCal: "al" as const, gioText: "", lunarLeap: false };
  const base = { ...gio, deceased: dead, gioTouched: false };
  if (p.deathLunarText) return { ...base, deathCal: "al" as const, deathText: p.deathLunarText };
  if (p.dateOfDeath && !p.deathYearOnly) {
    const [yy, mm, dd] = p.dateOfDeath.slice(0, 10).split("-");
    return { ...base, deathCal: "dl" as const, deathText: `${Number(dd)}/${Number(mm)}/${yy}` };
  }
  // Dữ liệu cũ: ngày âm lưu ở ô giỗ, năm ở năm mất.
  if (p.deathLunarDay && p.deathLunarMonth)
    return { ...base, deathCal: "al" as const, deathText: `${p.deathLunarDay}/${p.deathLunarMonth}${y ? `/${y}` : ""}` };
  return { ...base, deathCal: "al" as const, deathText: y };
}

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
  deathCal: "al" as "al" | "dl",
  deathText: "",
  deceased: false,
  deathDirty: false,
  gioCal: "al" as "al" | "dl",
  gioText: "",
  gioTouched: false,
  lunarLeap: false,
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

  /** "1985" | "15/8" | "15/8/1985" → phần đã biết; sai dạng → null. */
  function parseDeath(v: string): { day?: number; month?: number; year?: number } | null {
    const t = v.trim().replace(/[-.\s]+/g, "/");
    if (!t) return {};
    let m = /^(\d{4})$/.exec(t);
    if (m) return { year: Number(m[1]) };
    m = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/.exec(t);
    if (!m) return null;
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = m[3] ? Number(m[3]) : undefined;
    if (day < 1 || day > (form.deathCal === "al" ? 30 : 31) || month < 1 || month > 12) return null;
    return { day, month, year };
  }

  function deathError(): string | null {
    const g = form.gioText.trim();
    if (g && !/^\d{1,2}\s*\/\s*\d{1,2}$/.test(g)) return "Ngày giỗ ghi dạng ngày/tháng, VD 15/8.";
    const d = parseDeath(form.deathText);
    if (!d) return "Ngày mất ghi dạng ngày/tháng/năm, ngày/tháng hoặc năm.";
    if (form.deathCal === "dl" && d.day && !d.year) return "Ngày mất dương lịch cần có năm.";
    if (form.deathCal === "dl" && d.day && d.year) {
      const dt = new Date(Date.UTC(d.year, d.month! - 1, d.day));
      if (dt.getUTCDate() !== d.day) return "Ngày mất không có thật.";
    }
    return null;
  }

  function deathBody() {
    if (!form.deathDirty) return {};
    const d = parseDeath(form.deathText) ?? {};
    const pad = (n: number) => String(n).padStart(2, "0");
    const solarFull = form.deathCal === "dl" && d.day && d.year;
    const gm = /^(\d{1,2})\s*\/\s*(\d{1,2})$/.exec(form.gioText.trim());
    const gd = gm ? Number(gm[1]) : null;
    const gmo = gm ? Number(gm[2]) : null;
    return {
      isDeceased: form.deceased,
      ...(solarFull
        ? { dateOfDeath: `${d.year}-${pad(d.month!)}-${pad(d.day!)}`, deathYearOnly: false }
        : d.year
          ? { dateOfDeath: `${d.year}-01-01`, deathYearOnly: true }
          : { dateOfDeath: null, deathYearOnly: false }),
      deathLunarText: form.deathCal === "al" && d.day ? form.deathText.trim() : null,
      ...(gd && form.gioCal === "al"
        ? { deathLunarDay: gd, deathLunarMonth: gmo, deathLunarLeap: form.lunarLeap }
        : { deathLunarDay: null, deathLunarMonth: null, deathLunarLeap: false }),
      ...(gd && form.gioCal === "dl"
        ? { annivSolarDay: gd, annivSolarMonth: gmo }
        : { annivSolarDay: null, annivSolarMonth: null }),
    };
  }

  /** Ngày mất đổi thì tự điền ngày giỗ (nếu người dùng chưa tự sửa ô giỗ). */
  function autoGio(cal: "al" | "dl", text: string) {
    const d = parseDeath(text);
    if (!d || !d.day) return;
    if (cal === "al") {
      setForm((f) => (f.gioTouched ? f : { ...f, gioCal: "al", gioText: `${d.day}/${d.month}` }));
      return;
    }
    if (!d.year) return;
    const pad = (n: number) => String(n).padStart(2, "0");
    get<{ data?: { lunar?: { day: number; month: number; isLeap?: boolean } } }>(
      `/genealogy/lunar/convert?date=${d.year}-${pad(d.month!)}-${pad(d.day)}`,
    )
      .then((b) => {
        const l = b?.data?.lunar;
        if (l)
          setForm((f) =>
            f.gioTouched ? f : { ...f, gioCal: "al", gioText: `${l.day}/${l.month}`, lunarLeap: !!l.isLeap },
          );
      })
      .catch(() => undefined);
  }

  function personBody() {
    const y = form.birthYear.trim();
    return {
      fullName: form.fullName.trim(),
      gender: form.gender,
      ...(y ? { dateOfBirth: `${y}-01-01`, birthYearOnly: true } : {}),
      ...deathBody(),
      ...(form.burialPlace.trim()
        ? { burialPlace: form.burialPlace.trim() }
        : editing?.burialPlace
          ? { burialPlace: null }
          : {}),
      ...(form.branch.trim() ? { branch: form.branch.trim() } : {}),
    };
  }

  async function save() {
    if (!form.fullName.trim()) return setError("Nhập họ tên.");
    if (form.birthYear && !/^\d{4}$/.test(form.birthYear.trim()))
      return setError("Năm sinh gồm 4 số, VD 1958.");
    const de = deathError();
    if (de) return setError(de);
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
        await patch(`/genealogy/persons/${editing.id}`, {
          ...personBody(),
          // Có người sửa chen giữa thì máy chủ trả lỗi thay vì ghi đè.
          ...(editing.updatedAt ? { expectedUpdatedAt: editing.updatedAt } : {}),
        });
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
      ...deathForm(p),
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
      (a.sortOrder ?? 1e9) - (b.sortOrder ?? 1e9) ||
      (a.dateOfBirth ?? "9999").localeCompare(b.dateOfBirth ?? "9999") ||
      a.fullName.localeCompare(b.fullName),
  );

  /** Lưu thứ tự mới (cả danh sách); lỗi thì trả lại thứ tự cũ. */
  async function saveOrder(ids: string[]) {
    const prev = persons;
    setPersons(persons.map((p) => ({ ...p, sortOrder: ids.indexOf(p.id) })));
    try {
      await put(`/genealogy/lineages/${lineageId}/persons/order`, { ids });
      await load();
    } catch (e) {
      setPersons(prev);
      setError(apiMessage(e));
    }
  }

  /** Bàn phím trên tay nắm: ↑/↓ đổi chỗ với người kề bên trong cùng đời. */
  function moveByKey(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= sorted.length || sorted[j].generation !== sorted[i].generation) return;
    const next = sorted.map((p) => p.id);
    [next[i], next[j]] = [next[j], next[i]];
    void saveOrder(next);
  }

  // Kéo thả bằng Pointer Events: chạy cả chuột lẫn cảm ứng, không cần thư viện.
  // Chỉ kéo trong cùng đời (danh sách sắp theo đời trước, thứ tự sau).
  const [drag, setDrag] = useState<{ id: string; order: string[] } | null>(null);
  const dragStartOrder = useRef<string[]>([]);
  const byId = useMemo(() => new Map(persons.map((p) => [p.id, p])), [persons]);
  const shown = drag ? drag.order.map((id) => byId.get(id)!).filter(Boolean) : sorted;

  // Nghe trên window thay vì pointer capture: dòng đang kéo bị React dời chỗ
  // trong DOM, một số trình duyệt sẽ nhả capture khi phần tử bị dời.
  const dragRef = useRef(drag);
  dragRef.current = drag;
  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    function onMove(e: globalThis.PointerEvent) {
      const d = dragRef.current;
      if (!d) return;
      e.preventDefault();
      // Tự cuộn khi kéo sát mép màn hình (danh sách dài trên điện thoại).
      const edge = 60;
      if (e.clientY < edge) window.scrollBy(0, -12);
      else if (e.clientY > window.innerHeight - edge) window.scrollBy(0, 12);
      const row = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest<HTMLElement>("tr[data-pid]");
      const overId = row?.dataset.pid;
      if (!overId || overId === d.id) return;
      const me = byId.get(d.id);
      const over = byId.get(overId);
      if (!me || !over || me.generation !== over.generation) return;
      const from = d.order.indexOf(d.id);
      const target = d.order.indexOf(overId);
      const order = d.order.filter((x) => x !== d.id);
      const to = order.indexOf(overId);
      // Kéo xuống thì chèn sau dòng đang chỉ, kéo lên thì chèn trước.
      order.splice(target > from ? to + 1 : to, 0, d.id);
      setDrag({ id: d.id, order });
    }
    function onUp() {
      const d = dragRef.current;
      setDrag(null);
      if (d && d.order.join() !== dragStartOrder.current.join()) void saveOrder(d.order);
    }
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // saveOrder/byId đọc state mới nhất qua closure của lần render bắt đầu kéo là đủ.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  function onHandleDown(e: PointerEvent<HTMLButtonElement>, id: string) {
    if (busy || drag || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.preventDefault();
    const order = sorted.map((p) => p.id);
    dragStartOrder.current = order;
    setDrag({ id, order });
  }

  function onHandleKey(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      moveByKey(i, e.key === "ArrowUp" ? -1 : 1);
    }
  }

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
        </div>
        <label className="muted-text" style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, width: "fit-content" }}>
          <input
            type="checkbox"
            checked={form.deceased}
            onChange={(e) =>
              setForm((f) =>
                e.target.checked
                  ? { ...f, deceased: true, deathDirty: true }
                  : { ...f, deceased: false, deathText: "", gioText: "", gioTouched: false, lunarLeap: false, deathDirty: true },
              )
            }
          />
          Đã mất
        </label>
        {form.deceased && (
          <>
            <div className="muted-text" style={{ marginTop: 12 }}>
              Ngày mất
              <div className="ngay-mat">
                <select
                  aria-label="Lịch"
                  value={form.deathCal}
                  onChange={(e) => {
                    const c = e.target.value as "al" | "dl";
                    setForm((f) => ({ ...f, deathCal: c, deathDirty: true }));
                    autoGio(c, form.deathText);
                  }}
                >
                  <option value="al">ÂL</option>
                  <option value="dl">DL</option>
                </select>
                <input
                  value={form.deathText}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((f) => ({ ...f, deathText: v, deathDirty: true }));
                    autoGio(form.deathCal, v);
                  }}
                  placeholder="ngày/tháng/năm hoặc năm"
                  inputMode="numeric"
                  maxLength={10}
                />
              </div>
            </div>
            <div className="muted-text" style={{ marginTop: 12 }}>
              Ngày giỗ
              <div className="ngay-mat">
                <select
                  aria-label="Lịch ngày giỗ"
                  value={form.gioCal}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, gioCal: e.target.value as "al" | "dl", gioTouched: true, deathDirty: true }))
                  }
                >
                  <option value="al">ÂL</option>
                  <option value="dl">DL</option>
                </select>
                <input
                  value={form.gioText}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((f) => ({ ...f, gioText: v, gioTouched: !!v.trim(), deathDirty: true }));
                  }}
                  placeholder="ngày/tháng"
                  inputMode="numeric"
                  maxLength={5}
                />
                {form.gioCal === "al" && (
                  <span className="chk">
                    <input
                      type="checkbox"
                      checked={form.lunarLeap}
                      onChange={(e) => setForm((f) => ({ ...f, lunarLeap: e.target.checked, deathDirty: true }))}
                    />
                    Nhuận
                  </span>
                )}
              </div>
            </div>
            <label className="muted-text" style={{ display: "block", marginTop: 12 }}>
              Phần mộ ở đâu
              <textarea
                style={{ ...inputStyle, minHeight: 64, resize: "vertical" }}
                value={form.burialPlace}
                maxLength={255}
                onChange={(e) => set("burialPlace")(e.target.value)}
                placeholder="VD: Nghĩa trang họ Nguyễn, xã Thanh Ngọc; khu B, hàng 2, mộ thứ 3 tính từ cổng"
              />
            </label>
          </>
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
                {shown.map((p, i) => (
                  <tr
                    key={p.id}
                    data-pid={p.id}
                    className={drag?.id === p.id ? "row-dragging" : undefined}
                  >
                    <td className="drag-cell">
                      <button
                        type="button"
                        className="drag-handle"
                        aria-label={`Kéo để đổi thứ tự ${p.fullName} (hoặc dùng phím mũi tên lên/xuống)`}
                        title="Kéo để đổi thứ tự trong cùng đời"
                        disabled={busy}
                        onPointerDown={(e) => onHandleDown(e, p.id)}
                        onKeyDown={(e) => onHandleKey(e, i)}
                      >
                        ⠿
                      </button>
                    </td>
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
