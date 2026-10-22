// TODO: thay dữ liệu mẫu bằng API backend (GET /admin/thong-ke)
const STATS = [
  { label: "Tổng dòng họ", value: "2" },
  { label: "Tổng thành viên", value: "44" },
  { label: "Đề xuất chờ duyệt", value: "3" },
  { label: "Tin nhắn hôm nay", value: "128" },
];

// TODO: thay bằng API backend (GET /admin/hoat-dong-gan-day)
const RECENT_ACTIVITY = [
  {
    time: "09:42",
    text: "Nguyễn Văn Hùng duyệt đề xuất thêm thành viên «Trần Thị Cúc»",
  },
  {
    time: "09:15",
    text: "Có đề xuất sửa hồ sơ mới từ chi 2 — Họ Nguyễn tại Đồng Nai",
  },
  {
    time: "08:58",
    text: "Trần Văn Long tạo sự kiện «Giỗ cụ Trần Văn Tâm»",
  },
  {
    time: "08:30",
    text: "Hệ thống ghi nhận 12 lượt đăng nhập mới trong 24 giờ qua",
  },
];

export default function DashboardPage() {
  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Tổng quan</h1>
        <p className="page-desc">
          Cái nhìn nhanh về hoạt động của các dòng họ trên hệ thống.
        </p>
      </div>

      <div className="grid-4">
        {STATS.map((s) => (
          <div className="card" key={s.label}>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">Hoạt động gần đây</div>
        <div className="table-wrap" style={{ border: "none" }}>
          <table>
            <tbody>
              {RECENT_ACTIVITY.map((a, i) => (
                <tr key={i}>
                  <td style={{ width: 90, color: "var(--muted)" }}>{a.time}</td>
                  <td>{a.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
