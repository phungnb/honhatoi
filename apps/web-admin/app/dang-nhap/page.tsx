"use client";

/**
 * Đăng nhập (một lần cho cả quản lý và con cháu) bằng OTP qua số điện thoại (cùng luồng auth
 * với app mobile). Sau khi đăng nhập, token được lưu để lib/api.ts dùng
 * cho mọi trang quản trị.
 */

import { useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { get, post, saveTokens } from "@/lib/api";
import { MyLineage, canManageLineage } from "@/lib/roles";

export default function DangNhapPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestCode() {
    const p = phone.trim();
    if (!p) {
      setError("Nhập số điện thoại trước.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await post("/auth/otp/request", { phone: p, purpose: "login" });
      setStep(2);
    } catch (e) {
      setError(
        `Không gửi được mã: ${e instanceof Error ? e.message : "lỗi không xác định"}`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (code.trim().length !== 6) {
      setError("Mã gồm 6 số.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body = await post<{
        data?: { accessToken?: string; refreshToken?: string };
      }>("/auth/otp/verify", { phone: phone.trim(), code: code.trim() });
      const access = body?.data?.accessToken;
      if (!access) throw new Error("Máy chủ không trả về token.");
      saveTokens(access, body.data?.refreshToken);
      // Có vai trò quản lý ở ít nhất 1 họ → cổng quản lý; còn lại → con cháu.
      const mine = await get<{ data?: { lineages?: MyLineage[] } }>(
        "/lineages?limit=100",
      ).catch(() => null);
      const manages = (mine?.data?.lineages ?? []).some(canManageLineage);
      router.push(manages ? "/quan-ly" : "/app");
    } catch (e) {
      setError(
        `Đăng nhập thất bại: ${e instanceof Error ? e.message : "lỗi không xác định"}`,
      );
    } finally {
      setBusy(false);
    }
  }

  const inputStyle: CSSProperties = {
    display: "block",
    width: "100%",
    marginTop: 8,
    background: "var(--surface)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "10px 12px",
  };

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Đăng nhập Họ Nhà Tôi</h1>
        <p className="page-desc">
          Dùng số điện thoại đã đăng ký trong dòng họ. Mã xác thực gồm 6 số
          (hiện tại mã chỉ lưu trong hệ thống, chưa gửi qua SMS).
        </p>
      </div>

      <div className="card" style={{ maxWidth: 440 }}>
        {error && (
          <p style={{ color: "#ff6b6b" }}>{error}</p>
        )}
        {step === 1 ? (
          <>
            <label className="muted-text">
              Số điện thoại
              <input
                style={inputStyle}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="VD: 0865784913"
                inputMode="tel"
              />
            </label>
            <div className="btn-row" style={{ marginTop: 16 }}>
              <button
                className="btn primary"
                disabled={busy}
                onClick={() => void requestCode()}
              >
                {busy ? "Đang gửi…" : "Gửi mã xác thực"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="muted-text">
              Mã đã được tạo cho số {phone}. Nhập mã 6 số để đăng nhập.
            </p>
            <label className="muted-text">
              Mã xác thực
              <input
                style={inputStyle}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
                inputMode="numeric"
                maxLength={6}
              />
            </label>
            <div className="btn-row" style={{ marginTop: 16 }}>
              <button
                className="btn primary"
                disabled={busy}
                onClick={() => void verifyCode()}
              >
                {busy ? "Đang kiểm tra…" : "Đăng nhập"}
              </button>
              <button
                className="btn"
                onClick={() => {
                  setStep(1);
                  setCode("");
                  setError(null);
                }}
              >
                Đổi số
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
