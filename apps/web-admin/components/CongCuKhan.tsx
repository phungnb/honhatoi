"use client";

/**
 * Công cụ trên trang bài khấn: chữ to hơn để đọc trước bàn thờ, sao chép
 * toàn văn, và (khi mở từ Giỗ sắp tới) nhắc tên, ngày giỗ của người được giỗ.
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const KHOA = "hnt_khan_chu_to";

export default function CongCuKhan({ vanBan }: { vanBan: string }) {
  const sp = useSearchParams();
  const ten = sp.get("ten");
  const ngay = sp.get("ngay");
  const [to, setTo] = useState(false);
  const [daChep, setDaChep] = useState(false);

  useEffect(() => {
    try {
      setTo(localStorage.getItem(KHOA) === "1");
    } catch {
      /* trình duyệt chặn lưu trữ */
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.khanTo = to ? "1" : "";
    return () => {
      delete document.documentElement.dataset.khanTo;
    };
  }, [to]);

  const doiCo = () => {
    const moi = !to;
    setTo(moi);
    try {
      localStorage.setItem(KHOA, moi ? "1" : "0");
    } catch {
      /* bỏ qua */
    }
  };

  const chep = async () => {
    try {
      await navigator.clipboard.writeText(vanBan);
      setDaChep(true);
      setTimeout(() => setDaChep(false), 2500);
    } catch {
      setDaChep(false);
    }
  };

  return (
    <>
      {ten && (
        <div className="card nhac-dien section-gap" role="note">
          <strong>Giỗ {ten}</strong>
          {ngay && <span className="sub"> · ngày {ngay}</span>}
          <p className="sub" style={{ margin: "6px 0 0" }}>
            Đọc tên và ngày này vào chỗ “…” tương ứng. Bố đã mất xưng Hiển khảo, mẹ Hiển tỷ, ông nội Hiển tổ
            khảo, bà nội Hiển tổ tỷ.
          </p>
        </div>
      )}
      <div className="chips section-gap" style={{ flexWrap: "wrap" }}>
        <button type="button" className={`chip ${to ? "on" : ""}`} onClick={doiCo} aria-pressed={to}>
          Chữ to để đọc
        </button>
        <button type="button" className="chip" onClick={chep}>
          {daChep ? "Đã sao chép" : "Sao chép bài khấn"}
        </button>
        <button type="button" className="chip" onClick={() => window.print()}>
          In bài khấn
        </button>
      </div>
    </>
  );
}
