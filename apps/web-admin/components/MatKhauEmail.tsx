"use client";

/**
 * Thêm hoặc đổi email + mật khẩu cho tài khoản đang đăng nhập — cách
 * đăng nhập dự phòng cho người đang dùng số điện thoại hoặc Google.
 */

import { useState } from "react";
import type { CSSProperties } from "react";
import { post } from "@/lib/api";
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

export default function MatKhauEmail({
  email: initialEmail,
  hasPassword,
  onSaved,
}: {
  email: string | null;
  hasPassword: boolean;
  onSaved: (email: string) => void;
}) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function save() {
    if (next.length < 8) {
      setError("Mật khẩu mới cần ít nhất 8 ký tự.");
      return;
    }
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const b = await post<{ data?: { email?: string } }>("/auth/password", {
        email: email.trim() || undefined,
        ...(hasPassword ? { currentPassword: current } : {}),
        newPassword: next,
      });
      setDone(true);
      setCurrent("");
      setNext("");
      onSaved(b?.data?.email ?? email.trim());
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card section-gap" style={{ maxWidth: 440 }}>
      <h2 className="card-title">Đăng nhập bằng email</h2>
      <p className="muted-text">
        {hasPassword
          ? "Đổi email hoặc mật khẩu dùng để đăng nhập."
          : "Thêm email + mật khẩu để có thêm cách đăng nhập, phòng khi không nhận được mã qua điện thoại."}
      </p>
      {done && (
        <p style={{ color: "var(--brand)" }}>
          Đã lưu. Các thiết bị khác đã bị đăng xuất.
        </p>
      )}
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      <label className="muted-text" style={{ display: "block", marginTop: 12 }}>
        Email
        <input
          style={inputStyle}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          inputMode="email"
          autoComplete="email"
        />
      </label>
      {hasPassword && (
        <label
          className="muted-text"
          style={{ display: "block", marginTop: 12 }}
        >
          Mật khẩu hiện tại
          <input
            style={inputStyle}
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
          />
        </label>
      )}
      <label className="muted-text" style={{ display: "block", marginTop: 12 }}>
        Mật khẩu mới (ít nhất 8 ký tự)
        <input
          style={inputStyle}
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
        />
      </label>
      <div className="btn-row" style={{ marginTop: 16 }}>
        <button
          className="btn primary"
          disabled={busy}
          onClick={() => void save()}
        >
          {busy ? "Đang lưu…" : "Lưu"}
        </button>
      </div>
    </div>
  );
}
