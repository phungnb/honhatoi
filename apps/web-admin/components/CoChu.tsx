"use client";

/** Chọn cỡ chữ cho cả app; lưu trên máy này (người lớn tuổi thường cần chữ to hơn). */

import { useEffect, useState } from "react";

const KEY = "hnt_co_chu";
const LUA_CHON = [
  { value: "", label: "Vừa" },
  { value: "lon", label: "Lớn" },
  { value: "rat-lon", label: "Rất lớn" },
];

export default function CoChu() {
  const [co, setCo] = useState("");

  useEffect(() => {
    try {
      setCo(localStorage.getItem(KEY) ?? "");
    } catch {
      /* chế độ riêng tư: dùng cỡ mặc định */
    }
  }, []);

  function chon(v: string) {
    setCo(v);
    if (v) document.documentElement.dataset.coChu = v;
    else delete document.documentElement.dataset.coChu;
    try {
      if (v) localStorage.setItem(KEY, v);
      else localStorage.removeItem(KEY);
    } catch {
      /* không lưu được thì chỉ áp cho lần mở này */
    }
  }

  return (
    <div className="card section-gap" style={{ maxWidth: 440 }}>
      <h2 className="card-title">Cỡ chữ</h2>
      <p className="muted-text">Chọn cỡ chữ dễ đọc nhất với anh chị. Áp dụng cho cả app trên máy này.</p>
      <div className="btn-row" style={{ marginTop: 12 }} role="radiogroup" aria-label="Cỡ chữ">
        {LUA_CHON.map((o) => (
          <button
            key={o.label}
            role="radio"
            aria-checked={co === o.value}
            className={`btn${co === o.value ? " primary" : ""}`}
            onClick={() => chon(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
