"use client";

// Cổng Ban Trị sự theo cấu trúc 1 domain (đánh giá chuyên gia 27/10/2026):
// /admin/[mã-dòng-họ]/duyet-xac-minh — Trưởng tộc làm việc đúng trong
// không gian của họ mình, họ lấy từ URL thay vì dropdown.
import DuyetXacMinh from "@/components/DuyetXacMinh";

export default function Page({ params }: { params: { lineageId: string } }) {
  return <DuyetXacMinh lockedLineageId={params.lineageId} />;
}
