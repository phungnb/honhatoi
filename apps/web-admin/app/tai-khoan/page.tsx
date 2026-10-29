"use client";

/**
 * Tài khoản — đổi số điện thoại mà vẫn giữ nguyên tài khoản (vai trò
 * Trưởng tộc, quyền quản trị nền tảng, các dòng họ đã tham gia).
 * Cần mã OTP gửi tới CẢ số cũ lẫn số mới; mất số cũ thì nhờ quản trị
 * nền tảng đổi hộ.
 */

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { get, getAccessToken, post } from "@/lib/api";
import { apiMessage } from "@/lib/errors";

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

export default function TaiKhoanPage() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [newPhone, setNewPhone] = useState("");
  const [oldCode, setOldCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [needsOld, setNeedsOld] = useState(true);
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      setLoggedIn(false);
      return;
    }
    get<{ data?: { user?: { phone?: string | null } } }>("/auth/me")
      .then((b) => {
        setLoggedIn(true);
        setPhone(b?.data?.user?.phone ?? null);
      })
      .catch(() => setLoggedIn(false));
  }, []);

  async function requestCodes() {
    if (!newPhone.trim()) {
      setError("Nhập số điện thoại mới.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const b = await post<{ data?: { requiresOldCode?: boolean } }>(
        "/auth/phone/change/request",
        { newPhone: newPhone.trim() },
      );
      setNeedsOld(b?.data?.requiresOldCode !== false);
      setStep(2);
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await post("/auth/phone/change/confirm", {
        newPhone: newPhone.trim(),
        ...(needsOld ? { oldCode: oldCode.trim() } : {}),
        newCode: newCode.trim(),
      });
      setPhone(newPhone.trim());
      setDone(newPhone.trim());
      setStep(1);
      setNewPhone("");
      setOldCode("");
      setNewCode("");
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (loggedIn === false)
    return (
      <div>
        <p className="muted-text">Bạn chưa đăng nhập.</p>
        <Link className="btn primary" href="/dang-nhap">
          Đăng nhập
        </Link>
      </div>
    );

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Tài khoản</h1>
        <p className="page-desc">
          Số đang dùng: <strong>{phone ?? "chưa có"}</strong>. Đổi số vẫn giữ
          nguyên tài khoản: vai trò trong dòng họ, quyền Trưởng tộc và quyền
          quản trị đều đi theo.
        </p>
      </div>

      <div className="card" style={{ maxWidth: 440 }}>
        <h2 className="card-title">Đổi số điện thoại</h2>
        {done && (
          <p style={{ color: "var(--brand)" }}>
            Đã đổi sang số {done}. Các thiết bị khác đã bị đăng xuất.
          </p>
        )}
        {error && <p style={{ color: "#ff6b6b" }}>{error}</p>}
        {step === 1 ? (
          <>
            <label className="muted-text">
              Số điện thoại mới
              <input
                style={inputStyle}
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="VD: 0865784913"
                inputMode="tel"
              />
            </label>
            <div className="btn-row" style={{ marginTop: 16 }}>
              <button
                className="btn primary"
                disabled={busy}
                onClick={() => void requestCodes()}
              >
                {busy ? "Đang gửi…" : "Gửi mã xác thực"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="muted-text">
              {needsOld
                ? `Đã gửi mã tới số cũ (${phone}) và số mới (${newPhone}).`
                : `Đã gửi mã tới số ${newPhone}.`}
            </p>
            {needsOld && (
              <label className="muted-text">
                Mã gửi tới số cũ
                <input
                  style={inputStyle}
                  value={oldCode}
                  onChange={(e) => setOldCode(e.target.value)}
                  placeholder="000000"
                  inputMode="numeric"
                  maxLength={6}
                />
              </label>
            )}
            <label className="muted-text" style={{ display: "block", marginTop: 12 }}>
              Mã gửi tới số mới
              <input
                style={inputStyle}
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="000000"
                inputMode="numeric"
                maxLength={6}
              />
            </label>
            <div className="btn-row" style={{ marginTop: 16 }}>
              <button
                className="btn primary"
                disabled={busy}
                onClick={() => void confirm()}
              >
                {busy ? "Đang kiểm tra…" : "Xác nhận đổi số"}
              </button>
              <button
                className="btn"
                onClick={() => {
                  setStep(1);
                  setError(null);
                }}
              >
                Quay lại
              </button>
            </div>
          </>
        )}
        <p className="muted-text" style={{ marginTop: 16 }}>
          Mất số cũ, không nhận được mã? Liên hệ quản trị nền tảng để được
          xác minh và đổi hộ.
        </p>
      </div>
    </>
  );
}
