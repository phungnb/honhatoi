"use client";

/**
 * Hồ sơ một người trong cây — bảng trượt từ dưới lên trên điện thoại,
 * hộp giữa màn hình trên máy tính. Số điện thoại/email chỉ hiện với người
 * có quyền sửa gia phả (backend đã ẩn sẵn).
 */

import { useEffect, useState } from "react";
import { get } from "@/lib/api";
import { apiMessage } from "@/lib/errors";

interface Person {
  id: string;
  fullName: string;
  nickname?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  birthYearOnly?: boolean;
  dateOfDeath?: string | null;
  burialPlace?: string | null;
  hometown?: string | null;
  currentPlace?: string | null;
  occupation?: string | null;
  generation?: number | null;
  branch?: string | null;
  roleInLineage?: string | null;
  bio?: string | null;
  phone?: string | null;
  email?: string | null;
}

function fmtDate(iso?: string | null, yearOnly?: boolean): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return yearOnly ? y : `${d}/${m}/${y}`;
}

export default function HoSoNguoi({
  personId,
  demo = false,
  onClose,
}: {
  personId: string;
  demo?: boolean;
  onClose: () => void;
}) {
  const [p, setP] = useState<Person | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setP(null);
    setError(null);
    get<{ data?: { person?: Person } }>(
      demo ? `/demo/persons/${personId}` : `/genealogy/persons/${personId}`,
    )
      .then((b) => setP(b?.data?.person ?? null))
      .catch((e) => setError(apiMessage(e)));
  }, [personId, demo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rows: [string, string | null | undefined][] = p
    ? [
        ["Tên thường gọi", p.nickname],
        ["Giới tính", p.gender === "female" ? "Nữ" : p.gender === "male" ? "Nam" : null],
        ["Đời", p.generation ? `Đời thứ ${p.generation}` : null],
        ["Chi", p.branch],
        ["Vai trò trong họ", p.roleInLineage],
        ["Sinh", fmtDate(p.dateOfBirth, p.birthYearOnly)],
        ["Mất", fmtDate(p.dateOfDeath)],
        ["Phần mộ", p.burialPlace],
        ["Quê quán", p.hometown],
        ["Nơi ở", p.currentPlace],
        ["Nghề nghiệp", p.occupation],
        ["Điện thoại", p.phone],
        ["Email", p.email],
      ]
    : [];

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
        {!p && !error && <p className="muted-text">Đang tải…</p>}
        {p && (
          <>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div
                className={`avatar${p.gender === "female" ? " female" : ""}${p.dateOfDeath ? " dead" : ""}`}
                style={{ width: 52, height: 52, fontSize: 20 }}
              >
                {p.fullName.trim().split(/\s+/).pop()?.[0] ?? "?"}
              </div>
              <div className="grow">
                <h2 style={{ fontSize: 20 }}>{p.fullName}</h2>
                <span className={`badge ${p.dateOfDeath ? "warm" : "brand"}`}>
                  {p.dateOfDeath ? "Đã mất" : "Đang sống"}
                </span>
              </div>
            </div>
            <dl className="kv">
              {rows
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} style={{ display: "contents" }}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
            </dl>
            {p.bio && (
              <p style={{ marginTop: 12, whiteSpace: "pre-line" }}>{p.bio}</p>
            )}
          </>
        )}
        <div className="btn-row" style={{ marginTop: 16 }}>
          <button className="btn" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
