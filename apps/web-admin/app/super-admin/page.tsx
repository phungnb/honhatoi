"use client";

/**
 * Cổng Quản trị Nền tảng (Luồng 1 theo đánh giá chuyên gia 27/10/2026):
 * /super-admin — cùng 1 domain với /app và /quan-ly, chung 1 lần đăng
 * nhập. Chỉ tài khoản có cờ users.is_platform_admin mới xem được danh sách
 * toàn bộ dòng họ; tài khoản thường nhận 403 kèm lý do rõ ràng.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { get } from "@/lib/api";

interface AdminLineage {
  id: string;
  name: string;
  visibility: string;
  createdAt: string;
  _count: { memberships: number; persons: number };
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export default function SuperAdminPage() {
  const [lineages, setLineages] = useState<AdminLineage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const body = await get<{ data?: { lineages?: AdminLineage[] } }>(
          "/admin/lineages",
        );
        setLineages(body?.data?.lineages ?? []);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "lỗi không xác định";
        setError(
          msg.includes("API 401")
            ? "unauthorized"
            : msg.includes("API 403")
              ? "forbidden"
              : `Không tải được danh sách dòng họ: ${msg}`,
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Quản trị nền tảng</h1>
        <p className="page-desc">
          Danh sách toàn bộ dòng họ trên hệ thống — chỉ dành cho đội ngũ
          vận hành nền tảng Họ Nhà Tôi.
        </p>
      </div>

      {error === "unauthorized" && (
        <div>
          <p className="muted-text">
            Bạn chưa đăng nhập. Đăng nhập một lần là dùng chung cho cả ba
            luồng.
          </p>
          <Link className="btn primary" href="/dang-nhap">
            Đăng nhập
          </Link>
        </div>
      )}

      {error === "forbidden" && (
        <div className="card">
          <p>
            Tài khoản này chưa có quyền quản trị nền tảng. Quyền super
            admin chỉ được bật trực tiếp trong cơ sở dữ liệu
            (users.is_platform_admin) bởi người vận hành hệ thống — không
            có cách tự nâng quyền từ giao diện.
          </p>
        </div>
      )}

      {error && error !== "unauthorized" && error !== "forbidden" && (
        <div className="card">
          <span style={{ color: "#ff6b6b" }}>{error}</span>
        </div>
      )}

      {loading ? (
        <p className="muted-text">Đang tải…</p>
      ) : (
        !error && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Dòng họ</th>
                  <th>Chế độ</th>
                  <th>Thành viên</th>
                  <th>Hồ sơ gia phả</th>
                  <th>Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {lineages.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <Link href={`/quan-ly/${l.id}`}>
                        {l.name}
                      </Link>
                    </td>
                    <td style={{ color: "var(--muted)" }}>{l.visibility}</td>
                    <td>{l._count.memberships}</td>
                    <td>{l._count.persons}</td>
                    <td style={{ color: "var(--muted)" }}>
                      {fmtDate(l.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {lineages.length === 0 && (
              <p className="muted-text">Chưa có dòng họ nào trên hệ thống.</p>
            )}
          </div>
        )
      )}
    </>
  );
}
