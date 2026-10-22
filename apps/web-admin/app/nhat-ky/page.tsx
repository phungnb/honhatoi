// TODO: thay dữ liệu mẫu bằng API backend (GET /admin/nhat-ky-kiem-toan)
const LOGS = [
  {
    thoiGian: "22/10/2026 09:42:11",
    nguoiThucHien: "Nguyễn Văn Hùng",
    hanhDong: "Duyệt đề xuất",
    doiTuong: "Đề xuất DX-001 — thêm thành viên",
    chiTiet: "Thêm «Trần Thị Cúc» vào đời thứ 2, Họ Nguyễn tại Đồng Nai",
  },
  {
    thoiGian: "22/10/2026 09:15:03",
    nguoiThucHien: "Nguyễn Văn Hùng",
    hanhDong: "Tạo đề xuất",
    doiTuong: "Đề xuất DX-001",
    chiTiet: "Đề xuất thêm thành viên mới vào cây gia phả",
  },
  {
    thoiGian: "22/10/2026 08:58:47",
    nguoiThucHien: "Trần Văn Long",
    hanhDong: "Tạo sự kiện",
    doiTuong: "Sự kiện «Giỗ cụ Trần Văn Tâm»",
    chiTiet: "Họ Trần tại TP.HCM — ngày 28/10/2026",
  },
  {
    thoiGian: "22/10/2026 08:31:20",
    nguoiThucHien: "Hệ thống",
    hanhDong: "Đăng nhập",
    doiTuong: "Tài khoản QTV-002",
    chiTiet: "Đăng nhập thành công từ thiết bị đã tin cậy",
  },
  {
    thoiGian: "21/10/2026 20:03:55",
    nguoiThucHien: "Trần Văn Hải",
    hanhDong: "Tạo đề xuất",
    doiTuong: "Đề xuất DX-003",
    chiTiet: "Đề xuất thêm «Trần Gia Huy» vào đời thứ 3",
  },
];

export default function NhatKyPage() {
  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Nhật ký kiểm toán</h1>
        <p className="page-desc">
          Ghi nhận mọi hành động quan trọng trên hệ thống: ai làm gì, với đối
          tượng nào, vào lúc nào. Nhật ký chỉ được ghi thêm, không được sửa
          hoặc xóa.
        </p>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Người thực hiện</th>
              <th>Hành động</th>
              <th>Đối tượng</th>
              <th>Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {LOGS.map((l, i) => (
              <tr key={i}>
                <td style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>
                  {l.thoiGian}
                </td>
                <td style={{ fontWeight: 700 }}>{l.nguoiThucHien}</td>
                <td>
                  <span className="badge">{l.hanhDong}</span>
                </td>
                <td>{l.doiTuong}</td>
                <td style={{ minWidth: 280 }}>{l.chiTiet}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
