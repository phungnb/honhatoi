"use client";

/**
 * Hỏi lại đồng ý khi tài khoản chưa đồng ý phiên bản Điều khoản + Chính sách
 * hiện tại (tài khoản cũ, hoặc chính sách vừa đổi). Không đồng ý thì đăng xuất.
 */

import { useState } from "react";
import Link from "next/link";
import { clearTokens, post } from "@/lib/api";
import { apiMessage } from "@/lib/errors";
import { SITE } from "@/lib/site";

export default function HoiDongY({ onDone }: { onDone: () => void }) {
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      await post("/auth/consent", { version: SITE.policyVersion });
      onDone();
    } catch (e) {
      setError(apiMessage(e));
      setBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label="Đồng ý điều khoản">
      <div className="sheet">
        <h2 className="card-title">Điều khoản và quyền riêng tư</h2>
        <p className="muted-text" style={{ marginBottom: 16 }}>
          Họ Nhà Tôi đã cập nhật Điều khoản sử dụng và Chính sách quyền riêng tư theo Luật Bảo vệ
          dữ liệu cá nhân 2025. Vui lòng đọc và xác nhận để tiếp tục.
        </p>
        <label className="dong-y">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>
            Tôi đã đọc và đồng ý với <Link href="/dieu-khoan">Điều khoản sử dụng</Link> và{" "}
            <Link href="/quyen-rieng-tu">Chính sách quyền riêng tư</Link>, gồm việc lưu dữ liệu tại
            Singapore.
          </span>
        </label>
        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
        <div className="btn-row">
          <button className="btn primary" disabled={!agreed || busy} onClick={() => void accept()}>
            {busy ? "Đang lưu…" : "Đồng ý và tiếp tục"}
          </button>
          <button
            className="btn"
            onClick={() => {
              clearTokens();
              window.location.href = "/app";
            }}
          >
            Không đồng ý, đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
}
