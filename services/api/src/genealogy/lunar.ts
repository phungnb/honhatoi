/**
 * Lịch âm Việt Nam — dùng cho ngày giỗ (tuần 3 theo đánh giá chuyên gia
 * 27/10/2026: tự động tính ngày giỗ âm lịch, nhắc trước 3 ngày).
 *
 * Thuật toán: thiên văn Hồ Ngọc Đức (múi giờ +7, Việt Nam) qua package
 * `vietnamese-lunar-calendar`. KHÔNG dùng lịch Trung Quốc: hai lịch lệch
 * nhau ở một số tháng (ví dụ 17/03/2019: âm Việt là 12/02, âm Trung là
 * 11/02). Hai hàm đổi chiều không nằm ở export chính của package nên
 * import sâu vào build/solar-lunar (package không khai `exports` nên
 * import sâu vẫn hợp lệ).
 *
 * Đã kiểm chứng 15 ca (Tết 2022–2026, ca lệch Việt–Trung, tháng nhuận
 * 2023/2025, Trung Thu 2024, cả hai chiều) trước khi nối vào API.
 *
 * Quy ước tính giỗ:
 * - Người mất vào tháng nhuận: năm nào có tháng nhuận đó thì giỗ vào
 *   tháng nhuận, năm không có thì giỗ vào tháng thường cùng số.
 * - Người mất vào tháng thường: giỗ luôn vào tháng thường, kể cả năm
 *   có tháng nhuận cùng số (không giỗ 2 lần).
 * - Người mất ngày 30 âm mà năm đó tháng chỉ có 29 ngày: giỗ vào ngày
 *   29 (ngày cuối tháng), không trượt sang mùng 1 tháng sau.
 */

import { convertSolar2Lunar } from 'vietnamese-lunar-calendar/build/solar-lunar/convert-lunar';
import { convertLunar2Solar } from 'vietnamese-lunar-calendar/build/solar-lunar/convert-solar';

/** Múi giờ Việt Nam — mọi ngày trong module này đều theo lịch Việt. */
export const VN_TIMEZONE = 7;

export interface LunarDate {
  day: number;
  month: number;
  year: number;
  isLeap: boolean;
}

const vnDateFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Hôm nay (YYYY-MM-DD) theo giờ Việt Nam, không theo giờ máy chủ. */
export function todayVn(): string {
  return vnDateFmt.format(new Date());
}

/** Định dạng một Date (lưu dạng DATE trong DB) thành YYYY-MM-DD. */
export function toVnDateString(d: Date): string {
  return vnDateFmt.format(d);
}

function parseSolar(s: string): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) throw new Error(`Ngày dương không hợp lệ: ${s}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function solarToLunar(y: number, m: number, d: number): LunarDate {
  const r = convertSolar2Lunar(d, m, y, VN_TIMEZONE);
  return { day: r.date, month: r.month, year: r.year, isLeap: r.isLeap };
}

export function solarStrToLunar(s: string): LunarDate {
  const [y, m, d] = parseSolar(s);
  return solarToLunar(y, m, d);
}

/**
 * Đổi âm → dương. Trả null khi tháng nhuận yêu cầu không tồn tại trong
 * năm đó (thư viện trả [0, 0, 0] cho trường hợp này).
 */
export function lunarToSolar(
  day: number,
  month: number,
  year: number,
  isLeap: boolean,
): string | null {
  const r = convertLunar2Solar(
    day,
    month,
    year,
    isLeap ? 1 : 0,
    VN_TIMEZONE,
  );
  if (!(r instanceof Date)) return null;
  return vnDateFmt.format(r);
}

/** Năm âm lịch `year` có tháng nhuận số `month` không? */
function hasLeapMonth(year: number, month: number): boolean {
  const s = lunarToSolar(1, month, year, true);
  if (!s) return false;
  const back = solarStrToLunar(s);
  return back.month === month && back.isLeap;
}

/** Tháng âm tiếp theo (kể cả nhuận) sau (month, isLeap) của năm year. */
function nextLunarMonth(
  month: number,
  isLeap: boolean,
  year: number,
): { month: number; isLeap: boolean; year: number } {
  if (!isLeap && hasLeapMonth(year, month))
    return { month, isLeap: true, year };
  if (month === 12) return { month: 1, isLeap: false, year: year + 1 };
  return { month: month + 1, isLeap: false, year };
}

/**
 * Ngày giỗ trong một năm âm lịch: đổi (day, month, isLeap) sang dương,
 * kiểm chứng bằng đổi ngược, xử lý tháng nhuận không tồn tại và tháng
 * thiếu ngày 30.
 */
function anniversaryInLunarYear(
  death: LunarDate,
  lunarYear: number,
): string | null {
  let isLeap = death.isLeap;
  let s = lunarToSolar(death.day, death.month, lunarYear, isLeap);
  if (!s) {
    // Thư viện báo tháng nhuận không tồn tại → giỗ vào tháng thường.
    isLeap = false;
    s = lunarToSolar(death.day, death.month, lunarYear, false);
  }
  if (!s) return null;
  let back = solarStrToLunar(s);
  if (back.month === death.month) {
    if (back.isLeap !== isLeap) {
      // Năm không nhuận: thư viện trả luôn ngày tháng thường thay vì
      // báo lỗi — nhận diện qua đổi ngược và rơi về tháng thường.
      isLeap = false;
      s = lunarToSolar(death.day, death.month, lunarYear, false);
      if (!s) return null;
      back = solarStrToLunar(s);
      if (back.month !== death.month || back.isLeap) return null;
    }
    if (back.day === death.day) return s;
    return null;
  }
  // Ngày đổi ra rơi sang mùng 1 tháng âm tiếp theo = tháng giỗ thiếu
  // ngày đó (mất ngày 30, tháng chỉ có 29 ngày): giỗ vào ngày cuối
  // tháng, tức s trừ 1 ngày.
  const nxt = nextLunarMonth(death.month, isLeap, lunarYear);
  if (
    back.day === 1 &&
    back.month === nxt.month &&
    back.isLeap === nxt.isLeap &&
    back.year === nxt.year
  ) {
    const d = new Date(`${s}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  return null;
}

export interface NextAnniversary {
  solar: string;
  lunar: LunarDate;
  daysUntil: number;
}

function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

/**
 * Lần giỗ tới gần nhất kể từ `fromSolar` (gồm cả hôm nay, daysUntil = 0).
 * Tìm trong năm âm hiện tại và năm sau — đủ vì một năm âm tối đa ~385 ngày.
 */
export function nextAnniversary(
  death: LunarDate,
  fromSolar: string,
): NextAnniversary | null {
  const fromLunar = solarStrToLunar(fromSolar);
  for (const y of [fromLunar.year, fromLunar.year + 1]) {
    const s = anniversaryInLunarYear(death, y);
    if (!s) continue;
    const days = daysBetween(fromSolar, s);
    if (days < 0) continue;
    return { solar: s, lunar: { ...death, year: y }, daysUntil: days };
  }
  return null;
}

/** Chuỗi hiển thị ngày âm: "15/8", tháng nhuận thêm " nhuận". */
export function formatLunar(d: LunarDate): string {
  return `${d.day}/${d.month}${d.isLeap ? ' nhuận' : ''}`;
}
