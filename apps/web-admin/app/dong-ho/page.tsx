// TODO: thay dữ liệu mẫu bằng API backend (GET /admin/dong-ho)
const LINEAGES = [
  {
    ten: "Họ Nguyễn tại Đồng Nai",
    queQuan: "Đồng Nai",
    nhaThoHo: "ấp Tân Lập",
    soThanhVien: 28,
    soTheHe: 4,
    trangThai: "Đang hoạt động",
  },
  {
    ten: "Họ Trần tại TP.HCM",
    queQuan: "TP. Hồ Chí Minh",
    nhaThoHo: "phường Bình Thọ",
    soThanhVien: 16,
    soTheHe: 3,
    trangThai: "Đang hoạt động",
  },
];

export default function DongHoPage() {
  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Dòng họ</h1>
        <p className="page-desc">
          Danh sách các dòng họ trên hệ thống. Dữ liệu mỗi dòng họ hoàn toàn
          tách biệt — quản trị viên chỉ thấy dòng họ thuộc phạm vi của mình.
        </p>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tên dòng họ</th>
              <th>Quê quán</th>
              <th>Nhà thờ họ</th>
              <th>Thành viên</th>
              <th>Thế hệ</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {LINEAGES.map((l) => (
              <tr key={l.ten}>
                <td style={{ fontWeight: 700 }}>{l.ten}</td>
                <td>{l.queQuan}</td>
                <td>{l.nhaThoHo}</td>
                <td style={{ fontVariantNumeric: "tabular-nums" }}>
                  {l.soThanhVien}
                </td>
                <td style={{ fontVariantNumeric: "tabular-nums" }}>
                  {l.soTheHe}
                </td>
                <td>
                  <span className="badge brand">{l.trangThai}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
