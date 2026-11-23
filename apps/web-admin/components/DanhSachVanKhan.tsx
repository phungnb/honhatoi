"use client";

/** Danh sách văn khấn: tìm không cần gõ dấu, lọc theo nhóm. */

import { useMemo, useState } from "react";
import Link from "next/link";
import { boDau } from "@/lib/chu";
import BieuTuong from "@/components/BieuTuong";

type Muc = { slug: string; title: string; group: number };
type Nhom = { id: number; name: string };

export default function DanhSachVanKhan({ nhom, bai }: { nhom: Nhom[]; bai: Muc[] }) {
  const [q, setQ] = useState("");
  const [chon, setChon] = useState<number | null>(null);

  const khop = useMemo(() => {
    const k = boDau(q);
    return bai.filter((b) => (chon === null || b.group === chon) && (!k || boDau(b.title).includes(k)));
  }, [q, chon, bai]);

  return (
    <>
      <label className="searchbar">
        <BieuTuong ten="tim" size={18} />
        <input
          type="search"
          placeholder="Tìm bài khấn, ví dụ: gio dau, ram thang 7, nha moi"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Tìm bài văn khấn"
        />
      </label>
      <div className="chips section-gap" style={{ flexWrap: "wrap" }}>
        <button type="button" className={`chip ${chon === null ? "on" : ""}`} onClick={() => setChon(null)}>
          Tất cả ({bai.length})
        </button>
        {nhom.map((n) => (
          <button
            key={n.id}
            type="button"
            className={`chip ${chon === n.id ? "on" : ""}`}
            onClick={() => setChon(chon === n.id ? null : n.id)}
          >
            {n.name}
          </button>
        ))}
      </div>
      {q && (
        <p className="muted-text" role="status">
          {khop.length ? `Tìm thấy ${khop.length} bài.` : `Không có bài nào khớp “${q}”.`}
        </p>
      )}
      {nhom
        .filter((n) => khop.some((b) => b.group === n.id))
        .map((n) => (
          <section key={n.id} className="section-gap">
            <h2 className="sec-title">{n.name}</h2>
            <div className="list">
              {khop
                .filter((b) => b.group === n.id)
                .map((b) => (
                  <Link key={b.slug} href={`/van-khan/${b.slug}`} className="list-item">
                    <span className="grow">{b.title}</span>
                    <span className="sub" aria-hidden="true">›</span>
                  </Link>
                ))}
            </div>
          </section>
        ))}
    </>
  );
}
