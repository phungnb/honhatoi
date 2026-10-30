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
import { CayPerson, CayRelationship, dungCay, years } from "@/components/CayNhanh";

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
  hidden: number; // số con bị gập
  depth: number;
  width: number; // bề rộng cả nhánh
  x: number; // mép trái của khung người chính
  y: number;
}

const unitW = (n: Node) => W * (1 + n.spouses.length) + GAP_SPOUSE * n.spouses.length;

export default function SoDoCay({
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
  const { byId, children, spouses, roots } = useMemo(
    () => dungCay(persons, relationships, rootId),
    [persons, relationships, rootId],
  );

  // Cây lớn: mặc định gập từ đời thứ 5 trở xuống để mở nhanh trên điện thoại.
  const [closed, setClosed] = useState<Set<string>>(() => new Set());
  const [autoClosed, setAutoClosed] = useState(false);

  const layout = useMemo(() => {
    const drawn = new Set<string>();
    const build = (id: string, depth: number): Node | null => {
      if (drawn.has(id)) return null;
      drawn.add(id);
      const sp = (spouses.get(id) ?? []).filter((s) => !drawn.has(s));
      sp.forEach((s) => drawn.add(s));
      const kidIds = Array.from(
        new Set([...(children.get(id) ?? []), ...sp.flatMap((s) => children.get(s) ?? [])]),
      ).filter((k) => !drawn.has(k));
      const node: Node = { id, spouses: sp, kids: [], hidden: 0, depth, width: 0, x: 0, y: 0 };
      if (closed.has(id)) {
        node.hidden = kidIds.length;
      } else {
        for (const k of kidIds) {
          const c = build(k, depth + 1);
          if (c) node.kids.push(c);
        }
      }
      return node;
    };
    const tops = roots.map((r) => build(r, 0)).filter((n): n is Node => !!n);

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
      width: Math.max(0, left - GAP_X * 2) + PAD * 2,
      height: (maxDepth + 1) * (H + GAP_Y) - GAP_Y + PAD * 2 + 28,
    };
  }, [children, spouses, roots, closed]);

  useEffect(() => {
    if (autoClosed || persons.length <= 60) return;
    const deep = new Set<string>();
    for (const n of layout.nodes) if (n.depth === 3 && n.kids.length) deep.add(n.id);
    setAutoClosed(true);
    if (deep.size) setClosed(deep);
  }, [autoClosed, persons.length, layout.nodes]);

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

  // ---- Đường nối ----
  const lines: string[] = [];
  for (const n of layout.nodes) {
    if (!n.kids.length) continue;
    // Có vợ/chồng thì đường xuất phát từ giữa đôi, không thì từ giữa khung người.
    const fromX = PAD + (n.spouses.length ? n.x + W + GAP_SPOUSE / 2 : n.x + W / 2);
    const fromY = PAD + n.y + (n.spouses.length ? H / 2 : H);
    const midY = PAD + n.y + H + GAP_Y / 2;
    lines.push(`M${fromX},${fromY}V${midY}`);
    const xs = n.kids.map((k) => PAD + k.x + W / 2);
    lines.push(`M${Math.min(fromX, ...xs)},${midY}H${Math.max(fromX, ...xs)}`);
    for (const x of xs) lines.push(`M${x},${midY}V${PAD + n.y + H + GAP_Y}`);
  }
  for (const n of layout.nodes) {
    if (!n.spouses.length) continue;
    const y = PAD + n.y + H / 2;
    lines.push(`M${PAD + n.x + W},${y}H${PAD + n.x + W + GAP_SPOUSE}`);
  }

  const box = (id: string, x: number, y: number, spouse: boolean) => {
    const p = byId.get(id);
    if (!p) return null;
    const sub = [years(p), p.roleInLineage].filter(Boolean).join(" · ") || (spouse ? "Vợ/chồng" : "");
    return (
      <button
        key={id}
        className={`sd-box${p.gender === "female" ? " female" : ""}${p.dateOfDeath ? " dead" : ""}${
          spouse ? " spouse" : ""
        }${id === rootId ? " root" : ""}`}
        style={{ left: PAD + x, top: PAD + y, width: W, height: H }}
        onClick={() => open(id)}
      >
        <strong>{p.fullName}</strong>
        {sub && <span className="sub">{sub}</span>}
      </button>
    );
  };

  return (
    <div className="sd-wrap">
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
          {layout.nodes.map((n) => (
            <div key={n.id}>
              {box(n.id, n.x, n.y, false)}
              {n.spouses.map((s, i) => box(s, n.x + (W + GAP_SPOUSE) * (i + 1), n.y, true))}
              {(n.kids.length > 0 || n.hidden > 0) && (
                <button
                  className="sd-fold"
                  style={{
                    left: PAD + (n.spouses.length ? n.x + W + GAP_SPOUSE / 2 : n.x + W / 2) - 15,
                    top: PAD + n.y + H + 6,
                  }}
                  aria-label={n.hidden ? `Mở nhánh, ${n.hidden} con` : "Gập nhánh"}
                  onClick={() => toggle(n.id)}
                >
                  {n.hidden ? `+${n.hidden}` : "−"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="sd-tools">
        <button className="btn" onClick={() => zoomCenter(1.25)} aria-label="Phóng to">
          +
        </button>
        <button className="btn" onClick={() => zoomCenter(0.8)} aria-label="Thu nhỏ">
          −
        </button>
        <button className="btn" onClick={fit}>
          Xem toàn bộ
        </button>
      </div>
      <p className="muted-text sd-hint">
        Kéo để di chuyển, chụm hai ngón để phóng to/thu nhỏ. Bấm vào tên để xem hồ sơ.
      </p>
    </div>
  );
}
