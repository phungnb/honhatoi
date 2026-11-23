import type { Metadata } from "next";
import { BAI, NHOM, tenNgan } from "@/lib/van-khan";
import DanhSachVanKhan from "@/components/DanhSachVanKhan";

export const metadata: Metadata = {
  title: "Văn khấn · Họ Nhà Tôi",
  description: `${BAI.length} bài văn khấn: Tết, Rằm, ngày giỗ, Thanh minh, nhà mới, cưới hỏi, đền chùa, tang lễ.`,
};

export default function VanKhanPage() {
  return (
    <div className="van-khan">
      <div className="page-head">
        <h1 className="page-title">Văn khấn</h1>
        <p className="page-desc">
          {BAI.length} bài khấn theo nghi lễ trong năm và trong đời người. Chỗ có dấu “…” là phần mình tự
          đọc tên, địa chỉ, ngày tháng của nhà mình.
        </p>
      </div>
      <DanhSachVanKhan nhom={NHOM} bai={BAI.map(({ slug, title, group }) => ({ slug, title: tenNgan(title), group }))} />
    </div>
  );
}
