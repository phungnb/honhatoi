"use client";

/**
 * Cổng Ban Trị sự — Duyệt xác minh gia phả (Luồng 2 theo đánh giá chuyên
 * gia 27/10/2026).
 *
 * Nối API backend thật:
 * - GET /lineages: chọn dòng họ mình quản trị.
 * - GET /genealogy/lineages/:id/proposals?status=pending|approved|rejected
 * - POST /genealogy/proposals/:id/approve | /reject (kèm ghi chú duyệt;
 *   từ chối bắt buộc có lý do giải thích).
 * - Diff View: với đề xuất sửa hồ sơ, so sánh trực quan từng trường
 *   (thông tin cũ bên trái, thông tin mới bên phải).
 * Sau khi duyệt, backend tự gửi thông báo cho toàn bộ thành viên của họ.
 * - Dùng bên trong cổng /quan-ly/[lineageId] (họ khóa theo URL); vẫn
 *   hỗ trợ chế độ chọn họ từ dropdown khi không truyền lockedLineageId.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { get, post } from "@/lib/api";

type ProposalPayload = {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
} & Record<string, unknown>;

interface Proposal {
  id: string;
  lineageId: string;
  personId?: string | null;
  requestType: string;
  payload: ProposalPayload;
  reason?: string | null;
  reviewNote?: string | null;
  status: string;
  requestedBy: string;
  requester?: { id: string; displayName?: string | null };
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

interface Lineage {
  id: string;
  name: string;
  role?: string;
}

type Tab = "pending" | "approved" | "rejected";

const TABS: { key: Tab; label: string }[] = [
  { key: "pending", label: "Chờ duyệt" },
  { key: "approved", label: "Đã duyệt" },
  { key: "rejected", label: "Đã từ chối" },
];

const TYPE_LABEL: Record<string, string> = {
  create_person: "Thêm thành viên",
  update_person: "Sửa hồ sơ",
  delete_person: "Xóa thành viên",
  create_relationship: "Thêm quan hệ",
  delete_relationship: "Xóa quan hệ",
};

const FIELD_LABEL: Record<string, string> = {
  fullName: "Họ tên",
  nickname: "Tên gọi",
  gender: "Giới tính",
  dateOfBirth: "Ngày sinh",
  birthYearOnly: "Chỉ nhớ năm",
  dateOfDeath: "Ngày mất",
  hometown: "Quê quán",
  burialPlace: "Phần mộ",
  generation: "Đời",
  branch: "Chi",
  bio: "Ghi chú",
  currentPlace: "Nơi ở hiện tại",
  occupation: "Nghề nghiệp",
  education: "Học vấn",
  roleInLineage: "Vai trò trong họ",
  hobbies: "Sở thích",
  phone: "Điện thoại",
  email: "Email",
};

const REL_LABEL: Record<string, string> = {
  parent: "Cha/Mẹ",
  child: "Con",
  spouse: "Vợ/Chồng",
  adoptive_parent: "Cha/Mẹ nuôi",
  adoptive_child: "Con nuôi",
  ex_spouse: "Vợ/Chồng cũ",
};

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime()))
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  }
  if (value === "male") return "Nam";
  if (value === "female") return "Nữ";
  return String(value);
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function personName(p: Proposal): string {
  const after = p.payload?.after ?? {};
  const before = p.payload?.before ?? {};
  const name = after["fullName"] ?? before["fullName"];
  return typeof name === "string" && name ? name : "—";
}

/** So sánh trước/sau: chỉ giữ các trường thay đổi, theo thứ tự nhãn. */
function diffRows(p: Proposal): { field: string; old: unknown; next: unknown }[] {
  const before = p.payload?.before ?? {};
  const after = p.payload?.after ?? {};
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  return keys
    .filter((k) => FIELD_LABEL[k] && before[k] !== after[k])
    .map((k) => ({ field: FIELD_LABEL[k], old: before[k], next: after[k] }));
}

function snapshotRows(
  snap: Record<string, unknown>,
): { field: string; value: unknown }[] {
  return Object.keys(snap)
    .filter((k) => FIELD_LABEL[k])
    .map((k) => ({ field: FIELD_LABEL[k], value: snap[k] }));
}

