import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Provider quản lý chế độ Sáng/Tối của app.
///
/// Lựa chọn được lưu persistent bằng shared_preferences nên lần mở app
/// sau vẫn giữ nguyên chế độ người dùng đã chọn.
final themeModeProvider =
    StateNotifierProvider<ThemeModeNotifier, ThemeMode>((ref) {
  return ThemeModeNotifier();
});

class ThemeModeNotifier extends StateNotifier<ThemeMode> {
  static const _storageKey = 'app_theme_mode';

  /// Mặc định dùng chế độ tối (phong cách chủ đạo của Họ Nhà Tôi).
  ThemeModeNotifier() : super(ThemeMode.dark) {
    _restore();
  }

  Future<void> _restore() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_storageKey);
    if (saved == 'light') {
      state = ThemeMode.light;
    } else if (saved == 'dark') {
      state = ThemeMode.dark;
    }
  }

  Future<void> setMode(ThemeMode mode) async {
    if (state == mode) return;
    state = mode;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _storageKey,
      mode == ThemeMode.light ? 'light' : 'dark',
    );
  }

  Future<void> toggle() async {
    await setMode(
      state == ThemeMode.light ? ThemeMode.dark : ThemeMode.light,
    );
  }
}
