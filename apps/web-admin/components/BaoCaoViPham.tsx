"use client";

/**
 * Hàng chờ báo cáo vi phạm của một dòng họ (chỉ Ban quản trị). Gỡ nội
 * dung hoặc bỏ qua; mọi báo cáo cùng nội dung được đóng cùng lúc và ghi
 * nhật ký.
 */

import { useCallback, useEffect, useState } from "react";
import { get, post } from "@/lib/api";
import { apiMessage } from "@/lib/errors";

interface Report {
  id: string;
  targetType: string;
  reasonLabel: string;
  details: string | null;
  status: string;
  createdAt: string;
  reporterName: string | null;
  preview: string | null;
  authorName: string | null;
  targetRemoved: boolean;
}

const LOAI: Record<string, string> = {
  message: "Tin nhắn",
  post: "Bài viết",
  comment: "Bình luận",
  user: "Tài khoản",
};

const fmt = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

export default function BaoCaoViPham({ lineageId }: { lineageId: string }) {
  const [view, setView] = useState<"pending" | "done">("pending");
  const [items, setItems] = useState<Report[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const b = await get<{ data?: { reports?: Report[] } }>(`/lineages/${lineageId}/reports?status=${view}`);
      setItems(b?.data?.reports ?? []);
    } catch (e) {
      setErr(apiMessage(e));
      setItems([]);
    }
  }, [lineageId, view]);

  useEffect(() => {
    setItems(null);
    void load();
  }, [load]);

  async function handle(r: Report, action: "dismiss" | "remove") {
    setBusy(r.id);
    setErr(null);
    try {
      await post(`/lineages/${lineageId}/reports/${r.id}`, { action });
      await load();
    } catch (e) {
      setErr(apiMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="btn-row">
        <button className={`btn chip${view === "pending" ? " primary" : ""}`} onClick={() => setView("pending")}>
          Đang chờ
        </button>
        <button className={`btn chip${view === "done" ? " primary" : ""}`} onClick={() => setView("done")}>
          Đã xử lý
        </button>
      </div>
      {err && <p style={{ color: "var(--danger)" }}>{err}</p>}
      {items === null ? (
        <p className="muted-text">Đang tải…</p>
      ) : items.length === 0 ? (
        <p className="muted-text section-gap">
          {view === "pending" ? "Không có báo cáo nào đang chờ." : "Chưa có báo cáo nào được xử lý."}
        </p>
      ) : (
        <div className="list section-gap">
          {items.map((r) => (
            <div key={r.id} className="card bao-cao-item">
              <div className="bai-meta">
                <span className="badge warm">{LOAI[r.targetType] ?? r.targetType}</span>
                <strong>{r.reasonLabel}</strong>
                <span className="sub">{fmt(r.createdAt)}</span>
              </div>
              <p className="sub">
                Người đăng: {r.authorName ?? "không rõ"} · Người báo cáo: {r.reporterName ?? "đã xóa tài khoản"}
              </p>
              <blockquote className="trich-dan">
                {r.targetRemoved ? <em>Nội dung đã được gỡ hoặc thu hồi</em> : r.preview || <em>(không có chữ)</em>}
              </blockquote>
              {r.details && <p>Ghi chú: {r.details}</p>}
              {view === "pending" ? (
                <div className="btn-row">
                  {!r.targetRemoved && r.targetType !== "user" && (
                    <button className="btn danger-outline" disabled={busy === r.id} onClick={() => void handle(r, "remove")}>
                      Gỡ nội dung
                    </button>
                  )}
                  <button className="btn" disabled={busy === r.id} onClick={() => void handle(r, "dismiss")}>
                    Bỏ qua
                  </button>
                </div>
              ) : (
                <p className="sub">{r.status === "resolved" ? "Đã gỡ nội dung" : "Đã bỏ qua"}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
