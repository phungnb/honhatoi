import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ho_nha_toi/core/api_client.dart';
import 'package:ho_nha_toi/core/token_storage.dart';

/// Trạng thái đăng nhập của app.
enum AuthStatus {
  /// Chưa kiểm tra xong token đã lưu (màn hình chờ).
  unknown,

  /// Đã đăng nhập — có access token trong kho an toàn.
  authenticated,

  /// Chưa đăng nhập — hiển thị màn hình đăng nhập OTP.
  unauthenticated,
}

/// State đăng nhập: trạng thái + id người dùng (nếu có).
class AuthState {
  final AuthStatus status;
  final String? userId;

  const AuthState({required this.status, this.userId});
}

/// Quản lý đăng nhập OTP, tự động đăng nhập lại và đăng xuất.
class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState(status: AuthStatus.unknown)) {
    tryAutoLogin();
  }

  /// Đọc token đã lưu: còn access token thì coi như đã đăng nhập.
  Future<void> tryAutoLogin() async {
    final access = await TokenStorage.readAccessToken();
    final userId = await TokenStorage.readUserId();
    if (access != null && access.isNotEmpty) {
      state = AuthState(status: AuthStatus.authenticated, userId: userId);
    } else {
      state = const AuthState(status: AuthStatus.unauthenticated);
    }
  }

  /// Gửi mã OTP 6 số về số điện thoại. Ném [ApiException] khi lỗi
  /// (ví dụ `OTP_RATE_LIMITED` khi gửi quá nhiều lần).
  Future<void> requestOtp(String phone) async {
    await ApiClient.instance.getData(
      'POST',
      '/auth/otp/request',
      body: {'phone': normalizeVnPhone(phone), 'purpose': 'login'},
    );
  }

  /// Đổi mã OTP lấy access/refresh token rồi chuyển sang authenticated.
  Future<void> verifyOtp(String phone, String code) async {
    final data = await ApiClient.instance.getData(
      'POST',
      '/auth/otp/verify',
      body: {'phone': normalizeVnPhone(phone), 'code': code.trim()},
    );
    final accessToken = data['accessToken'] as String;
    final refreshToken = data['refreshToken'] as String;
    final user = data['user'] as Map<String, dynamic>?;
    final userId = user?['id'] as String?;
    await TokenStorage.saveTokens(
      accessToken: accessToken,
      refreshToken: refreshToken,
      userId: userId,
    );
    state = AuthState(status: AuthStatus.authenticated, userId: userId);
  }

  /// Đăng xuất: cố gắng thu hồi phiên trên server rồi xóa token cục bộ.
  Future<void> logout() async {
    final access = await TokenStorage.readAccessToken();
    final sessionId =
        access != null ? _decodeSessionId(access) : null;
    if (sessionId != null) {
      try {
        await ApiClient.instance.getData(
          'POST',
          '/auth/logout',
          body: {'sessionId': sessionId},
        );
      } catch (_) {
        // Server không thu hồi được thì vẫn đăng xuất cục bộ.
      }
    }
    await TokenStorage.clear();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  /// Đọc sessionId từ payload của JWT (tự decode base64, không cần thư viện).
  String? _decodeSessionId(String jwt) {
    try {
      final parts = jwt.split('.');
      if (parts.length != 3) return null;
      var payload = parts[1].replaceAll('-', '+').replaceAll('_', '/');
      final mod = payload.length % 4;
      if (mod > 0) payload += '=' * (4 - mod);
      final decoded = utf8.decode(base64.decode(payload));
      final map = jsonDecode(decoded) as Map<String, dynamic>;
      final sid =
          map['sessionId'] ?? map['sid'] ?? map['session_id'];
      return sid is String ? sid : null;
    } catch (_) {
      return null;
    }
  }
}

/// Provider trạng thái đăng nhập dùng chung toàn app.
final authStateProvider =
    StateNotifierProvider<AuthNotifier, AuthState>((ref) => AuthNotifier());

/// Hồ sơ người dùng hiện tại từ GET /auth/me.
///
/// Tự refresh khi trạng thái đăng nhập thay đổi.
final authMeProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  ref.watch(authStateProvider);
  final data = await ApiClient.instance.getData('GET', '/auth/me');
  return data['user'] as Map<String, dynamic>;
});

/// Chuẩn hóa số điện thoại Việt Nam: bỏ khoảng trắng, đổi đầu 0 → +84.
///
/// Ví dụ: "0901 234 567" → "+84901234567".
String normalizeVnPhone(String input) {
  var s = input.replaceAll(RegExp(r'\s+'), '');
  if (s.startsWith('0')) return '+84${s.substring(1)}';
  if (s.startsWith('84')) return '+$s';
  return s;
}
