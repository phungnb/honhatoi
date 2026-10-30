"use client";

/**
 * Sơ đồ cây gia phả dạng nhánh: mỗi người một dòng, vợ/chồng cùng dòng,
 * con cái thụt vào trong có đường nối, bấm ▸ để gập/mở cả nhánh. Dạng dọc
 * đọc được trên điện thoại (sơ đồ ngang phải cuộn hai chiều).
 */

import { useMemo, useState } from "react";

export interface CayPerson {
  id: string;
  fullName: string;
  gender?: string | null;
  dateOfBirth?: string | null;
  dateOfDeath?: string | null;
  generation?: number | null;
  roleInLineage?: string | null;
}

export interface CayRelationship {
  personId: string;
  relatedPersonId: string;
  relationshipType: string;
}

const year = (iso?: string | null) => (iso ? iso.slice(0, 4) : "");

export function years(p: CayPerson): string {
  const b = year(p.dateOfBirth);
  const d = year(p.dateOfDeath);
  if (!b && !d) return "";
  return d ? `${b || "?"} – ${d}` : b;
}

/**
 * Dựng cấu trúc cây từ danh sách người và quan hệ: con của mỗi người, vợ/chồng,
 * và các gốc cần vẽ. Dùng chung cho dạng nhánh và sơ đồ.
 */
export function dungCay(
  persons: CayPerson[],
  relationships: CayRelationship[],
  rootId?: string | null,
) {
  const byId = new Map(persons.map((p) => [p.id, p]));
  const children = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  const spouses = new Map<string, string[]>();
  const push = (m: Map<string, string[]>, k: string, v: string) => {
    const a = m.get(k) ?? [];
    if (!a.includes(v)) a.push(v);
    m.set(k, a);
  };
  for (const r of relationships) {
    if (!byId.has(r.personId) || !byId.has(r.relatedPersonId)) continue;
    // (A, B, 'parent'): A là cha/mẹ của B. Bản ghi chiều ngược 'child' cho cùng kết quả.
    if (r.relationshipType === "parent") {
      push(children, r.personId, r.relatedPersonId);
      push(parents, r.relatedPersonId, r.personId);
    } else if (r.relationshipType === "child") {
      push(children, r.relatedPersonId, r.personId);
      push(parents, r.personId, r.relatedPersonId);
    } else if (r.relationshipType === "spouse") {
      push(spouses, r.personId, r.relatedPersonId);
      push(spouses, r.relatedPersonId, r.personId);
    }
  }
  const byBirth = (a: string, b: string) =>
    (byId.get(a)?.dateOfBirth ?? "9999").localeCompare(byId.get(b)?.dateOfBirth ?? "9999");
  children.forEach((a) => a.sort(byBirth));

  // Người được vẽ cạnh vợ/chồng thì không làm gốc riêng; con chung chỉ vẽ dưới
  // một người (người trong họ, tức người có cha mẹ trong cây, hoặc người đầu tiên).
  const shownAsSpouse = new Set<string>();
  const roots: string[] = [];
  const hasParent = (id: string) => (parents.get(id)?.length ?? 0) > 0;
  const candidates = persons
    .filter((p) => !hasParent(p.id))
    .map((p) => p.id)
    .sort((a, b) => {
      if (a === rootId) return -1;
      if (b === rootId) return 1;
      const ga = byId.get(a)?.generation ?? 99;
      const gb = byId.get(b)?.generation ?? 99;
      return ga - gb || byBirth(a, b);
    });
  for (const id of candidates) {
    if (shownAsSpouse.has(id)) continue;
    // Vợ/chồng có cha mẹ trong cây thì đã được vẽ ở nhánh của họ.
    const sp = spouses.get(id) ?? [];
    if (sp.some(hasParent)) continue;
    roots.push(id);
    for (const s of sp) shownAsSpouse.add(s);
  }
  return { byId, children, spouses, roots };
}

export default function CayNhanh({
  persons,
  relationships,
  rootId,
  onOpen,
}: {
  persons: CayPerson[];
  relationships: CayRelationship[];
  rootId?: string | null;
  onOpen: (id: string) => void;
}) {
  const [closed, setClosed] = useState<Set<string>>(new Set());

  const { byId, children, spouses, roots } = useMemo(
    () => dungCay(persons, relationships, rootId),
    [persons, relationships, rootId],
  );

  const drawn = new Set<string>();

  function kidsOf(id: string): string[] {
    const own = children.get(id) ?? [];
    const viaSpouse = (spouses.get(id) ?? []).flatMap((s) => children.get(s) ?? []);
    return Array.from(new Set([...own, ...viaSpouse])).filter((k) => !drawn.has(k));
  }

  function toggle(id: string) {
    setClosed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function chip(id: string, spouse = false) {
    const p = byId.get(id);
    if (!p) return null;
    return (
      <button
        key={id}
        className={`cay-chip${spouse ? " spouse" : ""}${p.gender === "female" ? " female" : ""}${
          p.dateOfDeath ? " dead" : ""
        }`}
        onClick={() => onOpen(id)}
      >
        <strong>{p.fullName}</strong>
        <span className="sub">
          {[years(p), p.roleInLineage].filter(Boolean).join(" · ") || (spouse ? "Vợ/chồng" : "")}
        </span>
      </button>
    );
  }

  function node(id: string): JSX.Element | null {
    if (drawn.has(id)) return null;
    drawn.add(id);
    const sp = (spouses.get(id) ?? []).filter((s) => !drawn.has(s));
    sp.forEach((s) => drawn.add(s));
    const kids = kidsOf(id);
    const isClosed = closed.has(id);
    return (
      <li key={id}>
        <div className="cay-row">
          {kids.length > 0 ? (
            <button
              className="cay-toggle"
              aria-label={isClosed ? "Mở nhánh" : "Gập nhánh"}
              onClick={() => toggle(id)}
            >
              {isClosed ? "▸" : "▾"}
            </button>
          ) : (
            <span className="cay-toggle" />
          )}
          {chip(id)}
          {sp.map((s) => chip(s, true))}
          {isClosed && kids.length > 0 && <span className="sub">+{kids.length} con</span>}
        </div>
        {!isClosed && kids.length > 0 && (
          <ul className="cay">
            {kids.map((k) => node(k))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <div className="cay-wrap">
      <ul className="cay cay-root">
        {roots.map((r) => node(r))}
      </ul>
    </div>
  );
}
