"use client";

/**
 * /quan-ly — cổng duy nhất cho người quản lý dòng họ. Liệt kê các họ mà
 * bạn là Người giữ gia phả / Ban quản trị / Trưởng tộc; chỉ có một họ thì
 * vào thẳng họ đó.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { get } from "@/lib/api";
import { MyLineage, canManageLineage, roleLabel } from "@/lib/roles";

export default function QuanLyPage() {
  const router = useRouter();
  const [list, setList] = useState<MyLineage[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "unauthorized" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const body = await get<{ data?: { lineages?: MyLineage[] } }>("/lineages?limit=100");
        const managed = (body?.data?.lineages ?? []).filter(canManageLineage);
        if (managed.length === 1) {
          router.replace(`/quan-ly/${managed[0].id}`);
          return;
        }
        setList(managed);
        setState("ready");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "lỗi không xác định";
        if (msg.includes("API 401")) setState("unauthorized");
        else {
          setError(msg);
          setState("error");
        }
      }
    })();
  }, [router]);

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Quản lý dòng họ</h1>
        <p className="page-desc">
          Duyệt đề xuất gia phả, duyệt người vào họ, phân vai trò và tạo mã mời.
        </p>
      </div>
      {state === "loading" && <p className="muted-text">Đang tải…</p>}
      {state === "unauthorized" && (
        <Link className="btn primary" href="/dang-nhap">
          Đăng nhập
        </Link>
      )}
      {state === "error" && <p className="muted-text">Không tải được: {error}</p>}
      {state === "ready" &&
        (list.length === 0 ? (
          <p className="muted-text">
            Bạn chưa có vai trò quản lý ở dòng họ nào.{" "}
            <Link href="/app">Vào không gian con cháu</Link>
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Dòng họ</th>
                  <th>Vai trò của bạn</th>
                </tr>
              </thead>
              <tbody>
                {list.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <Link href={`/quan-ly/${l.id}`}>{l.name}</Link>
                    </td>
                    <td>
                      <span className="badge brand">{roleLabel(l.myRole, l.isOwner)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </>
  );
}
