"use client";

/**
 * Lịch âm dương: xem tháng (ngày dương + ngày âm), đánh dấu ngày giỗ của
 * dòng họ, ngày lễ, mùng 1 và rằm; bấm một ngày để xem can chi, tiết khí,
 * giờ hoàng đạo; đổi ngày dương ↔ âm. Tính toàn bộ trong trình duyệt bằng
 * cùng thuật toán với máy chủ nên ngày giỗ khớp nhắc giỗ.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { get, getAccessToken } from "@/lib/api";
import { useLineages } from "@/lib/lineage";
import {
  amSangDuong,
  canChiNam,
  canChiNgay,
  canChiThang,
  conGiap,
  cuoiThangAm,
  duongSangAm,
  gioHoangDao,
  iso,
  ngayLe,
  tietKhi,
} from "@/lib/am-lich";
import BatThongBao from "@/components/BatThongBao";

interface Anniversary {
  personId: string;
  fullName: string;
  deathLunar: string;
  gioLabel?: string;
  nextSolar: string;
  daysUntil: number;
}

const THU = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const THU_DAI = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];

function homNay() {
  const s = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
  const [y, m, d] = s.split("-").map(Number);
  return { y, m, d };
}

const dd = (n: number) => String(n).padStart(2, "0");
const fmtDuong = (y: number, m: number, d: number) => `${dd(d)}/${dd(m)}/${y}`;

/**
 * Giỗ rơi vào ngày nào: trong 400 ngày tới dùng đúng ngày máy chủ tính;
 * ngày đã qua thì so ngày/tháng (âm hoặc dương) — đủ để xem lại lịch cũ.
 */
function gioTrongNgay(list: Anniversary[], y: number, m: number, d: number, am: ReturnType<typeof duongSangAm>, today: string) {
  const key = iso(y, m, d);
  return list.filter((a) => {
    if (key >= today) return a.nextSolar === key;
    const label = a.gioLabel ?? "";
    const mm = /^(\d+)\/(\d+)/.exec(label || a.deathLunar);
    if (!mm) return false;
    const [gd, gm] = [Number(mm[1]), Number(mm[2])];
    if (label.includes("dương lịch")) return gd === d && gm === m;
    if (am.isLeap !== label.includes("nhuận")) return false;
    if (am.month !== gm) return false;
    return am.day === gd || (gd === 30 && am.day === 29 && cuoiThangAm(y, m, d));
  });
}

