import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Design tokens "Modern Family Tech v1" của Họ Nhà Tôi.
///
/// Mọi màu sắc trong app đều lấy từ [AppPalette]; widget truy cập nhanh
/// qua `context.palette` (xem [PaletteX]).
@immutable
class AppPalette {
  final Color bg;
  final Color surface;
  final Color elevated;
  final Color brand;
  final Color onBrand;
  final Color text;
  final Color secondary;
  final Color border;
  final Color warmAccent;
  final Color coin;
  final Color xp;
  final Color live;

  const AppPalette({
    required this.bg,
    required this.surface,
    required this.elevated,
    required this.brand,
    required this.onBrand,
    required this.text,
    required this.secondary,
    required this.border,
    required this.warmAccent,
    required this.coin,
    required this.xp,
    required this.live,
  });

  /// Bảng màu chế độ tối.
  static const AppPalette dark = AppPalette(
    bg: Color(0xFF0B0F14),
    surface: Color(0xFF151A24),
    elevated: Color(0xFF1C2432),
    brand: Color(0xFFA3FF12),
    onBrand: Color(0xFF0B0F14),
    text: Color(0xFFF5F7FA),
    secondary: Color(0xFFB4C0D0),
    border: Color(0xFF303B4D),
    warmAccent: Color(0xFFE8B86D),
    coin: Color(0xFFFFB020),
    xp: Color(0xFF7C9CFF),
    live: Color(0xFFFF3B5C),
  );

  /// Bảng màu chế độ sáng (dễ đọc ban ngày, thân thiện người lớn tuổi).
  static const AppPalette light = AppPalette(
    bg: Color(0xFFF6F4EE),
    surface: Color(0xFFFFFFFF),
    elevated: Color(0xFFECE8DC),
    brand: Color(0xFF4E9A00),
    onBrand: Color(0xFFFFFFFF),
    text: Color(0xFF1B2029),
    secondary: Color(0xFF5B6572),
    border: Color(0xFFDCD5C2),
    warmAccent: Color(0xFFB07A1F),
    coin: Color(0xFFFFB020),
    xp: Color(0xFF7C9CFF),
    live: Color(0xFFFF3B5C),
  );
}

/// Lấy palette tương ứng với theme đang bật.
///
/// Ví dụ: `final p = context.palette;`
extension PaletteX on BuildContext {
  AppPalette get palette => Theme.of(this).brightness == Brightness.light
      ? AppPalette.light
      : AppPalette.dark;
}

/// Hai ThemeData hoàn chỉnh của app: [AppTheme.dark] và [AppTheme.light].
///
/// Lưu ý tương thích: không dùng `CardTheme`/`DialogTheme` trong ThemeData
/// vì các lớp này đổi tên giữa các bản Flutter 3.x; thẻ card dùng
/// [AppTheme.cardDecoration] để bo góc 16px nhất quán.
class AppTheme {
  AppTheme._();

  /// Bán kính bo góc chuẩn của thẻ card.
  static const double cardRadius = 16.0;

  /// Kiểu chữ số dùng font monospace cho các thống kê (số thành viên,
  /// số thế hệ, ngày tháng, ...).
  static TextStyle mono({
    double size = 24,
    FontWeight weight = FontWeight.w700,
    Color? color,
  }) =>
      GoogleFonts.robotoMono(fontSize: size, fontWeight: weight, color: color);

  /// Trang trí thẻ card chuẩn: nền surface, bo 16px, viền theo palette.
  static BoxDecoration cardDecoration(AppPalette p, {Color? color}) =>
      BoxDecoration(
        color: color ?? p.surface,
        borderRadius: BorderRadius.circular(cardRadius),
        border: Border.all(color: p.border),
      );

  static ThemeData dark() => _build(AppPalette.dark, Brightness.dark);

  static ThemeData light() => _build(AppPalette.light, Brightness.light);

  static ThemeData _build(AppPalette p, Brightness brightness) {
    final base = ThemeData(brightness: brightness, useMaterial3: true);
    return base.copyWith(
      scaffoldBackgroundColor: p.bg,
      colorScheme: brightness == Brightness.dark
          ? ColorScheme.dark(
              primary: p.brand,
              onPrimary: p.onBrand,
              surface: p.surface,
              onSurface: p.text,
              error: p.live,
              onError: Colors.white,
            )
          : ColorScheme.light(
              primary: p.brand,
              onPrimary: p.onBrand,
              surface: p.surface,
              onSurface: p.text,
              error: p.live,
              onError: Colors.white,
            ),
      // Font Be Vietnam Pro cho toàn bộ text trong app.
      textTheme: GoogleFonts.beVietnamProTextTheme(base.textTheme),
      dividerColor: p.border,
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: p.surface,
        selectedItemColor: p.brand,
        unselectedItemColor: p.secondary,
        type: BottomNavigationBarType.fixed,
        showUnselectedLabels: true,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: p.elevated,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        hintStyle: TextStyle(color: p.secondary),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: p.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: p.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: p.brand, width: 1.5),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: p.brand,
          foregroundColor: p.onBrand,
          textStyle: const TextStyle(fontWeight: FontWeight.w700),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(999),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 14),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: p.text,
          side: BorderSide(color: p.border),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(999),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        ),
      ),
      listTileTheme: ListTileThemeData(
        iconColor: p.secondary,
        textColor: p.text,
      ),
    );
  }
}
