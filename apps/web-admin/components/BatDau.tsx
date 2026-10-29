"use client";

/**
 * Bắt đầu — cho người chưa thuộc dòng họ nào: tạo dòng họ mới (trở thành
 * Trưởng tộc) hoặc vào họ bằng mã mời. Mã có thể đến từ link
 * /app?ma=XXXX mà Ban quản trị gửi qua Zalo.
 */

import { useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
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

export default function BatDau({
  initialCode = "",
  onJoined,
}: {
  initialCode?: string;
  /** Gọi sau khi vào họ bằng mã thành công (vd: tải lại danh sách họ). */
  onJoined?: () => void;
}) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState("");
  const [province, setProvince] = useState("");
  const [busy, setBusy] = useState<"join" | "create" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState<string | null>(null);

  async function join() {
    if (!code.trim()) {
      setError("Nhập mã mời.");
      return;
    }
    setBusy("join");
    setError(null);
    try {
      const b = await post<{ data?: { lineage?: { name?: string } } }>(
        "/lineages/join-by-code",
        { code: code.trim() },
      );
      setJoined(b?.data?.lineage?.name ?? "dòng họ");
      onJoined?.();
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function create() {
    if (!name.trim()) {
      setError("Nhập tên dòng họ.");
      return;
    }
    setBusy("create");
    setError(null);
    try {
      const b = await post<{ data?: { lineage?: { id?: string } } }>(
        "/lineages",
        {
          name: name.trim(),
          ...(province.trim() ? { hometownProvince: province.trim() } : {}),
          visibility: "invite_only",
        },
      );
      const id = b?.data?.lineage?.id;
      if (id) router.push(`/quan-ly/${id}`);
    } catch (e) {
      setError(apiMessage(e));
      setBusy(null);
    }
  }

  if (joined)
    return (
      <div className="card section-gap" style={{ maxWidth: 560 }}>
        <p style={{ color: "var(--brand)" }}>
          Đã vào {joined}. Đang tải gia phả…
        </p>
      </div>
    );

  return (
    <>
      {error && (
        <p className="section-gap" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      <div className="card section-gap" style={{ maxWidth: 560 }}>
        <h2 className="card-title">Vào dòng họ bằng mã mời</h2>
        <p className="muted-text">
          Xin mã mời từ Trưởng tộc hoặc Ban quản trị dòng họ của bạn.
        </p>
        <label className="muted-text" style={{ display: "block", marginTop: 12 }}>
          Mã mời
          <input
            style={{ ...inputStyle, letterSpacing: 2, textTransform: "uppercase" }}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="VD: A1B2C3D4E5F6"
          />
        </label>
        <div className="btn-row" style={{ marginTop: 12 }}>
          <button
            className="btn primary"
            disabled={busy !== null}
            onClick={() => void join()}
          >
            {busy === "join" ? "Đang vào…" : "Vào dòng họ"}
          </button>
        </div>
      </div>

      <div className="card section-gap" style={{ maxWidth: 560 }}>
        <h2 className="card-title">Tạo dòng họ mới</h2>
        <p className="muted-text">
          Bạn sẽ là Trưởng tộc: dựng cây gia phả, mời con cháu, phân người
          giữ gia phả.
        </p>
        <label className="muted-text" style={{ display: "block", marginTop: 12 }}>
          Tên dòng họ
          <input
            style={inputStyle}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Họ Nguyễn Bá — chi Thanh Chương"
          />
        </label>
        <label className="muted-text" style={{ display: "block", marginTop: 12 }}>
          Quê gốc (tỉnh, không bắt buộc)
          <input
            style={inputStyle}
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            placeholder="VD: Nghệ An"
          />
        </label>
        <div className="btn-row" style={{ marginTop: 12 }}>
          <button
            className="btn primary"
            disabled={busy !== null}
            onClick={() => void create()}
          >
            {busy === "create" ? "Đang tạo…" : "Tạo dòng họ"}
          </button>
        </div>
      </div>
    </>
  );
}
