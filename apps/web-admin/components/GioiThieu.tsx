import Link from "next/link";

/**
 * Trang giới thiệu cho người chưa đăng nhập (/app): app làm được gì, bắt đầu
 * thế nào, mời xem dòng họ mẫu trước khi đăng ký.
 */

const FEATURES = [
  ["Cây gia phả", "Dựng cây theo đời, nhánh trưởng nhánh thứ; bấm vào ai cũng xem được hồ sơ."],
  ["Ngày giỗ âm lịch", "Tự tính ngày giỗ năm nay theo lịch âm, nhắc trước cho cả họ."],
  ["Tra vai vế", "Chọn hai người, app cho biết người kia là bác, chú, cô hay cháu của mình."],
  ["Sự kiện dòng họ", "Giỗ tổ, họp họ, mừng thọ: tạo sự kiện, mọi người báo tham gia."],
  ["Nhắn tin cả họ", "Nhóm chat riêng của dòng họ và nhắn riêng với từng người."],
  ["Phân vai rõ ràng", "Trưởng tộc, Ban quản trị, Người giữ gia phả, Thành viên: ai làm gì đều rõ."],
] as const;

const STEPS = [
  ["Tạo dòng họ", "Người đứng ra (thường là Trưởng tộc) tạo họ và dựng vài đời đầu."],
  ["Mời con cháu", "Gửi link mời qua Zalo; người nhận bấm vào là vào đúng họ."],
  ["Cùng hoàn thiện", "Con cháu bổ sung thông tin, Ban quản trị duyệt để cây luôn đúng."],
] as const;

export default function GioiThieu({ inviteCode = "" }: { inviteCode?: string }) {
  const loginHref = inviteCode ? `/dang-nhap?ma=${encodeURIComponent(inviteCode)}` : "/dang-nhap";
  return (
    <>
      <section className="hero">
        <h1 className="page-title" style={{ fontSize: 30 }}>
          Gia phả số cho cả dòng họ
        </h1>
        <p className="page-desc" style={{ maxWidth: 560 }}>
          Lưu giữ cây gia phả, nhớ ngày giỗ, biết ai là ai trong họ, và giữ liên
          lạc với con cháu ở xa. Trên điện thoại, máy tính, Android và iPhone.
        </p>
        {inviteCode && (
          <p className="badge brand" style={{ marginTop: 12 }}>
            Bạn được mời vào một dòng họ. Đăng nhập để vào.
          </p>
        )}
        <div className="btn-row" style={{ marginTop: 20, flexWrap: "wrap" }}>
          <Link className="btn primary" href={loginHref}>
            Đăng nhập / Đăng ký
          </Link>
          <Link className="btn" href="/mau">
            Xem dòng họ mẫu
          </Link>
        </div>
      </section>

      <section className="section-gap">
        <div className="action-grid">
          {FEATURES.map(([t, d]) => (
            <div key={t} className="action" style={{ cursor: "default" }}>
              {t}
              <div className="sub">{d}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="card section-gap">
        <h2 className="card-title">Bắt đầu trong 3 bước</h2>
        <ol className="steps">
          {STEPS.map(([t, d]) => (
            <li key={t}>
              <strong>{t}</strong>
              <span className="sub">{d}</span>
            </li>
          ))}
        </ol>
      </section>

      <p className="muted-text section-gap">
        <Link href="/dieu-khoan">Điều khoản sử dụng</Link> ·{" "}
        <Link href="/quyen-rieng-tu">Chính sách quyền riêng tư</Link>
      </p>
    </>
  );
}
