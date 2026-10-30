import type { Metadata } from "next";
import Link from "next/link";
import TrangVanBan from "@/components/TrangVanBan";

export const metadata: Metadata = { title: "Điều khoản sử dụng · Họ Nhà Tôi" };

export default function DieuKhoanPage() {
  return (
    <TrangVanBan title="Điều khoản sử dụng">
      <h2>1. Dịch vụ</h2>
      <p>
        Họ Nhà Tôi là ứng dụng gia phả số: dựng cây gia phả, tính ngày giỗ âm
        lịch, tra vai vế xưng hô, tổ chức sự kiện và nhắn tin trong dòng họ.
        Bạn xác nhận đồng ý với điều khoản này và{" "}
        <Link href="/quyen-rieng-tu">Chính sách quyền riêng tư</Link> bằng ô đồng ý khi đăng nhập lần
        đầu.
      </p>

      <h2>2. Tài khoản</h2>
      <ul>
        <li>Mỗi người dùng một tài khoản, đứng tên thật hoặc tên thường gọi trong họ.</li>
        <li>Bạn tự giữ bí mật mật khẩu và mã xác thực; báo ngay nếu nghi bị lộ.</li>
        <li>Bạn có thể xóa tài khoản bất cứ lúc nào trong mục Cá nhân.</li>
      </ul>

      <h2>3. Dòng họ và vai trò</h2>
      <ul>
        <li>
          Người tạo dòng họ là Trưởng tộc, chịu trách nhiệm duyệt thành viên và
          phân vai trò. Trưởng tộc muốn xóa tài khoản phải chuyển quyền cho
          người khác trước.
        </li>
        <li>
          Ban quản trị và Người giữ gia phả chịu trách nhiệm về độ chính xác của
          cây gia phả mình sửa. Thành viên chỉ đề xuất, người có quyền duyệt.
        </li>
      </ul>

      <h2>4. Nội dung bạn đưa lên</h2>
      <ul>
        <li>
          Bạn giữ quyền với nội dung của mình và cho phép chúng tôi lưu trữ, hiển
          thị nó cho người trong dòng họ để vận hành dịch vụ.
        </li>
        <li>
          Không đưa lên nội dung sai sự thật về người khác, xúc phạm, vi phạm
          pháp luật, hoặc thông tin cá nhân của người khác khi chưa được đồng ý.
        </li>
        <li>
          Chúng tôi có thể ẩn nội dung hoặc khóa tài khoản vi phạm sau khi xem xét
          báo cáo.
        </li>
      </ul>

      <h2>5. Giới hạn trách nhiệm</h2>
      <p>
        Ngày giỗ âm lịch và danh xưng vai vế do app tính tự động, có thể khác
        phong tục từng vùng; hãy đối chiếu với các cụ trong họ cho việc trọng
        đại. App được cung cấp theo hiện trạng; chúng tôi cố gắng sao lưu và
        giữ dịch vụ ổn định nhưng không cam kết không bao giờ gián đoạn.
      </p>

      <h2>6. Thay đổi điều khoản</h2>
      <p>
        Khi điều khoản thay đổi, chúng tôi cập nhật ngày ở đầu trang và hỏi lại
        sự đồng ý của bạn trong app trước khi tiếp tục.
      </p>
    </TrangVanBan>
  );
}
