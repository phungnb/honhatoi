/// Cấu hình chung của ứng dụng Họ Nhà Tôi.
class AppConfig {
  AppConfig._();

  /// Base URL của API backend.
  ///
  /// - `http://10.0.2.2:3000` dùng khi chạy app trên **Android emulator**
  ///   (địa chỉ 10.0.2.2 trỏ về localhost của máy host).
  /// - Khi chạy trên **thiết bị thật** hoặc **iOS simulator**, đổi thành
  ///   địa chỉ IP LAN của máy đang chạy backend, ví dụ:
  ///   `http://192.168.1.10:3000`.
  /// - Khi lên production, đổi thành domain HTTPS của server,
  ///   ví dụ: `https://api.honhatoi.vn`.
  static const String apiBaseUrl = 'http://10.0.2.2:3000';

  /// Tên hiển thị của ứng dụng.
  static const String appName = 'Họ Nhà Tôi';

  /// Phiên bản hiện tại.
  static const String appVersion = '1.0.0';

  /// Timeout mặc định cho mỗi request API.
  static const Duration apiTimeout = Duration(seconds: 15);
}
