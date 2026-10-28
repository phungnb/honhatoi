import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ho_nha_toi/core/api_client.dart';
import 'package:ho_nha_toi/core/auth_state.dart';
import 'package:ho_nha_toi/theme/app_theme.dart';

/// Màn hình đăng nhập bằng OTP qua số điện thoại (2 bước):
/// 1. Nhập số điện thoại → nhận mã OTP 6 số.
/// 2. Nhập mã OTP → đổi lấy token, vào app.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phoneCtrl = TextEditingController();
  final _otpCtrl = TextEditingController();

  bool _otpStep = false;
  bool _loading = false;
  String? _error;

  int _cooldown = 0;
  Timer? _cooldownTimer;

  @override
  void dispose() {
    _phoneCtrl.dispose();
    _otpCtrl.dispose();
    _cooldownTimer?.cancel();
    super.dispose();
  }

  void _startCooldown() {
    _cooldownTimer?.cancel();
    setState(() => _cooldown = 60);
    _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      setState(() {
        _cooldown--;
        if (_cooldown <= 0) t.cancel();
      });
    });
  }

  Future<void> _sendOtp() async {
    final phone = _phoneCtrl.text.trim();
    if (phone.replaceAll(RegExp(r'\D'), '').length < 9) {
      setState(() => _error = 'Vui lòng nhập số điện thoại hợp lệ.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref.read(authStateProvider.notifier).requestOtp(phone);
      if (!mounted) return;
      setState(() {
        _otpStep = true;
        _loading = false;
      });
      _startCooldown();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.code == 'OTP_RATE_LIMITED'
            ? 'Bạn đã gửi mã quá nhiều lần. Vui lòng đợi một lát rồi thử lại.'
            : e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Đã có lỗi xảy ra. Vui lòng thử lại.';
      });
    }
  }

  Future<void> _verifyOtp() async {
    if (_otpCtrl.text.trim().length != 6) {
      setState(() => _error = 'Mã OTP gồm 6 số.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref
          .read(authStateProvider.notifier)
          .verifyOtp(_phoneCtrl.text.trim(), _otpCtrl.text.trim());
      // Thành công: main.dart tự chuyển sang AppShell qua authStateProvider.
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Đã có lỗi xảy ra. Vui lòng thử lại.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Scaffold(
      backgroundColor: p.bg,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Logo / tên app
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
                const SizedBox(height: 16),
                Text(
                  'HỌ NHÀ TÔI',
                  style: TextStyle(
                    color: p.text,
                    fontWeight: FontWeight.w800,
                    fontSize: 24,
                    letterSpacing: 2,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  _otpStep
                      ? 'Nhập mã 6 số đã gửi về điện thoại của bạn'
                      : 'Đăng nhập bằng số điện thoại để bắt đầu',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: p.secondary, fontSize: 14),
                ),
                const SizedBox(height: 28),
                if (!_otpStep) ...[
                  TextField(
                    controller: _phoneCtrl,
                    keyboardType: TextInputType.phone,
                    enabled: !_loading,
                    decoration: const InputDecoration(
                      hintText: 'Số điện thoại (VD: 0901234567)',
                      prefixIcon: Icon(Icons.phone_outlined),
                    ),
                    onSubmitted: (_) => _sendOtp(),
                  ),
                ] else ...[
                  TextField(
                    controller: _otpCtrl,
                    keyboardType: TextInputType.number,
                    enabled: !_loading,
                    maxLength: 6,
                    textAlign: TextAlign.center,
                    style: AppTheme.mono(size: 28, color: p.text),
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                    ],
                    decoration: const InputDecoration(
                      hintText: '••••••',
                      counterText: '',
                    ),
                    onSubmitted: (_) => _verifyOtp(),
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: _cooldown > 0 || _loading ? null : _sendOtp,
                    child: Text(
                      _cooldown > 0
                          ? 'Gửi lại mã sau $_cooldown giây'
                          : 'Gửi lại mã',
                    ),
                  ),
                  TextButton(
                    onPressed: _loading
                        ? null
                        : () => setState(() {
                              _otpStep = false;
                              _error = null;
                              _otpCtrl.clear();
                            }),
                    child: const Text('Đổi số điện thoại'),
                  ),
                ],
                if (_error != null) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: p.live.withAlpha(22),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: p.live.withAlpha(80)),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.error_outline,
                            color: p.live, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _error!,
                            style:
                                TextStyle(color: p.text, fontSize: 13),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _loading
                        ? null
                        : (_otpStep ? _verifyOtp : _sendOtp),
                    child: _loading
                        ? SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.5,
                              color: p.onBrand,
                            ),
                          )
                        : Text(_otpStep ? 'Xác nhận' : 'Gửi mã OTP'),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Bằng cách tiếp tục, bạn đồng ý với Điều khoản sử dụng '
                  'và Chính sách bảo mật của Họ Nhà Tôi.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: p.secondary, fontSize: 12),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