export default function DuyetXacMinh({
  lockedLineageId,
  embedded = false,
}: {
  lockedLineageId?: string;
  /** Nằm trong cổng /quan-ly: ẩn tiêu đề trang và tên họ (đã có ở trên). */
  embedded?: boolean;
}) {
  const [lineages, setLineages] = useState<Lineage[]>([]);
  const [lineageId, setLineageId] = useState(lockedLineageId ?? "");
  const [tab, setTab] = useState<Tab>("pending");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadProposals = useCallback(async (lid: string, t: Tab) => {
    setLoading(true);
    setError(null);
    try {
      const body = await get<{ data?: { proposals?: Proposal[] } }>(
        `/genealogy/lineages/${lid}/proposals?status=${t}`,
      );
      setProposals(body?.data?.proposals ?? []);
    } catch (e) {
      setError(
        e instanceof Error && e.message.includes("API 401")
          ? "unauthorized"
          : `Không tải được danh sách đề xuất: ${e instanceof Error ? e.message : "lỗi không xác định"}`,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const body = await get<{ data?: { lineages?: Lineage[] } }>("/lineages");
        const list = body?.data?.lineages ?? [];
        setLineages(list);
        if (lockedLineageId) {
          // Họ đã khóa từ URL — chỉ dùng danh sách để hiển thị tên họ.
        } else if (list.length > 0) setLineageId(list[0].id);
        else setLoading(false);
      } catch (e) {
        setError(
          e instanceof Error && e.message.includes("API 401")
            ? "unauthorized"
            : `Không tải được danh sách dòng họ: ${e instanceof Error ? e.message : "lỗi không xác định"}`,
        );
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (lineageId) void loadProposals(lineageId, tab);
  }, [lineageId, tab, loadProposals]);

  const selected = proposals.find((p) => p.id === selectedId) ?? null;

  async function submitReview() {
    if (!selected || !action) return;
    if (action === "reject" && note.trim() === "") {
      setError("Từ chối cần kèm lý do giải thích cho người đề xuất.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await post(`/genealogy/proposals/${selected.id}/${action}`, {
        note: note.trim() || undefined,
      });
      setNotice(
        action === "approve"
          ? "Đã duyệt — cây gia phả đã cập nhật và toàn thể thành viên của họ đã nhận thông báo."
          : "Đã từ chối kèm lý do.",
      );
      setAction(null);
      setNote("");
      setSelectedId(null);
      await loadProposals(lineageId, tab);
    } catch (e) {
      setError(
        `Xử lý thất bại: ${e instanceof Error ? e.message : "lỗi không xác định"}`,
      );
    } finally {
      setBusy(false);
    }
  }

  if (error === "unauthorized") {
    return (
      <>
        <div className="page-head">
          <h1 className="page-title">Duyệt xác minh gia phả</h1>
          <p className="page-desc">
            Bạn chưa đăng nhập. Hãy đăng nhập bằng số điện thoại để vào cổng
            Ban Trị sự.
          </p>
        </div>
        <Link className="btn primary" href="/dang-nhap">
          Đăng nhập
        </Link>
      </>
    );
  }

  return (
    <>
      {!embedded && (
        <div className="page-head">
          <h1 className="page-title">Duyệt xác minh gia phả</h1>
          <p className="page-desc">
            Xét duyệt các đề xuất thêm hoặc sửa thành viên trong cây gia phả.
            Đề xuất được duyệt mới cập nhật vào cơ sở dữ liệu; đề xuất bị từ
            chối phải kèm lý do giải thích.
          </p>
        </div>
      )}

      {notice && (
        <div className="card section-gap">
          <span style={{ color: "var(--brand)" }}>{notice}</span>
        </div>
      )}
      {error && error !== "unauthorized" && (
        <div className="card section-gap">
          <span style={{ color: "var(--danger)" }}>{error}</span>
        </div>
      )}

      <div className="btn-row section-gap" style={{ flexWrap: "wrap" }}>
        {embedded ? null : lockedLineageId ? (
          <p className="muted-text">
            Dòng họ:{" "}
            <strong style={{ color: "var(--text)" }}>
              {lineages.find((l) => l.id === lockedLineageId)?.name ??
                lockedLineageId}
            </strong>
          </p>
        ) : (
          <label className="muted-text">
            Dòng họ{" "}
            <select
              value={lineageId}
              onChange={(e) => {
                setLineageId(e.target.value);
                setSelectedId(null);
                setAction(null);
              }}
              style={{
                background: "var(--surface)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "8px 12px",
                marginLeft: 8,
              }}
            >
              {lineages.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                  {l.role ? ` — ${l.role}` : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="btn-row">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`btn${tab === t.key ? " primary" : ""}`}
              onClick={() => {
                setTab(t.key);
                setSelectedId(null);
                setAction(null);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="muted-text">Đang tải…</p>
      ) : proposals.length === 0 ? (
        <p className="muted-text">
          {lockedLineageId
            ? "Không có đề xuất nào trong mục này."
            : lineages.length === 0
              ? "Bạn chưa tham gia dòng họ nào, hoặc chưa có quyền quản trị."
              : "Không có đề xuất nào trong mục này."}
        </p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Loại</th>
                <th>Thành viên</th>
                <th>Người đề xuất</th>
                <th>Thời gian</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => {
                    setSelectedId(p.id);
                    setAction(null);
                    setNote("");
                  }}
                  style={{
                    cursor: "pointer",
                    background:
                      selectedId === p.id ? "var(--surface-2)" : undefined,
                  }}
                >
                  <td>
                    <span className="badge info">
                      {TYPE_LABEL[p.requestType] ?? p.requestType}
                    </span>
                  </td>
                  <td>{personName(p)}</td>
                  <td>{p.requester?.displayName ?? "—"}</td>
                  <td style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>
                    {fmtDateTime(p.createdAt)}
                  </td>
                  <td>
                    <span
                      className={`badge ${p.status === "pending" ? "warm" : p.status === "approved" ? "brand" : "danger"}`}
                    >
                      {p.status === "pending"
                        ? "Chờ duyệt"
                        : p.status === "approved"
                          ? "Đã duyệt"
                          : "Đã từ chối"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="card section-gap">
          <h2 className="card-title">
            {TYPE_LABEL[selected.requestType] ?? selected.requestType} —{" "}
            {personName(selected)}
          </h2>
          <p className="muted-text">
            Người đề xuất: {selected.requester?.displayName ?? "—"} ·{" "}
            {fmtDateTime(selected.createdAt)}
          </p>
          {selected.reason && (
            <p>
              <strong>Lý do đề xuất: </strong>
              {selected.reason}
            </p>
          )}

          {selected.requestType === "update_person" &&
            (diffRows(selected).length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Trường</th>
                      <th>Thông tin cũ</th>
                      <th>Thông tin mới</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diffRows(selected).map((r) => (
                      <tr key={r.field}>
                        <td>{r.field}</td>
                        <td style={{ color: "var(--muted)" }}>{fmt(r.old)}</td>
                        <td style={{ color: "var(--brand)" }}>{fmt(r.next)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted-text">
                Đề xuất này không thay đổi trường nào hiển thị được.
              </p>
            ))}

          {selected.requestType === "create_person" && (
            <div className="table-wrap">
              <table>
                <tbody>
                  {snapshotRows(selected.payload?.after ?? {}).map((r) => (
                    <tr key={r.field}>
                      <td>{r.field}</td>
                      <td>{fmt(r.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selected.requestType === "delete_person" && (
            <p>
              Sẽ xóa thành viên:{" "}
              <strong>{personName(selected)}</strong> (xóa mềm, quan hệ liên
              quan cũng bị gỡ).
            </p>
          )}

          {(selected.requestType === "create_relationship" ||
            selected.requestType === "delete_relationship") && (
            <p>
              Quan hệ:{" "}
              <strong>
                {REL_LABEL[String(selected.payload?.["relationshipType"] ?? "")] ??
                  String(selected.payload?.["relationshipType"] ?? "—")}
              </strong>
            </p>
          )}

          {selected.status !== "pending" && selected.reviewNote && (
            <p>
              <strong>
                {selected.status === "approved"
                  ? "Ghi chú duyệt: "
                  : "Lý do từ chối: "}
              </strong>
              {selected.reviewNote}
            </p>
          )}

          {selected.status === "pending" && (
            <>
              <div className="btn-row section-gap">
                <button
                  className="btn primary"
                  onClick={() => setAction("approve")}
                >
                  Duyệt
                </button>
                <button
                  className="btn danger-outline"
                  onClick={() => setAction("reject")}
                >
                  Từ chối
                </button>
              </div>
              {action && (
                <div className="section-gap">
                  <label className="muted-text">
                    {action === "reject"
                      ? "Lý do từ chối (bắt buộc):"
                      : "Ghi chú duyệt (không bắt buộc):"}
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      style={{
                        display: "block",
                        width: "100%",
                        marginTop: 8,
                        background: "var(--surface)",
                        color: "var(--text)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: "8px 12px",
                      }}
                    />
                  </label>
                  <div className="btn-row" style={{ marginTop: 12 }}>
                    <button
                      className="btn primary"
                      disabled={busy}
                      onClick={() => void submitReview()}
                    >
                      {busy
                        ? "Đang xử lý…"
                        : action === "approve"
                          ? "Xác nhận duyệt"
                          : "Xác nhận từ chối"}
                    </button>
                    <button
                      className="btn"
                      onClick={() => {
                        setAction(null);
                        setNote("");
                      }}
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <p className="muted-text section-gap">
        Ghi chú: mọi lượt duyệt hoặc từ chối đều được ghi vào nhật ký kiểm
        toán cùng người thực hiện và thời gian. Đề xuất được duyệt sẽ tự động
        gửi thông báo cho toàn thể thành viên của dòng họ.
      </p>
    </>
  );
}
