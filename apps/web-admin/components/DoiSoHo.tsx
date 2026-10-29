"use client";

/**
 * Quản trị nền tảng hỗ trợ tài khoản: đổi số hộ người mất số cũ, đặt lại
 * mật khẩu cho người quên (chưa có dịch vụ gửi email).
 * Người vận hành phải tự xác minh danh tính ngoài hệ thống trước; lý do
 * được ghi vào nhật ký. Tài khoản bị đăng xuất khỏi mọi thiết bị.
 */

import { useState } from "react";
import type { CSSProperties } from "react";
import { get, post } from "@/lib/api";
import { apiMessage } from "@/lib/errors";

interface FoundUser {
  id: string;
  phone: string | null;
  email: string | null;
  displayName: string;
  status: string;
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

export default function DoiSoHo() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<FoundUser[] | null>(null);
  const [target, setTarget] = useState<FoundUser | null>(null);
  const [newPhone, setNewPhone] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function search() {
    setBusy(true);
    setError(null);
    setDone(null);
    setTarget(null);
    try {
      const b = await get<{ data?: { users?: FoundUser[] } }>(
        `/admin/users?q=${encodeURIComponent(query.trim())}`,
      );
      setUsers(b?.data?.users ?? []);
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function change() {
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      await post(`/admin/users/${target.id}/phone`, {
        phone: newPhone.trim(),
        reason: reason.trim(),
      });
      setDone(
        `Đã đổi số của ${target.displayName} sang ${newPhone.trim()}.`,
      );
      setTarget(null);
      setUsers(null);
      setNewPhone("");
      setReason("");
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      const b = await post<{ data?: { tempPassword?: string } }>(
        `/admin/users/${target.id}/password-reset`,
        { reason: reason.trim() },
      );
      setDone(
        `Mật khẩu tạm của ${target.displayName} (${target.email}): ${b?.data?.tempPassword}. Chỉ hiện một lần — chuyển cho người dùng và nhắc họ đổi ngay trong Tài khoản.`,
      );
      setTarget(null);
      setUsers(null);
      setReason("");
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card section-gap" style={{ maxWidth: 560 }}>
      <h2 className="card-title">Hỗ trợ tài khoản</h2>
      <p className="muted-text">
        Đổi số cho người mất số cũ, hoặc đặt lại mật khẩu cho người quên.
        Chỉ làm sau khi đã xác minh danh tính (gọi video, đối chiếu CCCD…).
        Tài khoản giữ nguyên vai trò, bị đăng xuất khỏi mọi thiết bị.
      </p>
      {done && <p style={{ color: "var(--brand)" }}>{done}</p>}
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

      <label className="muted-text" style={{ display: "block", marginTop: 12 }}>
        Email, hoặc ít nhất 6 số cuối của số điện thoại
        <input
          style={inputStyle}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="btn-row" style={{ marginTop: 12 }}>
        <button className="btn" disabled={busy} onClick={() => void search()}>
          Tìm tài khoản
        </button>
      </div>

      {users && users.length === 0 && (
        <p className="muted-text" style={{ marginTop: 12 }}>
          Không tìm thấy tài khoản nào.
        </p>
      )}
      {users && users.length > 0 && !target && (
        <div className="btn-row" style={{ marginTop: 12, flexWrap: "wrap" }}>
          {users.map((u) => (
            <button key={u.id} className="btn" onClick={() => setTarget(u)}>
              {u.displayName} · {u.phone ?? u.email ?? "—"}
            </button>
          ))}
        </div>
      )}

      {target && (
        <>
          <p style={{ marginTop: 12 }}>
            <strong>{target.displayName}</strong> · số{" "}
            {target.phone ?? "chưa có"} · email {target.email ?? "chưa có"}
          </p>
          <label className="muted-text" style={{ display: "block", marginTop: 12 }}>
            Số mới (chỉ khi đổi số)
            <input
              style={inputStyle}
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              inputMode="tel"
            />
          </label>
          <label className="muted-text" style={{ display: "block", marginTop: 12 }}>
            Đã xác minh bằng cách nào (ghi vào nhật ký)
            <input
              style={inputStyle}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: gọi video, đối chiếu CCCD"
            />
          </label>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button
              className="btn primary"
              disabled={busy || !newPhone.trim() || !reason.trim()}
              onClick={() => void change()}
            >
              Đổi số
            </button>
            {target.email && (
              <button
                className="btn"
                disabled={busy || !reason.trim()}
                onClick={() => void resetPassword()}
              >
                Đặt lại mật khẩu
              </button>
            )}
            <button className="btn" onClick={() => setTarget(null)}>
              Hủy
            </button>
          </div>
        </>
      )}
    </div>
  );
}
