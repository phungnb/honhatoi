"use client";

/**
 * Chọn giao diện Sáng / Tối / Theo máy; lưu trên máy này. Mặc định theo cài
 * đặt máy: điện thoại để chế độ sáng (phần đông người lớn tuổi) thì app sáng.
 */

import { useEffect, useState } from "react";

const KEY = "hnt_giao_dien";
const LUA_CHON = [
  { value: "", label: "Theo máy" },
  { value: "light", label: "Sáng" },
  { value: "dark", label: "Tối" },
];

export default function GiaoDien() {
  const [gd, setGd] = useState("");

  useEffect(() => {
    try {
      setGd(localStorage.getItem(KEY) ?? "");
    } catch {
      /* chế độ riêng tư: theo máy */
    }
  }, []);

  function chon(v: string) {
    setGd(v);
    if (v) document.documentElement.dataset.theme = v;
    else delete document.documentElement.dataset.theme;
    try {
      if (v) localStorage.setItem(KEY, v);
      else localStorage.removeItem(KEY);
    } catch {
      /* không lưu được thì chỉ áp cho lần mở này */
    }
  }

  return (
    <div className="card section-gap" style={{ maxWidth: 440 }}>
      <h2 className="card-title">Giao diện</h2>
      <p className="muted-text">
        Nền sáng dễ đọc hơn ban ngày; nền tối dịu mắt buổi tối. &quot;Theo máy&quot; tự đổi theo cài đặt điện thoại.
      </p>
      <div className="btn-row" style={{ marginTop: 12 }} role="radiogroup" aria-label="Giao diện">
        {LUA_CHON.map((o) => (
          <button
            key={o.label}
            role="radio"
            aria-checked={gd === o.value}
            className={`btn${gd === o.value ? " primary" : ""}`}
            onClick={() => chon(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
