"use client";

/**
 * Bật/tắt thông báo đẩy trên thiết bị này (nhắc giỗ 7, 3, 1 ngày trước và
 * đúng ngày; các thông báo khác của dòng họ). Dùng Web Push: Chrome, Edge,
 * Firefox, Android; iPhone cần iOS 16.4+ và mở từ biểu tượng ngoài Màn hình chính.
 */

import { useEffect, useState } from "react";
import { get, post } from "@/lib/api";
import { apiMessage } from "@/lib/errors";
import { isInApp } from "@/lib/native";

type TrangThai = "dang-tai" | "khong-ho-tro" | "ios-can-cai" | "trong-app" | "may-chu-tat" | "bi-chan" | "tat" | "bat";

function b64ToBytes(b64: string): Uint8Array {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const s = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

export default function BatThongBao({ compact = false }: { compact?: boolean }) {
  const [tt, setTt] = useState<TrangThai>("dang-tai");
  const [key, setKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (isInApp()) return setTt("trong-app");
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window))
      return setTt(ios && !standalone ? "ios-can-cai" : "khong-ho-tro");
    get<{ data?: { enabled?: boolean; publicKey?: string | null } }>("/push/config")
      .then(async (b) => {
        if (!b?.data?.enabled || !b.data.publicKey) return setTt("may-chu-tat");
        setKey(b.data.publicKey);
        if (Notification.permission === "denied") return setTt("bi-chan");
        const reg = await navigator.serviceWorker.getRegistration("/");
        const sub = await reg?.pushManager.getSubscription();
        setTt(sub ? "bat" : "tat");
      })
      .catch(() => setTt("may-chu-tat"));
  }, []);

  async function bat() {
    if (!key) return;
    setBusy(true);
    setErr(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setTt(perm === "denied" ? "bi-chan" : "tat");
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: b64ToBytes(key) as BufferSource,
        }));
      const j = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      await post("/push/subscribe", { endpoint: j.endpoint, keys: j.keys });
      setTt("bat");
    } catch (e) {
      setErr(apiMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function tat() {
    setBusy(true);
    setErr(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await post("/push/unsubscribe", { endpoint: sub.endpoint }).catch(() => undefined);
        await sub.unsubscribe();
      }
      setTt("tat");
    } catch (e) {
      setErr(apiMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const loiNhan: Partial<Record<TrangThai, string>> = {
    "khong-ho-tro": "Trình duyệt này chưa nhận được thông báo đẩy. Giỗ vẫn hiện trong mục Thông báo.",
    "ios-can-cai":
      "Trên iPhone: bấm nút Chia sẻ → “Thêm vào MH chính”, rồi mở Họ Nhà Tôi từ biểu tượng đó để bật nhắc giỗ (cần iOS 16.4 trở lên).",
    "trong-app": "Bản app chưa gửi được thông báo đẩy. Giỗ vẫn hiện trong mục Thông báo; muốn nhận ngay trên máy, mở honhatoi.vercel.app bằng Chrome và bật tại đây.",
    "may-chu-tat": "Máy chủ chưa bật thông báo đẩy. Giỗ vẫn hiện trong mục Thông báo.",
    "bi-chan": "Bạn đã chặn thông báo của trang này. Mở cài đặt trang trong trình duyệt, cho phép Thông báo rồi tải lại.",
  };

  if (tt === "dang-tai") return null;
  if (compact && tt === "bat") return null;

  return (
    <div className={compact ? "section-gap" : "card section-gap"}>
      {!compact && <h2 className="card-title">Nhắc giỗ trên máy này</h2>}
      {tt === "bat" ? (
        <div className="btn-row" style={{ alignItems: "center" }}>
          <span className="grow">Đã bật. Máy này nhận nhắc giỗ trước 7, 3, 1 ngày và đúng ngày (khoảng 7 giờ sáng).</span>
          <button className="btn chip" disabled={busy} onClick={() => void tat()}>
            Tắt
          </button>
        </div>
      ) : tt === "tat" ? (
        <div className="btn-row" style={{ alignItems: "center" }}>
          <span className="grow">Nhận nhắc giỗ và tin dòng họ ngay trên điện thoại/máy tính này.</span>
          <button className="btn primary" disabled={busy} onClick={() => void bat()}>
            {busy ? "Đang bật…" : "Bật nhắc giỗ"}
          </button>
        </div>
      ) : (
        <p className="muted-text">{loiNhan[tt]}</p>
      )}
      {err && <p style={{ color: "var(--danger)" }}>{err}</p>}
    </div>
  );
}
