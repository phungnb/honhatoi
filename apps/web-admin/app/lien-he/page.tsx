import type { Metadata } from "next";
import Link from "next/link";
import TrangVanBan from "@/components/TrangVanBan";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Liên hệ và hỗ trợ · Họ Nhà Tôi" };

export default function LienHePage() {
  return (
    <TrangVanBan title="Liên hệ và hỗ trợ">
      <h2>Gửi câu hỏi, góp ý</h2>
      <p>
        {SITE.contactEmail ? (
          <>
            Email: <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>. Chúng tôi trả lời trong
            vòng 2 ngày làm việc.
          </>
        ) : (
          "Email hỗ trợ đang cập nhật. Trong lúc chờ, bạn hỏi Ban quản trị dòng họ mình qua mục Tin nhắn."
        )}
      </p>

      <h2>Việc trong dòng họ</h2>
      <ul>
        <li>
          Sửa thông tin một người trong gia phả: mở hồ sơ người đó, bấm “Sửa / đề xuất sửa”. Thành viên thường gửi đề xuất,
          Người giữ gia phả hoặc Ban quản trị duyệt.
        </li>
        <li>Xin vào dòng họ: nhập mã mời do Ban quản trị họ gửi, ở Trang chủ.</li>
        <li>Báo nội dung xấu (xúc phạm, lừa đảo, lộ thông tin riêng): bấm Báo cáo ngay dưới bài viết hoặc tin nhắn.</li>
      </ul>

      <h2>Dữ liệu cá nhân</h2>
      <ul>
        <li>
          Xóa tài khoản: vào <Link href="/tai-khoan">Cá nhân</Link>. Muốn xin bản sao dữ liệu của mình, gửi yêu cầu qua email ở trên.
        </li>
        <li>
          Cách chúng tôi giữ và dùng dữ liệu: xem <Link href="/quyen-rieng-tu">Chính sách quyền riêng tư</Link>.
        </li>
      </ul>
    </TrangVanBan>
  );
}
