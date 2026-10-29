import type { Metadata } from "next";
import TrangVanBan from "@/components/TrangVanBan";

export const metadata: Metadata = { title: "Chính sách quyền riêng tư · Họ Nhà Tôi" };

export default function QuyenRiengTuPage() {
  return (
    <TrangVanBan title="Chính sách quyền riêng tư">
      <h2>1. Chúng tôi thu thập gì</h2>
      <ul>
        <li>
          <strong>Tài khoản:</strong> họ tên hiển thị, số điện thoại, email, mật
          khẩu (chỉ lưu dạng mã hóa một chiều), mã định danh Google nếu bạn đăng
          nhập bằng Google.
        </li>
        <li>
          <strong>Gia phả:</strong> thông tin về người trong dòng họ do thành viên
          nhập: họ tên, giới tính, ngày sinh, ngày mất, quê quán, nơi an táng,
          tiểu sử, quan hệ cha mẹ, vợ chồng, con cái.
        </li>
        <li>
          <strong>Hoạt động trong dòng họ:</strong> tin nhắn, sự kiện, phản hồi
          tham gia, thông báo.
        </li>
        <li>
          <strong>Kỹ thuật:</strong> phiên đăng nhập, thời điểm truy cập, loại
          thiết bị và trình duyệt, để giữ đăng nhập và chống truy cập trái phép.
        </li>
      </ul>

      <h2>2. Dùng để làm gì</h2>
      <p>
        Chỉ để vận hành dịch vụ: đăng nhập, hiển thị gia phả cho người trong họ,
        tính ngày giỗ, tra vai vế, gửi thông báo và tin nhắn giữa người trong họ.
        Chúng tôi không bán dữ liệu và không dùng dữ liệu để quảng cáo.
      </p>

      <h2>3. Ai được xem</h2>
      <ul>
        <li>
          Gia phả của một dòng họ chỉ người đã được duyệt vào họ đó xem được.
          Quyền sửa thuộc Trưởng tộc, Ban quản trị và Người giữ gia phả.
        </li>
        <li>Tin nhắn chỉ người trong cuộc trò chuyện xem được.</li>
        <li>
          Dòng họ mẫu &quot;Họ Nguyễn Văn&quot; là dữ liệu hư cấu, ai cũng xem được.
        </li>
      </ul>

      <h2>4. Thông tin về người khác</h2>
      <p>
        Khi nhập thông tin về người thân (nhất là người còn sống), bạn cần được
        người đó hoặc gia đình đồng ý. Ai muốn sửa hoặc gỡ thông tin về mình
        trong cây gia phả có thể đề nghị Ban quản trị dòng họ, hoặc liên hệ
        chúng tôi theo địa chỉ cuối trang.
      </p>

      <h2>5. Lưu ở đâu</h2>
      <p>
        Dữ liệu được lưu tại cơ sở dữ liệu Neon đặt tại Singapore (AWS khu vực
        ap-southeast-1), máy chủ ứng dụng chạy trên Vercel. Đăng nhập bằng
        Google do Google xử lý theo chính sách của Google. Kết nối luôn được mã
        hóa (HTTPS).
      </p>

      <h2>6. Quyền của bạn</h2>
      <ul>
        <li>Xem và sửa thông tin tài khoản trong mục Cá nhân.</li>
        <li>
          Xóa tài khoản ngay trong app (Cá nhân → Xóa tài khoản). Số điện thoại,
          email, mật khẩu, liên kết Google và hồ sơ cá nhân bị xóa; bạn rời mọi
          dòng họ. Người trong cây gia phả do dòng họ quản lý nên vẫn được giữ;
          tin nhắn đã gửi hiện tên &quot;Người dùng đã xóa&quot;.
        </li>
        <li>Rút lại sự đồng ý, yêu cầu cung cấp hoặc xóa dữ liệu qua địa chỉ liên hệ.</li>
      </ul>

      <h2>7. Trẻ em</h2>
      <p>
        Người dưới 16 tuổi dùng app cần có cha mẹ hoặc người giám hộ đồng ý.
      </p>

      <h2>8. Thay đổi chính sách</h2>
      <p>
        Khi chính sách thay đổi, chúng tôi cập nhật ngày ở đầu trang và thông báo
        trong app nếu thay đổi ảnh hưởng đến quyền của bạn.
      </p>
    </TrangVanBan>
  );
}
