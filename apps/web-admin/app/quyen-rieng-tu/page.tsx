import type { Metadata } from "next";
import Link from "next/link";
import TrangVanBan from "@/components/TrangVanBan";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Chính sách quyền riêng tư · Họ Nhà Tôi" };

// Đối chiếu với Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 và Nghị định 356/2025/NĐ-CP.
export default function QuyenRiengTuPage() {
  const contact = SITE.contactEmail || "email hỗ trợ (đang cập nhật)";
  return (
    <TrangVanBan title="Chính sách quyền riêng tư">
      <p>
        Chính sách này cho biết Họ Nhà Tôi thu thập dữ liệu cá nhân nào, dùng để làm gì, lưu ở đâu
        và bạn có những quyền gì, theo Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15.
      </p>

      <h2>1. Bên kiểm soát dữ liệu</h2>
      <p>
        Bên kiểm soát và xử lý dữ liệu cá nhân của Họ Nhà Tôi:{" "}
        <strong>{SITE.operator || "thông tin đang cập nhật"}</strong>. Liên hệ: {contact}.
      </p>

      <h2>2. Dữ liệu chúng tôi thu thập</h2>
      <ul>
        <li>
          <strong>Tài khoản:</strong> họ tên hiển thị, số điện thoại, email, mật khẩu (chỉ lưu dạng
          mã hóa một chiều), mã định danh Google nếu bạn đăng nhập bằng Google.
        </li>
        <li>
          <strong>Gia phả:</strong> thông tin về người trong dòng họ do thành viên nhập: họ tên, giới
          tính, ngày sinh, ngày mất, quê quán, nơi an táng, tiểu sử, quan hệ cha mẹ, vợ chồng, con
          cái.
        </li>
        <li>
          <strong>Hoạt động trong dòng họ:</strong> tin nhắn, sự kiện, phản hồi tham gia, thông báo,
          vai trò trong dòng họ.
        </li>
        <li>
          <strong>Kỹ thuật:</strong> phiên đăng nhập, thời điểm truy cập, loại thiết bị và trình
          duyệt, thời điểm bạn đồng ý chính sách này.
        </li>
      </ul>
      <p>Chúng tôi không thu thập vị trí, danh bạ, ảnh giấy tờ tùy thân hay dữ liệu sinh trắc học.</p>

      <h2>3. Mục đích sử dụng</h2>
      <ul>
        <li>Tạo và giữ tài khoản, đăng nhập, chống truy cập trái phép.</li>
        <li>Hiển thị cây gia phả, tính ngày giỗ âm lịch, tra vai vế cho người trong cùng dòng họ.</li>
        <li>Gửi thông báo, tin nhắn, sự kiện giữa người trong dòng họ.</li>
      </ul>
      <p>
        Chúng tôi không bán dữ liệu, không dùng dữ liệu để quảng cáo và không dùng cho mục đích nào
        khác ngoài danh sách trên. Nếu cần mục đích mới, chúng tôi sẽ xin bạn đồng ý riêng.
      </p>

      <h2>4. Căn cứ xử lý</h2>
      <p>
        Chúng tôi xử lý dữ liệu dựa trên sự đồng ý của bạn, thể hiện bằng ô đồng ý khi đăng nhập lần
        đầu. Thời điểm và phiên bản chính sách bạn đồng ý được lưu lại. Bạn có thể rút lại đồng ý
        bất cứ lúc nào (mục 8); việc rút lại không ảnh hưởng tới xử lý đã diễn ra trước đó.
      </p>

      <h2>5. Ai được xem</h2>
      <ul>
        <li>
          Gia phả của một dòng họ chỉ người đã được duyệt vào họ đó xem được. Quyền sửa thuộc Trưởng
          tộc, Ban quản trị và Người giữ gia phả.
        </li>
        <li>Tin nhắn chỉ người trong cuộc trò chuyện xem được.</li>
        <li>Dòng họ mẫu &quot;Họ Nguyễn Văn&quot; là dữ liệu hư cấu, ai cũng xem được.</li>
        <li>
          Chúng tôi chỉ cung cấp dữ liệu cho cơ quan nhà nước khi pháp luật yêu cầu.
        </li>
      </ul>

      <h2>6. Thông tin về người khác, trẻ em</h2>
      <ul>
        <li>
          Khi nhập thông tin về người thân còn sống, bạn cần được người đó (hoặc gia đình) đồng ý.
        </li>
        <li>
          Với trẻ em, cần cha mẹ hoặc người giám hộ đồng ý; trẻ từ đủ 7 tuổi cần được hỏi ý kiến và
          đồng ý theo Điều 24 Luật Bảo vệ dữ liệu cá nhân.
        </li>
        <li>Người dưới 16 tuổi tự dùng app cần có cha mẹ hoặc người giám hộ đồng ý.</li>
        <li>
          Ai muốn sửa hoặc gỡ thông tin về mình trong cây gia phả có thể đề nghị Ban quản trị dòng
          họ, hoặc gửi yêu cầu tới {contact}.
        </li>
      </ul>

      <h2>7. Lưu trữ, chuyển dữ liệu ra nước ngoài</h2>
      <ul>
        <li>
          Cơ sở dữ liệu đặt tại Singapore (Neon, trên hạ tầng AWS khu vực ap-southeast-1). Máy chủ
          ứng dụng chạy trên Vercel, có thể xử lý yêu cầu tại máy chủ ở Hoa Kỳ hoặc nước khác. Đây
          là chuyển dữ liệu cá nhân ra nước ngoài theo Điều 20 Luật Bảo vệ dữ liệu cá nhân.
        </li>
        <li>Đăng nhập bằng Google do Google xử lý theo chính sách của Google.</li>
        <li>
          Kết nối luôn được mã hóa (HTTPS); mật khẩu chỉ lưu dạng mã hóa một chiều; chỉ người vận
          hành được truy cập cơ sở dữ liệu.
        </li>
        <li>
          Dữ liệu được giữ đến khi bạn xóa tài khoản. Bản sao lưu kỹ thuật tự xóa trong tối đa 30
          ngày sau đó.
        </li>
      </ul>

      <h2>8. Quyền của bạn và cách thực hiện</h2>
      <ul>
        <li>
          <strong>Xem, sửa</strong> thông tin tài khoản: mục Cá nhân trong app.
        </li>
        <li>
          <strong>Xóa tài khoản</strong>: Cá nhân → Xóa tài khoản, có hiệu lực ngay. Số điện thoại,
          email, mật khẩu, liên kết Google và hồ sơ cá nhân bị xóa; bạn rời mọi dòng họ. Người trong
          cây gia phả do dòng họ quản lý nên vẫn được giữ; tin nhắn đã gửi hiện tên &quot;Người dùng
          đã xóa&quot;.
        </li>
        <li>
          <strong>Rút lại đồng ý, hạn chế xử lý, phản đối, yêu cầu cung cấp bản sao dữ liệu, khiếu
          nại</strong>: gửi yêu cầu bằng văn bản (email được chấp nhận) tới {contact}. Chúng tôi phản
          hồi trong 2 ngày làm việc với yêu cầu rút đồng ý, hạn chế, phản đối; 10 ngày với yêu cầu xem,
          cung cấp; và thực hiện trong thời hạn theo Nghị định 356/2025/NĐ-CP.
        </li>
      </ul>

      <h2>9. Khi có sự cố dữ liệu</h2>
      <p>
        Nếu phát hiện vi phạm có thể gây hại cho bạn, chúng tôi báo cơ quan chuyên trách bảo vệ dữ
        liệu cá nhân (Bộ Công an) chậm nhất 72 giờ và thông báo cho người bị ảnh hưởng qua app hoặc
        email.
      </p>

      <h2>10. Thay đổi chính sách</h2>
      <p>
        Khi chính sách thay đổi, chúng tôi cập nhật ngày ở đầu trang và hỏi lại sự đồng ý của bạn
        trong app trước khi tiếp tục. Xem thêm <Link href="/dieu-khoan">Điều khoản sử dụng</Link>.
      </p>
    </TrangVanBan>
  );
}
