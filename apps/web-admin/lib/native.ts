/**
 * Đang chạy trong vỏ app Android/iOS (apps/app-shell)? Vỏ app thêm
 * "HoNhaToiApp" vào user agent (capacitor.config.ts → appendUserAgent).
 */
export function isInApp(): boolean {
  return typeof navigator !== "undefined" && navigator.userAgent.includes("HoNhaToiApp");
}
