import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ho_nha_toi/core/auth_state.dart';
import 'package:ho_nha_toi/features/auth/login_screen.dart';
import 'package:ho_nha_toi/router/app_shell.dart';
import 'package:ho_nha_toi/theme/app_theme.dart';
import 'package:ho_nha_toi/theme/theme_mode_provider.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: HoNhaToiApp()));
}

/// App Họ Nhà Tôi: gia phả số và cộng đồng dòng họ.
///
/// Điều hướng theo trạng thái đăng nhập:
/// - unknown → màn hình chờ (đang đọc token đã lưu)
/// - unauthenticated → màn hình đăng nhập OTP
/// - authenticated → AppShell (5 tab chính)
class HoNhaToiApp extends ConsumerWidget {
  const HoNhaToiApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final auth = ref.watch(authStateProvider);

    final Widget home;
    switch (auth.status) {
      case AuthStatus.unknown:
        home = const _SplashScreen();
      case AuthStatus.unauthenticated:
        home = const LoginScreen();
      case AuthStatus.authenticated:
        home = const AppShell();
    }

    return MaterialApp(
      title: 'Họ Nhà Tôi',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: themeMode,
      home: home,
    );
  }
}

/// Màn hình chờ ngắn trong lúc đọc token đã lưu.
class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Scaffold(
      backgroundColor: p.bg,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: p.brand,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Center(
                child: Text(
                  'H',
                  style: TextStyle(
                    color: p.onBrand,
                    fontWeight: FontWeight.w800,
                    fontSize: 36,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
            const CircularProgressIndicator(),
          ],
        ),
      ),
    );
  }
}
