"use client";

/** Giỗ sắp tới — tính theo âm lịch, ngày dương năm sau tự dời. */

import { useEffect, useState } from "react";
import { get } from "@/lib/api";

interface Anniversary {
  personId: string;
  fullName: string;
  deathLunar: string;
  nextSolar: string;
  daysUntil: number;
}

function fmtSolar(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function GioSapToi({
  lineageId,
  demo = false,
  limit = 3,
}: {
  lineageId?: string;
  demo?: boolean;
  limit?: number;
}) {
  const [items, setItems] = useState<Anniversary[] | null>(null);

  useEffect(() => {
    if (!demo && !lineageId) return;
    setItems(null);
    get<{ data?: { anniversaries?: Anniversary[] } }>(
      demo
        ? `/demo/anniversaries?limit=${limit}&days=365`
        : `/genealogy/lineages/${lineageId}/anniversaries?limit=${limit}&days=365`,
    )
      .then((b) => setItems(b?.data?.anniversaries ?? []))
      .catch(() => setItems([]));
  }, [lineageId, demo, limit]);

  return (
    <div className="card section-gap">
      <h2 className="card-title">Giỗ sắp tới</h2>
      {items === null ? (
        <p className="muted-text">Đang tải…</p>
      ) : items.length === 0 ? (
        <p className="muted-text">
          Chưa có ngày giỗ nào. Ngày giỗ tự có khi gia phả ghi ngày mất.
        </p>
      ) : (
        <div className="list">
          {items.map((a) => (
            <div key={a.personId} className="list-item" style={{ cursor: "default" }}>
              <span className="grow">
                <strong>{a.fullName}</strong>
                <span className="sub" style={{ display: "block" }}>
                  Giỗ ngày {a.deathLunar} âm lịch · {fmtSolar(a.nextSolar)}
                </span>
              </span>
              <span className={`badge ${a.daysUntil <= 7 ? "warm" : ""}`}>
                {a.daysUntil === 0 ? "Hôm nay" : `Còn ${a.daysUntil} ngày`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
