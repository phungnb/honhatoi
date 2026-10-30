"use client";

/** Đổi tên hiển thị (tên người trong họ thấy ở tin nhắn, danh sách thành viên). */

import { useEffect, useState } from "react";
import { get, patch } from "@/lib/api";
import { apiMessage } from "@/lib/errors";

export default function DoiTen() {
  const [name, setName] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    get<{ data?: { user?: { displayName?: string } } }>("/auth/me")
      .then((b) => {
        const n = b?.data?.user?.displayName ?? "";
        setName(n);
        setSaved(n);
      })
      .catch(() => undefined);
  }, []);

  async function save() {
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      await patch("/auth/me", { displayName: name.trim() });
      setSaved(name.trim());
      setMsg("Đã đổi tên.");
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card section-gap" style={{ maxWidth: 440 }}>
      <h2 className="card-title">Tên hiển thị</h2>
      <input
        className="field"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={100}
        placeholder="VD: Nguyễn Văn An"
        style={{ marginTop: 0 }}
      />
      {msg && <p style={{ color: "var(--brand)", marginTop: 8 }}>{msg}</p>}
      {error && <p style={{ color: "var(--danger)", marginTop: 8 }}>{error}</p>}
      <div className="btn-row" style={{ marginTop: 12 }}>
        <button
          className="btn primary"
          disabled={busy || !name.trim() || name.trim() === saved}
          onClick={() => void save()}
        >
          {busy ? "Đang lưu…" : "Lưu tên"}
        </button>
      </div>
    </div>
  );
}
