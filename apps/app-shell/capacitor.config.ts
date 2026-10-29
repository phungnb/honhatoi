import type { CapacitorConfig } from '@capacitor/cli'

// Vỏ app Android/iOS của Họ Nhà Tôi, cùng cách làm với RaceHub: app mở thẳng web app
// (server.url), nên cập nhật giao diện chỉ cần deploy web; chỉ nộp lại app khi đổi phần
// native (plugin, quyền, icon). Xem README.md trong thư mục này.
// Phải là đúng địa chỉ cuối cùng sau chuyển hướng: Capacitor chỉ nạp cầu native cho đúng
// origin của server.url.
const serverUrl = process.env.CAP_SERVER_URL || 'https://honhatoi-web-admin.vercel.app/app'

const config: CapacitorConfig = {
  // Mã định danh app trên cửa hàng — KHÔNG đổi được sau khi đã nộp lần đầu
  appId: 'vn.honhatoi.app',
  appName: 'Họ Nhà Tôi',
  // Trang dự phòng đóng gói sẵn: chỉ hiện khi không tải được server.url (mất mạng lúc mở app)
  webDir: 'www',
  // Cho web biết đang chạy trong app (apps/web-admin/lib/native.ts)
  appendUserAgent: 'HoNhaToiApp',
  backgroundColor: '#0b0f14',
  server: {
    url: serverUrl,
    // Trang ngoài danh sách (Zalo, Google Maps…) mở bằng trình duyệt của máy
    allowNavigation: [new URL(serverUrl).host],
    errorPath: 'offline.html',
  },
  android: {
    adjustMarginsForEdgeToEdge: 'auto',
  },
  ios: {
    contentInset: 'never',
  },
}

export default config
