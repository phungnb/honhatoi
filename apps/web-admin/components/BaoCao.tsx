"use client";

/**
 * Nút "Báo cáo" mở form nhỏ chọn lý do, gửi POST /reports. Báo cáo về nội
 * dung trong họ đến Ban quản trị họ; người bị báo cáo không biết ai báo cáo.
 */

import { useState } from "react";
import { post } from "@/lib/api";
import { apiMessage } from "@/lib/errors";

export const LY_DO: { value: string; label: string }[] = [
  { value: "spam", label: "Spam, quảng cáo" },
  { value: "xuc_pham", label: "Xúc phạm, gây gổ" },
  { value: "sai_su_that", label: "Sai sự thật" },
  { value: "rieng_tu", label: "Lộ thông tin riêng tư" },
  { value: "lua_dao", label: "Lừa đảo" },
  { value: "khac", label: "Lý do khác" },
];

export default function BaoCao({
  targetType,
  targetId,
  label = "Báo cáo",
  onDone,
}: {
  targetType: "message" | "post" | "comment" | "user";
  targetId: string;
  label?: string;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [err, setErr] = useState<string | null>(null);

  if (state === "done") return <span className="sub">Đã gửi báo cáo. Cảm ơn bạn.</span>;
  if (!open)
    return (
      <button className="link-btn" onClick={() => setOpen(true)}>
        {label}
      </button>
    );

  async function send() {
    setState("busy");
    setErr(null);
    try {
      await post("/reports", { targetType, targetId, reason, details: details.trim() || undefined });
      setState("done");
      onDone?.();
    } catch (e) {
      setErr(apiMessage(e));
      setState("idle");
    }
  }

  return (
    <div className="bao-cao">
      <label className="sub">
        Lý do báo cáo
        <select className="field" value={reason} onChange={(e) => setReason(e.target.value)}>
          {LY_DO.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      <textarea
        className="field"
        rows={2}
        maxLength={1000}
        placeholder="Mô tả thêm (không bắt buộc)"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
      />
      {err && <p style={{ color: "var(--danger)" }}>{err}</p>}
      <div className="btn-row">
        <button className="btn primary" disabled={state === "busy"} onClick={() => void send()}>
          Gửi báo cáo
        </button>
        <button className="btn" onClick={() => setOpen(false)}>
          Hủy
        </button>
      </div>
    </div>
  );
}
