"use client";

/**
 * Công cụ trên trang bài khấn: chữ to hơn để đọc trước bàn thờ, sao chép
 * toàn văn, và (khi mở từ Giỗ sắp tới) nhắc tên, ngày giỗ của người được giỗ.
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const KHOA = "hnt_khan_chu_to";
/** Danh sách mã bài người dùng đã lưu, trên máy này (xem DanhSachVanKhan). */
export const KHOA_DA_LUU = "hnt_khan_da_luu";

export function docDaLuu(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KHOA_DA_LUU) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export default function CongCuKhan({ vanBan, slug }: { vanBan: string; slug: string }) {
  const sp = useSearchParams();
  const ten = sp.get("ten");
  const ngay = sp.get("ngay");
  const [to, setTo] = useState(false);
  const [daChep, setDaChep] = useState(false);
  const [daLuu, setDaLuu] = useState(false);

  useEffect(() => {
    try {
      setTo(localStorage.getItem(KHOA) === "1");
    } catch {
      /* trình duyệt chặn lưu trữ */
    }
    setDaLuu(docDaLuu().includes(slug));
  }, [slug]);

  const doiLuu = () => {
    const ds = docDaLuu().filter((x) => x !== slug);
    const moi = !daLuu;
    if (moi) ds.unshift(slug);
    try {
      localStorage.setItem(KHOA_DA_LUU, JSON.stringify(ds));
      setDaLuu(moi);
    } catch {
      /* bỏ qua */
    }
  };

  /** Tải bài về máy thành tệp chữ, mở được trên mọi điện thoại, không cần mạng. */
  const taiVe = () => {
    const tep = new Blob([vanBan + "\n"], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(tep);
    const a = document.createElement("a");
    a.href = url;
    a.download = `van-khan-${slug}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

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
        <button type="button" className={`chip ${daLuu ? "on" : ""}`} onClick={doiLuu} aria-pressed={daLuu}>
          {daLuu ? "Đã lưu vào Bài của tôi" : "Lưu vào Bài của tôi"}
        </button>
        <button type="button" className="chip" onClick={taiVe}>
          Tải về máy
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
