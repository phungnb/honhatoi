"use client";

/**
 * Sơ đồ cây gia phả dạng phả hệ: tổ tiên ở trên, con cháu tỏa xuống dưới,
 * vợ/chồng đứng cạnh nhau, đường nối cha mẹ – con. Một ngón kéo để di chuyển,
 * hai ngón (hoặc con lăn chuột) để phóng to/thu nhỏ, nút +/− cho người không
 * quen thao tác chạm. Bấm vào một người để mở hồ sơ, bấm nút dưới khung để
 * gập/mở cả nhánh.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as RPointerEvent } from "react";
import { CayPerson, CayRelationship, daMat, dungCay, years } from "@/components/CayNhanh";

const W = 156; // rộng một khung người
const H = 72; // cao một khung người
const GAP_SPOUSE = 10;
const GAP_X = 28; // khoảng cách giữa các nhánh anh em
const GAP_Y = 64; // khoảng cách giữa hai đời
const PAD = 32;
const MIN_SCALE = 0.1;
const MAX_SCALE = 2.5;

interface Node {
  id: string; // người trong họ (người có cha mẹ trong cây hoặc người gốc)
  spouses: string[];
  kids: Node[];
  /** Con này là con chung với vợ/chồng thứ mấy của cha/mẹ (-1: chưa rõ). */
  via: number;
  /** Thuộc nhánh con gái (nhánh ngoại): con cháu của một người nữ trong họ. */
  ngoai: boolean;
  hidden: number; // số con bị gập
  depth: number;
  width: number; // bề rộng cả nhánh
  x: number; // mép trái của khung người chính
  y: number;
}

const unitW = (n: Node) => W * (1 + n.spouses.length) + GAP_SPOUSE * n.spouses.length;
const SLOT = W + GAP_SPOUSE;

/**
 * Vị trí các khung trong một đơn vị gia đình (tính từ mép trái, theo ô).
 * Một vợ/chồng: [người][vợ]. Từ hai vợ/chồng trở lên: [vợ 1][người][vợ 2][vợ 3]…
 * để con của vợ 1 đứng bên trái, con của vợ 2 bên phải, không cắt chéo nhau.
 */
function slots(n: Node): { main: number; sp: number[] } {
  if (n.spouses.length < 2) return { main: 0, sp: n.spouses.map((_, i) => i + 1) };
  return { main: 1, sp: n.spouses.map((_, i) => (i === 0 ? 0 : i + 1)) };
}

