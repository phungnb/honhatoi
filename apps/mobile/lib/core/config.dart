/// Cấu hình chung của ứng dụng Họ Nhà Tôi.
class AppConfig {
  AppConfig._();

  /// Base URL của API backend.
  ///
  /// - `https://honhatoi-api.vercel.app/api/v1` là API production trên Vercel
  ///   (địa chỉ 10.0.2.2 trỏ về localhost của máy host; backend chạy port 3001
  ///   với prefix `/api/v1`).
  /// - Khi chạy trên **thiết bị thật** hoặc **iOS simulator**, đổi thành
  ///   địa chỉ IP LAN của máy đang chạy backend, ví dụ:
  ///   `http://192.168.1.10:3001/api/v1`.
  /// - Khi lên production, đổi thành domain HTTPS của server,
  ///   ví dụ: `https://api.honhatoi.vn/api/v1`.
  static const String apiBaseUrl = 'https://honhatoi-api.vercel.app/api/v1';

  /// Tên hiển thị của ứng dụng.
  static const String appName = 'Họ Nhà Tôi';

  /// Phiên bản hiện tại.
  static const String appVersion = '1.0.0';

  /// Timeout mặc định cho mỗi request API.
  static const Duration apiTimeout = Duration(seconds: 15);
}