export default function LichAmPage() {
  const t = homNay();
  const todayIso = iso(t.y, t.m, t.d);
  const [thang, setThang] = useState({ y: t.y, m: t.m });
  const [chon, setChon] = useState({ y: t.y, m: t.m, d: t.d });
  const [loggedIn, setLoggedIn] = useState(false);
  const { current } = useLineages();
  const [gio, setGio] = useState<Anniversary[]>([]);

  useEffect(() => setLoggedIn(!!getAccessToken()), []);

  useEffect(() => {
    if (!current) return setGio([]);
    get<{ data?: { anniversaries?: Anniversary[] } }>(
      `/genealogy/lineages/${current.id}/anniversaries?limit=100&days=400`,
    )
      .then((b) => setGio(b?.data?.anniversaries ?? []))
      .catch(() => setGio([]));
  }, [current]);

  const o = useMemo(() => {
    const first = new Date(Date.UTC(thang.y, thang.m - 1, 1));
    const lead = (first.getUTCDay() + 6) % 7; // T2 đầu tuần
    const days = new Date(Date.UTC(thang.y, thang.m, 0)).getUTCDate();
    const cells: { d: number; am: ReturnType<typeof duongSangAm>; le: string[]; gio: Anniversary[] }[] = [];
    for (let d = 1; d <= days; d++) {
      const am = duongSangAm(thang.y, thang.m, d);
      cells.push({ d, am, le: ngayLe(d, thang.m, am), gio: gioTrongNgay(gio, thang.y, thang.m, d, am, todayIso) });
    }
    return { lead, cells };
  }, [thang, gio, todayIso]);

  function doiThang(n: number) {
    setThang(({ y, m }) => {
      const k = y * 12 + (m - 1) + n;
      return { y: Math.floor(k / 12), m: (k % 12) + 1 };
    });
  }

  function veHomNay() {
    setThang({ y: t.y, m: t.m });
    setChon(t);
  }

  const amChon = duongSangAm(chon.y, chon.m, chon.d);
  const thuChon = new Date(Date.UTC(chon.y, chon.m - 1, chon.d)).getUTCDay();
  const leChon = ngayLe(chon.d, chon.m, amChon);
  const gioChon = gioTrongNgay(gio, chon.y, chon.m, chon.d, amChon, todayIso);
  const amDau = o.cells[0]?.am;
  const amCuoi = o.cells[o.cells.length - 1]?.am;

  return (
    <>
      <div className="page-head gon">
        <h1 className="page-title">Lịch âm dương</h1>
      </div>

      <div className="card section-gap">
        <div className="lich-nav">
          <button className="btn chip" aria-label="Tháng trước" onClick={() => doiThang(-1)}>
            ‹
          </button>
          <div className="grow" style={{ textAlign: "center" }}>
            <strong>
              Tháng {thang.m}/{thang.y}
            </strong>
            {amDau && amCuoi && (
              <span className="sub" style={{ display: "block" }}>
                Âm lịch: {amDau.day}/{amDau.month}
                {amDau.isLeap ? " nhuận" : ""} – {amCuoi.day}/{amCuoi.month}
                {amCuoi.isLeap ? " nhuận" : ""} · năm {canChiNam(amCuoi.year)}
              </span>
            )}
          </div>
          <button className="btn chip" aria-label="Tháng sau" onClick={() => doiThang(1)}>
            ›
          </button>
        </div>
        <div className="btn-row" style={{ justifyContent: "center", marginTop: 6 }}>
          <button className="btn chip" onClick={veHomNay}>
            Hôm nay
          </button>
        </div>

        <div className="lich-luoi" role="grid" aria-label={`Lịch tháng ${thang.m}/${thang.y}`}>
          {THU.map((x, i) => (
            <div key={x} className={`lich-thu${i === 6 ? " cn" : ""}`} role="columnheader">
              {x}
            </div>
          ))}
          {Array.from({ length: o.lead }, (_, i) => (
            <div key={`trong-${i}`} aria-hidden="true" />
          ))}
          {o.cells.map(({ d, am, le, gio: g }, i) => {
            const isToday = thang.y === t.y && thang.m === t.m && d === t.d;
            const isSel = thang.y === chon.y && thang.m === chon.m && d === chon.d;
            const cn = (o.lead + i) % 7 === 6;
            const amText = am.day === 1 || d === 1 ? `${am.day}/${am.month}${am.isLeap ? "N" : ""}` : String(am.day);
            return (
              <button
                key={d}
                role="gridcell"
                aria-selected={isSel}
                aria-label={`${d}/${thang.m}, âm ${am.day}/${am.month}${g.length ? `, giỗ ${g.map((x) => x.fullName).join(", ")}` : ""}${le.length ? `, ${le.join(", ")}` : ""}`}
                className={`lich-o${isToday ? " hom-nay" : ""}${isSel ? " chon" : ""}${cn ? " cn" : ""}${le.length ? " le" : ""}`}
                onClick={() => setChon({ y: thang.y, m: thang.m, d })}
              >
                <span className="lich-duong">{d}</span>
                <span className={`lich-am${am.day === 1 || am.day === 15 ? " ram" : ""}`}>{amText}</span>
                {(g.length > 0 || le.length > 0) && (
                  <span className="lich-cham" aria-hidden="true">
                    {g.length > 0 && <i className="cham-gio" />}
                    {le.length > 0 && <i className="cham-le" />}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="sub" style={{ marginTop: 8 }}>
          <i className="cham-gio" /> Ngày giỗ &nbsp; <i className="cham-le" /> Ngày lễ &nbsp; Số âm đậm: mùng 1, rằm.
        </p>
      </div>

      <div className="card section-gap">
        <h2 className="card-title">
          {THU_DAI[thuChon]}, {fmtDuong(chon.y, chon.m, chon.d)}
        </h2>
        <div className="lich-chi-tiet">
          <div className="lich-am-to">
            <span className="n">{amChon.day}</span>
            <span className="sub">
              tháng {amChon.month}
              {amChon.isLeap ? " nhuận" : ""}
            </span>
          </div>
          <div className="grow">
            <div>
              Âm lịch: ngày {amChon.day}/{amChon.month}
              {amChon.isLeap ? " (nhuận)" : ""} năm {canChiNam(amChon.year)} (năm con {conGiap(amChon.year)})
            </div>
            <div className="sub">
              Ngày {canChiNgay(amChon.jd)} · tháng {canChiThang(amChon.month, amChon.year)}
              {amChon.isLeap ? " (nhuận)" : ""} · tiết {tietKhi(amChon.jd)}
            </div>
            <div className="sub">Giờ hoàng đạo: {gioHoangDao(amChon.jd).join(", ")}</div>
          </div>
        </div>
        {leChon.length > 0 && (
          <p style={{ marginTop: 8 }}>
            {leChon.map((x) => (
              <span key={x} className="badge" style={{ marginRight: 6 }}>
                {x}
              </span>
            ))}
          </p>
        )}
        {gioChon.length > 0 && (
          <div className="list" style={{ marginTop: 8 }}>
            {gioChon.map((a) => (
              <div key={a.personId} className="list-item" style={{ cursor: "default" }}>
                <span className="grow">
                  <strong>Giỗ {a.fullName}</strong>
                  <span className="sub" style={{ display: "block" }}>
                    Ngày {a.gioLabel ?? `${a.deathLunar} âm lịch`}
                  </span>
                </span>
                <span className="badge warm">Giỗ</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <DoiNgay
        onXem={(y, m, d) => {
          setThang({ y, m });
          setChon({ y, m, d });
        }}
      />

      {loggedIn && current && (
        <div className="card section-gap">
          <h2 className="card-title">Giỗ sắp tới · {current.name}</h2>
          {gio.length === 0 ? (
            <p className="muted-text">
              Chưa có ngày giỗ. Ngày giỗ tự có khi <Link href="/app/gia-pha">gia phả</Link> ghi ngày mất.
            </p>
          ) : (
            <div className="list">
              {gio.slice(0, 12).map((a) => {
                const [y, m, d] = a.nextSolar.split("-").map(Number);
                return (
                  <button
                    key={a.personId}
                    className="list-item"
                    onClick={() => {
                      setThang({ y, m });
                      setChon({ y, m, d });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    <span className="grow">
                      <strong>{a.fullName}</strong>
                      <span className="sub" style={{ display: "block" }}>
                        Giỗ ngày {a.gioLabel ?? `${a.deathLunar} âm lịch`} · {fmtDuong(y, m, d)}
                      </span>
                    </span>
                    <span className={`badge ${a.daysUntil <= 7 ? "warm" : ""}`}>
                      {a.daysUntil === 0 ? "Hôm nay" : `Còn ${a.daysUntil} ngày`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {loggedIn && <BatThongBao />}
    </>
  );
}

/** Đổi ngày dương ↔ âm. */
function DoiNgay({ onXem }: { onXem: (y: number, m: number, d: number) => void }) {
  const t = homNay();
  const [chieu, setChieu] = useState<"duong" | "am">("am");
  const [duong, setDuong] = useState(iso(t.y, t.m, t.d));
  const [am, setAm] = useState({ d: 1, m: 1, y: t.y, nhuan: false });

  let ketQua: React.ReactNode = null;
  let xem: [number, number, number] | null = null;
  if (chieu === "duong") {
    const mm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(duong);
    if (mm) {
      const [y, m, d] = [Number(mm[1]), Number(mm[2]), Number(mm[3])];
      const a = duongSangAm(y, m, d);
      xem = [y, m, d];
      ketQua = (
        <>
          Ngày <strong>{a.day}/{a.month}{a.isLeap ? " (nhuận)" : ""}</strong> năm {canChiNam(a.year)} âm lịch · ngày{" "}
          {canChiNgay(a.jd)}
        </>
      );
    }
  } else {
    const r = amSangDuong(am.d, am.m, am.y, am.nhuan);
    if (r) {
      xem = [r.y, r.m, r.d];
      const thu = new Date(Date.UTC(r.y, r.m - 1, r.d)).getUTCDay();
      ketQua = (
        <>
          {THU_DAI[thu]}, <strong>{fmtDuong(r.y, r.m, r.d)}</strong> dương lịch
        </>
      );
    } else {
      ketQua = (
        <span style={{ color: "var(--danger)" }}>
          {am.nhuan
            ? `Năm ${canChiNam(am.y)} không có tháng ${am.m} nhuận.`
            : `Tháng ${am.m} âm năm ${am.y} không có ngày ${am.d} (tháng thiếu).`}
        </span>
      );
    }
  }

  return (
    <div className="card section-gap">
      <h2 className="card-title">Đổi ngày âm ↔ dương</h2>
      <div className="btn-row">
        <button className={`btn chip${chieu === "am" ? " primary" : ""}`} onClick={() => setChieu("am")}>
          Âm → Dương
        </button>
        <button className={`btn chip${chieu === "duong" ? " primary" : ""}`} onClick={() => setChieu("duong")}>
          Dương → Âm
        </button>
      </div>
      {chieu === "duong" ? (
        <input
          type="date"
          className="field"
          aria-label="Ngày dương lịch"
          value={duong}
          onChange={(e) => setDuong(e.target.value)}
        />
      ) : (
        <div className="btn-row doi-am" style={{ flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
          <label>
            Ngày{" "}
            <select className="field" value={am.d} onChange={(e) => setAm({ ...am, d: Number(e.target.value) })}>
              {Array.from({ length: 30 }, (_, i) => (
                <option key={i + 1}>{i + 1}</option>
              ))}
            </select>
          </label>
          <label>
            Tháng{" "}
            <select className="field" value={am.m} onChange={(e) => setAm({ ...am, m: Number(e.target.value) })}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1}>{i + 1}</option>
              ))}
            </select>
          </label>
          <label>
            Năm{" "}
            <input
              type="number"
              className="field"
              style={{ width: 96 }}
              min={1900}
              max={2199}
              value={am.y}
              onChange={(e) => setAm({ ...am, y: Number(e.target.value) || t.y })}
            />
          </label>
          <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={am.nhuan} onChange={(e) => setAm({ ...am, nhuan: e.target.checked })} />
            Tháng nhuận
          </label>
        </div>
      )}
      <p style={{ marginTop: 10 }}>{ketQua}</p>
      {xem && (
        <button className="btn chip" onClick={() => xem && onXem(...xem)}>
          Xem trên lịch
        </button>
      )}
    </div>
  );
}
