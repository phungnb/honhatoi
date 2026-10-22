// TODO: thay dữ liệu mẫu bằng API backend (GET /admin/thanh-vien)
const MEMBERS = [
  {
    ten: "Nguyễn Văn Hùng",
    dongHo: "Họ Nguyễn tại Đồng Nai",
    vaiTro: "Trưởng họ",
    trangThai: "Đã xác minh",
  },
  {
    ten: "Ba Phùng Nguyễn",
    dongHo: "Họ Nguyễn tại Đồng Nai",
    vaiTro: "Trưởng chi",
    trangThai: "Đã xác minh",
  },
  {
    ten: "Nguyễn Thị Lan",
    dongHo: "Họ Nguyễn tại Đồng Nai",
    vaiTro: "Thành viên",
    trangThai: "Đã xác minh",
  },
  {
    ten: "Trần Văn Long",
    dongHo: "Họ Trần tại TP.HCM",
    vaiTro: "Trưởng họ",
    trangThai: "Đã xác minh",
  },
  {
    ten: "Trần Văn Hải",
    dongHo: "Họ Trần tại TP.HCM",
    vaiTro: "Thành viên",
    trangThai: "Chờ xác minh",
  },
];

export default function ThanhVienPage() {
  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Thành viên</h1>
        <p className="page-desc">
          Quản lý tài khoản thành viên và vai trò trong từng dòng họ.
        </p>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Họ tên</th>
              <th>Dòng họ</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {MEMBERS.map((m) => (
              <tr key={m.ten}>
                <td style={{ fontWeight: 700 }}>{m.ten}</td>
                <td>{m.dongHo}</td>
                <td>
                  <span className="badge info">{m.vaiTro}</span>
                </td>
                <td>
                  <span
                    className={`badge ${
                      m.trangThai === "Đã xác minh" ? "brand" : "warm"
                    }`}
                  >
                    {m.trangThai}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
