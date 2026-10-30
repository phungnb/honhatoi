"use client";

/**
 * Danh bạ thành viên dòng họ (đặc tả 3.3): tìm theo tên, xem vai trò, nhắn
 * tin riêng. Chỉ hiện người đã được duyệt vào họ; số điện thoại, email
 * không hiện ở đây (riêng tư theo mặc định).
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { get, getAccessToken } from "@/lib/api";
import { apiMessage } from "@/lib/errors";
import { useLineages } from "@/lib/lineage";
import { roleLabel } from "@/lib/roles";
import DongHoTabs from "@/components/DongHoTabs";

interface Member {
  userId: string;
  role?: string;
  isOwner?: boolean;
  joinedAt?: string | null;
  user: { id: string; displayName: string };
}

function myUserId(): string {
  try {
    const t = getAccessToken() ?? "";
    return (JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as { sub?: string })
      .sub ?? "";
  } catch {
    return "";
  }
}

/** Bỏ dấu để tìm "nguyen" ra "Nguyễn". */
const fold = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

export default function ThanhVienPage() {
  const { current, loading, error } = useLineages();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [me, setMe] = useState("");

  useEffect(() => setMe(myUserId()), []);

  useEffect(() => {
    if (!current) return;
    setMembers(null);
    get<{ data?: { members?: Member[] } }>(`/lineages/${current.id}/members?limit=100`)
      .then((b) => setMembers(b?.data?.members ?? []))
      .catch((e) => {
        setErr(apiMessage(e));
        setMembers([]);
      });
  }, [current]);

  const shown = useMemo(() => {
    const k = fold(q.trim());
    const list = (members ?? []).filter((m) => !k || fold(m.user.displayName).includes(k));
    return list.sort((a, b) => a.user.displayName.localeCompare(b.user.displayName, "vi"));
  }, [members, q]);

  if (error === "unauthorized")
    return (
      <Link className="btn primary" href="/dang-nhap">
        Đăng nhập để xem thành viên dòng họ
      </Link>
    );

  if (!loading && !current)
    return (
      <p className="muted-text">
        Bạn chưa thuộc dòng họ nào. <Link href="/app">Tạo họ hoặc nhập mã mời</Link>.
      </p>
    );

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Dòng họ</h1>
        <p className="page-desc">
          {current?.name}
          {members ? ` · ${members.length} người dùng app` : ""}
        </p>
      </div>
      <DongHoTabs active="thanh-vien" />
      {err && <p style={{ color: "var(--danger)" }}>{err}</p>}
      <input
        className="field section-gap"
        style={{ maxWidth: 420 }}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tìm theo tên…"
        aria-label="Tìm thành viên theo tên"
      />
      {members === null ? (
        <p className="muted-text section-gap">Đang tải…</p>
      ) : shown.length === 0 ? (
        <p className="muted-text section-gap">Không có ai khớp “{q}”.</p>
      ) : (
        <div className="card section-gap" style={{ padding: 0 }}>
          {shown.map((m) => (
            <div key={m.userId} className="list-item thanh-vien">
              <span className="avatar" aria-hidden>
                {m.user.displayName.trim().split(/\s+/).pop()?.charAt(0).toUpperCase() ?? "?"}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong>{m.user.displayName}</strong>
                {m.userId === me && <span className="muted-text"> (bạn)</span>}
                <span className="muted-text" style={{ display: "block" }}>
                  {roleLabel(m.role, m.isOwner)}
                </span>
              </span>
              {m.userId !== me && (
                <Link className="btn" href={`/app/tin-nhan?voi=${m.userId}`}>
                  Nhắn tin
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="muted-text section-gap">
        Danh sách chỉ gồm người đã dùng app và được duyệt vào họ. Người trong cây gia phả chưa có tài khoản
        xem ở tab Gia phả.
      </p>
    </>
  );
}
