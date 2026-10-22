export default function CaiDatPage() {
  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Cài đặt</h1>
        <p className="page-desc">
          Thiết lập chung của hệ thống. Trang khung — sẽ nối API backend khi
          triển khai thật.
        </p>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <div className="card-title">Thông tin hệ thống</div>
        <table>
          <tbody>
            <tr>
              <td style={{ color: "var(--muted)", width: 220 }}>
                Tên ứng dụng
              </td>
              <td style={{ fontWeight: 700 }}>HỌ NHÀ TÔI</td>
            </tr>
            <tr>
              <td style={{ color: "var(--muted)" }}>API backend</td>
              <td>
                <code style={{ fontSize: 13 }}>
                  process.env.NEXT_PUBLIC_API_URL
                </code>
              </td>
            </tr>
            <tr>
              <td style={{ color: "var(--muted)" }}>Chế độ giao diện</td>
              <td>
                <span className="badge brand">Tối (mặc định)</span>
              </td>
            </tr>
            <tr>
              <td style={{ color: "var(--muted)" }}>Nhật ký kiểm toán</td>
              <td>
                <span className="badge brand">Đang bật</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="muted-text section-gap">
        TODO: thêm form chỉnh sửa khi có API cấu hình hệ thống
        (PUT /admin/cai-dat).
      </p>
    </>
  );
}
