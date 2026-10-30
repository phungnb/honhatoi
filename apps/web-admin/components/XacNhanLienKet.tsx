"use client";

/**
 * Hàng chờ "Đây là tôi": thành viên báo mình là một người trong cây.
 * Người giữ gia phả / Ban quản trị xác nhận hoặc từ chối. Ẩn hẳn khi
 * không có yêu cầu nào.
 */

import { useCallback, useEffect, useState } from "react";
import { get, post } from "@/lib/api";
import { apiMessage } from "@/lib/errors";

interface Claim {
  id: string;
  createdAt: string;
  user: { displayName: string };
  person: { fullName: string; dateOfBirth?: string | null; generation?: number | null };
}

export default function XacNhanLienKet({ lineageId }: { lineageId: string }) {
  const [items, setItems] = useState<Claim[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const b = await get<{ data?: { claims?: Claim[] } }>(`/genealogy/lineages/${lineageId}/claims`);
      setItems(b?.data?.claims ?? []);
    } catch {
      setItems([]);
    }
  }, [lineageId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function review(c: Claim, approve: boolean) {
    setBusy(c.id);
    setErr(null);
    try {
      await post(`/genealogy/claims/${c.id}/${approve ? "approve" : "reject"}`, {});
      await load();
    } catch (e) {
      setErr(apiMessage(e));
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) return null;
  return (
    <section className="card section-gap">
      <h2 className="card-title">Xác nhận tài khoản ({items.length})</h2>
      <p className="sub">Thành viên báo mình là người trong cây. Xác nhận đúng người trước khi đồng ý.</p>
      {err && <p style={{ color: "var(--danger)" }}>{err}</p>}
      <div className="list" style={{ marginTop: 8 }}>
        {items.map((c) => (
          <div key={c.id} className="list-item lien-ket">
            <span className="grow">
              <strong>{c.user.displayName}</strong> báo là <strong>{c.person.fullName}</strong>
              <span className="sub" style={{ display: "block" }}>
                {c.person.dateOfBirth ? `Sinh ${c.person.dateOfBirth.slice(0, 4)}` : "Chưa có năm sinh"}
                {c.person.generation ? ` · đời ${c.person.generation}` : ""}
              </span>
            </span>
            <button className="btn primary" disabled={busy === c.id} onClick={() => void review(c, true)}>
              Xác nhận
            </button>
            <button className="btn" disabled={busy === c.id} onClick={() => void review(c, false)}>
              Từ chối
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
