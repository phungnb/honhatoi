"use client";

/** Giỗ sắp tới — tính theo âm lịch, ngày dương năm sau tự dời. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { get } from "@/lib/api";
import DangTai from "@/components/DangTai";

/** Bài khấn gia tiên ngày giỗ thường (xem lib/van-khan.ts). */
const BAI_GIO = "/van-khan/gio-thuong-ban-ngan-dung-cho-gio-ong-ba-gio-cu";

interface Anniversary {
  personId: string;
  fullName: string;
  deathLunar: string;
  gioLabel?: string;
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
  // Mặc định hiện vài người gần nhất; "Xem cả năm" hiện đủ mọi ngày giỗ trong 12 tháng tới.
  const [ca, setCa] = useState(false);
  const soLay = ca ? 200 : limit;

  useEffect(() => {
    if (!demo && !lineageId) return;
    setItems(null);
    get<{ data?: { anniversaries?: Anniversary[] } }>(
      demo
        ? `/demo/anniversaries?limit=${soLay}&days=365`
        : `/genealogy/lineages/${lineageId}/anniversaries?limit=${soLay}&days=365`,
    )
      .then((b) => setItems(b?.data?.anniversaries ?? []))
      .catch(() => setItems([]));
  }, [lineageId, demo, soLay]);

  return (
    <div className="card section-gap">
      <h2 className="card-title">
        Giỗ sắp tới
        {!demo && (
          <Link href="/app/lich-am" className="sub" style={{ float: "right", fontWeight: 400 }}>
            Xem lịch
          </Link>
        )}
      </h2>
      {items === null ? (
        <DangTai />
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
                  Giỗ ngày {a.gioLabel ?? `${a.deathLunar} âm lịch`} · {fmtSolar(a.nextSolar)}
                </span>
                <Link
                  className="lien-khan"
                  href={`${BAI_GIO}?${new URLSearchParams({
                    ten: a.fullName,
                    ngay: a.gioLabel ?? `${a.deathLunar} âm lịch`,
                  })}`}
                >
                  Xem văn khấn ngày giỗ
                </Link>
              </span>
              <span className={`badge ${a.daysUntil <= 7 ? "warm" : ""}`}>
                {a.daysUntil === 0 ? "Hôm nay" : `Còn ${a.daysUntil} ngày`}
              </span>
            </div>
          ))}
          {!ca && items.length >= limit && (
            <button type="button" className="btn" style={{ marginTop: 8 }} onClick={() => setCa(true)}>
              Xem đủ ngày giỗ cả năm
            </button>
          )}
        </div>
      )}
    </div>
  );
}
