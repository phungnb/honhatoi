"use client";

/**
 * Xóa tài khoản (App Store / Google Play bắt buộc có trong app). Phải gõ
 * XOA để xác nhận. Trưởng tộc của họ còn thành viên phải chuyển quyền trước
 * (API trả OWNS_LINEAGE, hiện nguyên lời nhắn).
 */

import { useState } from "react";
import { clearTokens, del } from "@/lib/api";
import { apiMessage } from "@/lib/errors";

export default function XoaTaiKhoan() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await del("/auth/me");
      clearTokens();
      window.location.href = "/app";
    } catch (e) {
      setError(apiMessage(e));
      setBusy(false);
    }
  }

  return (
    <div className="card section-gap" style={{ maxWidth: 560 }}>
      <h2 className="card-title">Xóa tài khoản</h2>
      {!open ? (
        <>
          <p className="muted-text">
            Xóa vĩnh viễn thông tin đăng nhập và thông tin cá nhân của bạn, rời
            mọi dòng họ. Người trong cây gia phả do dòng họ quản lý nên vẫn giữ.
          </p>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button className="btn danger-outline" onClick={() => setOpen(true)}>
              Xóa tài khoản…
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="muted-text">
            Không thể hoàn tác. Số điện thoại, email, mật khẩu, liên kết Google
            bị xóa; bạn bị đăng xuất trên mọi máy; tin nhắn đã gửi hiện tên
            &quot;Người dùng đã xóa&quot;. Gõ <strong>XOA</strong> để xác nhận.
          </p>
          <input
            className="field"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="XOA"
            autoCapitalize="characters"
          />
          {error && <p style={{ color: "var(--danger)", marginTop: 8 }}>{error}</p>}
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button
              className="btn danger-outline"
              disabled={busy || text.trim().toUpperCase() !== "XOA"}
              onClick={() => void remove()}
            >
              {busy ? "Đang xóa…" : "Xóa vĩnh viễn"}
            </button>
            <button className="btn" onClick={() => { setOpen(false); setText(""); setError(null); }}>
              Thôi
            </button>
          </div>
        </>
      )}
    </div>
  );
}