/** Điểm xuất phát đường xuống con của từng nhóm: giữa đôi vợ chồng, hoặc dưới khung người. */
function junction(n: Node, via: number): { x: number; y: number } {
  const { main, sp } = slots(n);
  const mainX = n.x + main * SLOT;
  if (via < 0 || via >= n.spouses.length) {
    if (n.spouses.length === 1) return { x: mainX + W + GAP_SPOUSE / 2, y: n.y + H / 2 };
    return { x: mainX + W / 2, y: n.y + H };
  }
  const sx = n.x + sp[via] * SLOT;
  if (Math.abs(sp[via] - main) === 1) return { x: (Math.min(sx, mainX) + W + Math.max(sx, mainX)) / 2, y: n.y + H / 2 };
  return { x: sx + W / 2, y: n.y + H };
}
export default function SoDoCay({
  persons,
  relationships,
  rootId,
  onOpen,
  tieuDe,
}: {
  persons: CayPerson[];
  relationships: CayRelationship[];
  rootId?: string | null;
  onOpen: (id: string) => void;
  /** Tên dòng họ in trên đầu cuốn thư, ví dụ "Họ Nguyễn tại Đồng Nai". */
  tieuDe?: string | null;
}) {
  const { byId, children, parents, spouses, roots } = useMemo(
    () => dungCay(persons, relationships, rootId),
    [persons, relationships, rootId],
  );

  // Cây lớn: mặc định gập từ đời thứ 5 trở xuống để mở nhanh trên điện thoại.
  const [closed, setClosed] = useState<Set<string>>(() => new Set());
  const [autoClosed, setAutoClosed] = useState(false);

  const layout = useMemo(() => {
    const drawn = new Set<string>();
    const build = (id: string, depth: number, via: number, ngoai: boolean): Node | null => {
      if (drawn.has(id)) return null;
      drawn.add(id);
      const sp = (spouses.get(id) ?? []).filter((s) => !drawn.has(s));
      sp.forEach((s) => drawn.add(s));
      const kidIds = Array.from(
        new Set([...(children.get(id) ?? []), ...sp.flatMap((s) => children.get(s) ?? [])]),
      ).filter((k) => !drawn.has(k));
      // Nhóm con theo người mẹ/cha còn lại: một vợ/chồng thì gộp chung; từ hai
      // trở lên thì con vợ 1 trước, con chưa rõ mẹ/cha ở giữa, rồi vợ 2, vợ 3…
      const viaOf = (k: string) => {
        if (sp.length < 2) return sp.length ? 0 : -1;
        const ps = parents.get(k) ?? [];
        return sp.findIndex((s) => ps.includes(s));
      };
      const rank = (v: number) => (v === 0 ? 0 : v < 0 ? 1 : v + 1);
      const grouped = kidIds
        .map((k, i) => ({ k, v: viaOf(k), i }))
        .sort((a, b) => rank(a.v) - rank(b.v) || a.i - b.i);
      const female = byId.get(id)?.gender === "female";
      // Con của người nữ trong họ (không phải người gốc) là nhánh ngoại.
      const kidsNgoai = ngoai || (female && depth > 0);
      const node: Node = { id, spouses: sp, kids: [], via, ngoai, hidden: 0, depth, width: 0, x: 0, y: 0 };
      if (closed.has(id)) {
        node.hidden = kidIds.length;
      } else {
        for (const g of grouped) {
          const c = build(g.k, depth + 1, g.v, kidsNgoai);
          if (c) node.kids.push(c);
        }
      }
      return node;
    };
    const tops = roots.map((r) => build(r, 0, -1, false)).filter((n): n is Node => !!n);

    const measure = (n: Node): number => {
      const kidsW = n.kids.reduce((s, k) => s + measure(k), 0) + GAP_X * Math.max(0, n.kids.length - 1);
      n.width = Math.max(unitW(n), kidsW);
      return n.width;
    };
    const place = (n: Node, left: number) => {
      n.x = left + (n.width - unitW(n)) / 2;
      n.y = n.depth * (H + GAP_Y);
      const kidsW = n.kids.reduce((s, k) => s + k.width, 0) + GAP_X * Math.max(0, n.kids.length - 1);
      let cx = left + (n.width - kidsW) / 2;
      for (const k of n.kids) {
        place(k, cx);
        cx += k.width + GAP_X;
      }
    };
    let left = 0;
    let maxDepth = 0;
    for (const t of tops) {
      measure(t);
      place(t, left);
      left += t.width + GAP_X * 2;
    }
    const all: Node[] = [];
    const walk = (n: Node) => {
      all.push(n);
      maxDepth = Math.max(maxDepth, n.depth);
      n.kids.forEach(walk);
    };
    tops.forEach(walk);
    return {
      nodes: all,
      maxDepth,
      width: Math.max(0, left - GAP_X * 2) + PAD * 2,
      height: (maxDepth + 1) * (H + GAP_Y) - GAP_Y + PAD * 2 + 28,
    };
  }, [byId, children, parents, spouses, roots, closed]);

  // Con gái trong họ có con: mặc định gập nhánh ngoại cho cây gọn, vẫn hiện
  // số con cháu trên nút "+N nhánh ngoại" để bấm mở.
  const ngoaiRoots = useMemo(() => {
    const out = new Set<string>();
    for (const p of persons) {
      if (p.gender !== "female" || !(parents.get(p.id)?.length ?? 0)) continue;
      const kids = [...(children.get(p.id) ?? []), ...(spouses.get(p.id) ?? []).flatMap((s) => children.get(s) ?? [])];
      if (kids.length) out.add(p.id);
    }
    return out;
  }, [persons, parents, children, spouses]);
  const ngoaiOpen = Array.from(ngoaiRoots).some((id) => !closed.has(id));

  useEffect(() => {
    if (autoClosed || !persons.length) return;
    const init = new Set<string>(ngoaiRoots);
    if (persons.length > 60) for (const n of layout.nodes) if (n.depth === 3 && n.kids.length) init.add(n.id);
    setAutoClosed(true);
    if (init.size) setClosed(init);
  }, [autoClosed, persons.length, layout.nodes, ngoaiRoots]);

  function toggleNgoai() {
    setClosed((prev) => {
      const next = new Set(prev);
      ngoaiRoots.forEach((id) => (ngoaiOpen ? next.add(id) : next.delete(id)));
      return next;
    });
  }

  // ---- Thu phóng và kéo ----
  const viewRef = useRef<HTMLDivElement>(null);
  const [t, setT] = useState({ x: 0, y: 0, s: 1 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; s: number; cx: number; cy: number; x: number; y: number } | null>(null);
  const moved = useRef(0);

  const fit = useCallback(() => {
    const el = viewRef.current;
    if (!el || !layout.width) return;
    const r = el.getBoundingClientRect();
    const s = Math.min(1, Math.max(MIN_SCALE, Math.min(r.width / layout.width, r.height / layout.height)));
    setT({ s, x: (r.width - layout.width * s) / 2, y: Math.max(0, (r.height - layout.height * s) / 2) });
  }, [layout.width, layout.height]);

  // Lần đầu: giữ cỡ chữ đọc được, đặt đôi tổ tiên ở giữa phía trên khung nhìn.
  const firstFit = useRef(false);
  useLayoutEffect(() => {
    if (firstFit.current || !viewRef.current || !layout.nodes.length) return;
    firstFit.current = true;
    const r = viewRef.current.getBoundingClientRect();
    const s = Math.min(1, Math.max(0.6, r.width / layout.width));
    const top = layout.nodes[0];
    const cx = (PAD + top.x + unitW(top) / 2) * s;
    const x = layout.width * s <= r.width ? (r.width - layout.width * s) / 2 : r.width / 2 - cx;
    setT({ s, x, y: 8 });
  }, [layout]);

  const zoomAt = useCallback((factor: number, cx: number, cy: number) => {
    setT((p) => {
      const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, p.s * factor));
      const k = s / p.s;
      return { s, x: cx - (cx - p.x) * k, y: cy - (cy - p.y) * k };
    });
  }, []);

  const zoomCenter = (factor: number) => {
    const r = viewRef.current?.getBoundingClientRect();
    if (r) zoomAt(factor, r.width / 2, r.height / 2);
  };

  useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > Math.abs(e.deltaX) * 2) {
        zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
      } else {
        setT((p) => ({ ...p, x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  function onDown(e: RPointerEvent<HTMLDivElement>) {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) moved.current = 0;
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      const r = viewRef.current!.getBoundingClientRect();
      gesture.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        s: t.s,
        cx: (a.x + b.x) / 2 - r.left,
        cy: (a.y + b.y) / 2 - r.top,
        x: t.x,
        y: t.y,
      };
    }
  }

  function onMove(e: RPointerEvent<HTMLDivElement>) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);
    if (pointers.current.size === 1) {
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      moved.current += Math.abs(dx) + Math.abs(dy);
      // Chỉ bắt giữ con trỏ khi đã thật sự kéo, để cú chạm vào một người vẫn mở được hồ sơ.
      if (moved.current > 6 && !viewRef.current!.hasPointerCapture(e.pointerId)) {
        viewRef.current!.setPointerCapture(e.pointerId);
      }
      setT((p) => ({ ...p, x: p.x + dx, y: p.y + dy }));
    } else if (pointers.current.size === 2 && gesture.current) {
      moved.current = 99;
      const [a, b] = Array.from(pointers.current.values());
      const g = gesture.current;
      const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, (g.s * Math.hypot(a.x - b.x, a.y - b.y)) / g.dist));
      const k = s / g.s;
      setT({ s, x: g.cx - (g.cx - g.x) * k, y: g.cy - (g.cy - g.y) * k });
    }
  }

  function onUp(e: RPointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current = null;
  }

  function open(id: string) {
    if (moved.current > 6) return; // vừa kéo, không phải bấm
    onOpen(id);
  }

  function toggle(id: string) {
    if (moved.current > 6) return;
    setClosed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Đời của hàng trên cùng: lấy theo đời đã ghi của người gốc, không có thì là đời 1.
  const doiDau = (() => {
    const top = layout.nodes.find((n) => n.depth === 0);
    const g = top ? byId.get(top.id)?.generation : null;
    return g && g > 0 ? g : 1;
  })();

  // ---- Đường nối ----
  const lines: string[] = [];
  for (const n of layout.nodes) {
    if (!n.kids.length) continue;
    // Mỗi nhóm con (theo vợ/chồng) có đường riêng, hạ thấp dần để không chồng lên nhau.
    const groups = new Map<number, Node[]>();
    for (const k of n.kids) groups.set(k.via, [...(groups.get(k.via) ?? []), k]);
    let gi = 0;
    for (const [via, kids] of Array.from(groups.entries())) {
      const j = junction(n, via);
      const fromX = PAD + j.x;
      const midY = PAD + n.y + H + GAP_Y / 2 + (groups.size > 1 ? (gi - (groups.size - 1) / 2) * 8 : 0);
      lines.push(`M${fromX},${PAD + j.y}V${midY}`);
      const xs = kids.map((k) => PAD + k.x + (slots(k).main * SLOT) + W / 2);
      lines.push(`M${Math.min(fromX, ...xs)},${midY}H${Math.max(fromX, ...xs)}`);
      for (const x of xs) lines.push(`M${x},${midY}V${PAD + n.y + H + GAP_Y}`);
      gi++;
    }
  }
  for (const n of layout.nodes) {
    if (!n.spouses.length) continue;
    const { main, sp } = slots(n);
    const y = PAD + n.y + H / 2;
    const mx = PAD + n.x + main * SLOT;
    sp.forEach((slot, i) => {
      const sx = PAD + n.x + slot * SLOT;
      if (Math.abs(slot - main) === 1) {
        lines.push(`M${Math.min(sx, mx) + W},${y}H${Math.max(sx, mx)}`);
      } else {
        // Vợ/chồng không đứng sát: nối vòng phía trên các khung.
        const top = PAD + n.y - 8 - i * 4;
        lines.push(`M${mx + W / 2},${PAD + n.y}V${top}H${sx + W / 2}V${PAD + n.y}`);
      }
    });
  }

  const box = (id: string, x: number, y: number, spouse: string | null, ngoai: boolean) => {
    const p = byId.get(id);
    if (!p) return null;
    const sub = [spouse && spouse !== "Vợ/chồng" ? spouse : null, years(p), p.roleInLineage]
      .filter(Boolean)
      .join(" · ") || (spouse ?? "");
    const dead = daMat(p);
    return (
      <button
        key={id}
        className={`sd-box${p.gender === "female" ? " female" : ""}${dead ? " dead" : ""}${
          spouse ? " spouse" : ""
        }${ngoai ? " ngoai" : ""}${id === rootId ? " root" : ""}`}
        style={{ left: PAD + x, top: PAD + y, width: W, height: H }}
        onClick={() => open(id)}
      >
        <strong>{p.fullName}</strong>
        {sub && <span className="sub">{sub}</span>}
      </button>
    );
  };

  /** Nhãn vợ/chồng: "Vợ 1", "Vợ 2" khi có nhiều hơn một. */
  const spouseLabel = (n: Node, i: number) => {
    const g = byId.get(n.spouses[i])?.gender;
    const w = g === "female" ? "Vợ" : g === "male" ? "Chồng" : "Vợ/chồng";
    return n.spouses.length > 1 ? `${w} ${i + 1}` : "Vợ/chồng";
  };

  return (
    <div className="sd-wrap">
      <div className="cuon-thu">
        <div className="ct-truc" aria-hidden />
        <div className="ct-giay">
          <header className="ct-dau">
            <span className="ct-nhan">Phả đồ</span>
            {tieuDe && <h2 className="ct-ten">{tieuDe}</h2>}
            <span className="ct-hoa-van" aria-hidden />
          </header>
          <div className="ct-than">
            {/* Cột "Đời" bên trái, chạy theo khi kéo/phóng dọc, không che khung người. */}
            <div className="ct-doi" aria-hidden>
              {Array.from({ length: layout.maxDepth + 1 }, (_, d) => (
                <span key={d} style={{ top: t.y + (PAD + d * (H + GAP_Y) + H / 2) * t.s }}>
                  Đời {doiDau + d}
                </span>
              ))}
            </div>
            <div
              ref={viewRef}
              className="sd-view"
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
            >
              <div
                className="sd-canvas"
                style={{
                  width: layout.width,
                  height: layout.height,
                  transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})`,
                }}
              >
                <svg width={layout.width} height={layout.height} className="sd-lines" aria-hidden>
                  <path d={lines.join("")} />
                </svg>
                {layout.nodes.map((n) => {
                  const { main, sp } = slots(n);
                  const female = byId.get(n.id)?.gender === "female";
                  const fx = n.x + main * SLOT + W / 2;
                  return (
                    <div key={n.id}>
                      {box(n.id, n.x + main * SLOT, n.y, null, n.ngoai)}
                      {n.spouses.map((s, i) => box(s, n.x + sp[i] * SLOT, n.y, spouseLabel(n, i), n.ngoai))}
                      {(n.kids.length > 0 || n.hidden > 0) && (
                        <button
                          className={`sd-fold${n.hidden && female && n.depth > 0 ? " ngoai" : ""}`}
                          style={{ left: PAD + fx, top: PAD + n.y + H + 6, transform: "translateX(-50%)" }}
                          aria-label={n.hidden ? `Mở nhánh, ${n.hidden} con` : "Gập nhánh"}
                          onClick={() => toggle(n.id)}
                        >
                          {n.hidden ? (female && n.depth > 0 ? `+${n.hidden} nhánh ngoại` : `+${n.hidden}`) : "−"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="sd-tools">
            <button className="btn" onClick={() => zoomCenter(1.25)} aria-label="Phóng to">
              +
            </button>
            <button className="btn" onClick={() => zoomCenter(0.8)} aria-label="Thu nhỏ">
              −
            </button>
            {ngoaiRoots.size > 0 && (
              <button className="btn" onClick={toggleNgoai}>
                {ngoaiOpen ? "Gập nhánh ngoại" : "Mở nhánh ngoại"}
              </button>
            )}
            <button className="btn" onClick={fit}>
              Xem toàn bộ
            </button>
          </div>
        </div>
        <div className="ct-truc" aria-hidden />
      </div>
      <p className="muted-text sd-hint">
        Kéo để di chuyển, chụm hai ngón để phóng to/thu nhỏ. Bấm vào tên để xem hồ sơ. Khung viền
        đứt nét màu nâu là con cháu nhánh ngoại (con của con gái trong họ).
      </p>
    </div>
  );
}
