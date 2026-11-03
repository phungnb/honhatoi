/**
 * Lịch âm Việt Nam phía trình duyệt — cùng thuật toán Hồ Ngọc Đức (múi giờ
 * +7) và cùng package với API (services/api/src/genealogy/lunar.ts), nên
 * ngày âm trên lịch khớp ngày giỗ máy chủ tính. Thêm can chi, tiết khí,
 * giờ hoàng đạo và ngày lễ để tra cứu.
 */

import { convertSolar2Lunar } from "vietnamese-lunar-calendar/build/solar-lunar/convert-lunar";
import { convertLunar2Solar } from "vietnamese-lunar-calendar/build/solar-lunar/convert-solar";
import { jdFromDate } from "vietnamese-lunar-calendar/build/solar-lunar/julian";
import { sunLongitude } from "vietnamese-lunar-calendar/build/solar-lunar/sun-longitude";

const TZ = 7;

export interface NgayAm {
  day: number;
  month: number;
  year: number;
  isLeap: boolean;
  jd: number;
}

export const CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
export const CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];
const CON_GIAP = ["Chuột", "Trâu", "Hổ", "Mèo", "Rồng", "Rắn", "Ngựa", "Dê", "Khỉ", "Gà", "Chó", "Lợn"];

const TIET_KHI = [
  "Xuân phân", "Thanh minh", "Cốc vũ", "Lập hạ", "Tiểu mãn", "Mang chủng",
  "Hạ chí", "Tiểu thử", "Đại thử", "Lập thu", "Xử thử", "Bạch lộ",
  "Thu phân", "Hàn lộ", "Sương giáng", "Lập đông", "Tiểu tuyết", "Đại tuyết",
  "Đông chí", "Tiểu hàn", "Đại hàn", "Lập xuân", "Vũ thủy", "Kinh trập",
];

/** Giờ hoàng đạo theo chi của ngày (bảng Hồ Ngọc Đức): bit i = giờ CHI[i]. */
const GIO_HD = ["110100101100", "001101001011", "110011010010", "101100110100", "001011001101", "010010110011"];
const KHUNG_GIO = ["23–1", "1–3", "3–5", "5–7", "7–9", "9–11", "11–13", "13–15", "15–17", "17–19", "19–21", "21–23"];

export function duongSangAm(y: number, m: number, d: number): NgayAm {
  const r = convertSolar2Lunar(d, m, y, TZ);
  return { day: r.date, month: r.month, year: r.year, isLeap: r.isLeap, jd: r.julian ?? jdFromDate(d, m, y) };
}

/** Âm → dương. null khi tháng nhuận đó không có trong năm âm. */
export function amSangDuong(d: number, m: number, y: number, nhuan: boolean): { y: number; m: number; d: number } | null {
  const r = convertLunar2Solar(d, m, y, nhuan ? 1 : 0, TZ);
  if (!(r instanceof Date)) return null;
  const out = { y: r.getFullYear(), m: r.getMonth() + 1, d: r.getDate() };
  // Thư viện không báo lỗi khi năm không có tháng nhuận / tháng thiếu ngày 30:
  // đổi ngược để chắc chắn đúng ngày người dùng hỏi.
  const back = duongSangAm(out.y, out.m, out.d);
  if (back.day !== d || back.month !== m || back.isLeap !== nhuan) return null;
  return out;
}

export const canChiNam = (y: number) => `${CAN[(y + 6) % 10]} ${CHI[(y + 8) % 12]}`;
export const conGiap = (y: number) => CON_GIAP[(y + 8) % 12];
export const canChiThang = (m: number, y: number) => `${CAN[(y * 12 + m + 3) % 10]} ${CHI[(m + 1) % 12]}`;
export const canChiNgay = (jd: number) => `${CAN[(jd + 9) % 10]} ${CHI[(jd + 1) % 12]}`;

export function tietKhi(jd: number): string {
  const L = sunLongitude(jd + 1 - 0.5 - TZ / 24);
  return TIET_KHI[Math.floor((L / Math.PI) * 12) % 24];
}

export function gioHoangDao(jd: number): string[] {
  const bits = GIO_HD[((jd + 1) % 12) % 6];
  return CHI.flatMap((c, i) => (bits[i] === "1" ? [`${c} (${KHUNG_GIO[i]})`] : []));
}

const LE_AM: Record<string, string> = {
  "1/1": "Tết Nguyên đán",
  "2/1": "Mùng 2 Tết",
  "3/1": "Mùng 3 Tết",
  "15/1": "Rằm tháng Giêng",
  "3/3": "Tết Hàn thực",
  "10/3": "Giỗ Tổ Hùng Vương",
  "15/4": "Lễ Phật đản",
  "5/5": "Tết Đoan ngọ",
  "15/7": "Lễ Vu Lan",
  "15/8": "Tết Trung thu",
  "9/9": "Tết Trùng cửu",
  "10/10": "Tết Song thập",
  "23/12": "Ông Công Ông Táo",
};
const LE_DUONG: Record<string, string> = {
  "1/1": "Tết Dương lịch",
  "14/2": "Lễ Tình nhân",
  "8/3": "Quốc tế Phụ nữ",
  "30/4": "Giải phóng miền Nam",
  "1/5": "Quốc tế Lao động",
  "1/6": "Quốc tế Thiếu nhi",
  "2/9": "Quốc khánh",
  "20/10": "Phụ nữ Việt Nam",
  "20/11": "Nhà giáo Việt Nam",
  "25/12": "Giáng sinh",
};

export function ngayLe(dd: number, mm: number, am: NgayAm): string[] {
  const out: string[] = [];
  if (!am.isLeap && LE_AM[`${am.day}/${am.month}`]) out.push(LE_AM[`${am.day}/${am.month}`]);
  if (LE_DUONG[`${dd}/${mm}`]) out.push(LE_DUONG[`${dd}/${mm}`]);
  return out;
}

/** Ngày cuối tháng âm (30 tháng đủ, 29 tháng thiếu): mùng 1 tháng sau là ngày mai. */
export function cuoiThangAm(y: number, m: number, d: number): boolean {
  const t = new Date(Date.UTC(y, m - 1, d + 1));
  return duongSangAm(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()).day === 1;
}

export const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
