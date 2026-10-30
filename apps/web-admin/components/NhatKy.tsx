"use client";

/** Nhật ký thao tác của dòng họ (chỉ Ban quản trị): ai làm gì, lúc nào. */

import { useCallback, useEffect, useState } from "react";
import { get } from "@/lib/api";
import { apiMessage } from "@/lib/errors";

interface Log {
  id: string;
  action: string;
  actorName: string | null;
  targetName: string | null;
  createdAt: string;
}

const ACTION: Record<string, string> = {
  "lineage.create": "tạo dòng họ",
  "lineage.update": "sửa thông tin dòng họ",
  "lineage.delete": "xóa dòng họ",
  "lineage.member.approve": "duyệt thành viên vào họ",
  "lineage.member.join_by_code": "vào họ bằng mã mời",
  "lineage.member.remove": "mời thành viên rời họ",
  "lineage.owner.transfer": "chuyển quyền Trưởng tộc",
  "genealogy.person.create": "thêm người vào cây",
  "genealogy.person.update": "sửa hồ sơ",
  "genealogy.person.delete": "xóa người khỏi cây",
  "genealogy.relationship.create": "thêm quan hệ",
  "genealogy.relationship.delete": "xóa quan hệ",
  "genealogy.change.approve": "duyệt đề xuất gia phả",
  "genealogy.change.reject": "từ chối đề xuất gia phả",
  "genealogy.change.dispute": "đánh dấu đề xuất cần bàn lại",
  "genealogy.link.request": "nhận hồ sơ là mình",
  "genealogy.link.approved": "xác nhận tài khoản cho hồ sơ",
  "genealogy.link.rejected": "từ chối nhận hồ sơ",
  "genealogy.link.remove": "gỡ liên kết tài khoản",
  "genealogy.export": "xuất dữ liệu gia phả",
  "post.remove": "gỡ bài viết",
  "report.resolved": "gỡ nội dung bị báo cáo",
  "report.dismissed": "bỏ qua báo cáo",
};

const fmt = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

export default function NhatKy({ lineageId }: { lineageId: string }) {
  const [logs, setLogs] = useState<Log[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(
    async (before?: string) => {
      try {
        const b = await get<{ data?: { logs?: Log[]; next_before?: string | null } }>(
          `/lineages/${lineageId}/audit-logs${before ? `?before=${encodeURIComponent(before)}` : ""}`,
        );
        const page = b?.data?.logs ?? [];
        setLogs((old) => (before ? [...(old ?? []), ...page] : page));
        setNext(b?.data?.next_before ?? null);
      } catch (e) {
        setErr(apiMessage(e));
        setLogs((old) => old ?? []);
      }
    },
    [lineageId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <p className="sub">Mọi thao tác quan trọng trong họ được ghi lại, không ai sửa hay xóa được.</p>
      {err && <p style={{ color: "var(--danger)" }}>{err}</p>}
      {logs === null ? (
        <p className="muted-text">Đang tải…</p>
      ) : logs.length === 0 ? (
        <p className="muted-text">Chưa có thao tác nào được ghi.</p>
      ) : (
        <ul className="nhat-ky">
          {logs.map((l) => (
            <li key={l.id}>
              <span className="sub">{fmt(l.createdAt)}</span>
              <span>
                <strong>{l.actorName ?? "Hệ thống"}</strong> {ACTION[l.action] ?? l.action}
                {l.targetName ? `: ${l.targetName}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
      {next && (
        <button className="btn section-gap" onClick={() => void load(next)}>
          Xem cũ hơn
        </button>
      )}
    </>
  );
}
