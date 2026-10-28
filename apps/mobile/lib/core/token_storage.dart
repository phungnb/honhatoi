import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Kho lưu token an toàn (Keychain trên iOS, Keystore trên Android).
///
/// Dùng chung cho [ApiClient] (đọc token để gắn header, ghi token sau khi
/// refresh) và [AuthNotifier] (đăng nhập/đăng xuất). Không lưu gì khác ở đây.
class TokenStorage {
  TokenStorage._();

  static const _storage = FlutterSecureStorage();

  static const accessTokenKey = 'access_token';
  static const refreshTokenKey = 'refresh_token';
  static const userIdKey = 'user_id';

  static Future<String?> readAccessToken() =>
      _storage.read(key: accessTokenKey);

  static Future<String?> readRefreshToken() =>
      _storage.read(key: refreshTokenKey);

  static Future<String?> readUserId() => _storage.read(key: userIdKey);

  static Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
    String? userId,
  }) async {
    await _storage.write(key: accessTokenKey, value: accessToken);
    await _storage.write(key: refreshTokenKey, value: refreshToken);
    if (userId != null) {
      await _storage.write(key: userIdKey, value: userId);
    }
  }

  /// Xóa toàn bộ token — dùng khi đăng xuất hoặc phiên hết hạn.
  static Future<void> clear() => _storage.deleteAll();
}
