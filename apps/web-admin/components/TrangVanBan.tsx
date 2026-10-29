import Link from "next/link";
import type { ReactNode } from "react";
import { SITE } from "@/lib/site";

/** Khung chung cho trang văn bản dài (điều khoản, quyền riêng tư). */
export default function TrangVanBan({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="van-ban">
      <div className="page-head">
        <h1 className="page-title">{title}</h1>
        <p className="page-desc">Cập nhật: {SITE.updatedAt}</p>
      </div>
      {children}
      <p className="muted-text section-gap">
        Liên hệ:{" "}
        {SITE.contactEmail ? (
          <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>
        ) : (
          "email hỗ trợ đang cập nhật"
        )}
        . Xem thêm <Link href="/dieu-khoan">Điều khoản sử dụng</Link> ·{" "}
        <Link href="/quyen-rieng-tu">Chính sách quyền riêng tư</Link>.
      </p>
    </article>
  );
}
