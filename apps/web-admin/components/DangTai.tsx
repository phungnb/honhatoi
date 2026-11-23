/** Khung chờ khi đang tải: vài vạch nhấp nháy giữ chỗ để trang không trống trơn. */
export default function DangTai({ dong = 3 }: { dong?: number }) {
  return (
    <div className="dang-tai section-gap" role="status" aria-label="Đang tải">
      <div className="vach ngan" />
      {Array.from({ length: dong }, (_, i) => (
        <div key={i} className="vach" />
      ))}
    </div>
  );
}
