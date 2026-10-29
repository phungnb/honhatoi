import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ho_nha_toi/core/api_client.dart';
import 'package:ho_nha_toi/core/auth_state.dart';
import 'package:ho_nha_toi/theme/app_theme.dart';

/// Đổi số điện thoại mà vẫn giữ nguyên tài khoản (vai trò trong dòng họ,
/// Trưởng tộc, quyền quản trị đều đi theo).
///
/// Cần mã OTP gửi tới CẢ số cũ lẫn số mới. Mất số cũ thì nhờ quản trị
/// nền tảng đổi hộ.
class ChangePhoneScreen extends ConsumerStatefulWidget {
  const ChangePhoneScreen({super.key, this.currentPhone});

  final String? currentPhone;

  @override
  ConsumerState<ChangePhoneScreen> createState() => _ChangePhoneScreenState();
}

class _ChangePhoneScreenState extends ConsumerState<ChangePhoneScreen> {
  final _newPhoneCtrl = TextEditingController();
  final _oldCodeCtrl = TextEditingController();
  final _newCodeCtrl = TextEditingController();

  bool _codeStep = false;
  bool _needsOldCode = true;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _newPhoneCtrl.dispose();
    _oldCodeCtrl.dispose();
    _newCodeCtrl.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await action();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _sendCodes() async {
    final phone = _newPhoneCtrl.text.trim();
    if (phone.replaceAll(RegExp(r'\D'), '').length < 9) {
      setState(() => _error = 'Vui lòng nhập số điện thoại hợp lệ.');
      return;
    }
    await _run(() async {
      final data = await ApiClient.instance.getData(
        'POST',
        '/auth/phone/change/request',
        body: {'newPhone': phone},
      );
      if (!mounted) return;
      setState(() {
        _needsOldCode = data['requiresOldCode'] != false;
        _codeStep = true;
      });
    });
  }

  Future<void> _confirm() async {
    if (_newCodeCtrl.text.trim().length != 6 ||
        (_needsOldCode && _oldCodeCtrl.text.trim().length != 6)) {
      setState(() => _error = 'Mỗi mã gồm 6 số.');
      return;
    }
    await _run(() async {
      await ApiClient.instance.getData(
        'POST',
        '/auth/phone/change/confirm',
        body: {
          'newPhone': _newPhoneCtrl.text.trim(),
          if (_needsOldCode) 'oldCode': _oldCodeCtrl.text.trim(),
          'newCode': _newCodeCtrl.text.trim(),
        },
      );
      ref.invalidate(authMeProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Đã đổi sang số ${_newPhoneCtrl.text.trim()}. '
            'Các thiết bị khác đã bị đăng xuất.',
          ),
        ),
      );
      Navigator.of(context).pop();
    });
  }

  Widget _codeField(String hint, TextEditingController ctrl) {
    final p = context.palette;
    return TextField(
      controller: ctrl,
      keyboardType: TextInputType.number,
      enabled: !_loading,
      maxLength: 6,
      textAlign: TextAlign.center,
      style: AppTheme.mono(size: 22, color: p.text),
      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      decoration: InputDecoration(labelText: hint, counterText: ''),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final current = widget.currentPhone;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Đổi số điện thoại'),
        backgroundColor: p.bg,
        foregroundColor: p.text,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          Text(
            'Số đang dùng: ${current == null || current.isEmpty ? 'chưa có' : current}. '
            'Đổi số vẫn giữ nguyên tài khoản, vai trò và dòng họ đã tham gia.',
            style: TextStyle(color: p.secondary, fontSize: 14),
          ),
          const SizedBox(height: 20),
          if (!_codeStep)
            TextField(
              controller: _newPhoneCtrl,
              keyboardType: TextInputType.phone,
              enabled: !_loading,
              decoration: const InputDecoration(
                labelText: 'Số điện thoại mới',
                prefixIcon: Icon(Icons.phone_outlined),
              ),
              onSubmitted: (_) => _sendCodes(),
            )
          else ...[
            Text(
              _needsOldCode
                  ? 'Đã gửi mã tới số cũ ($current) và số mới (${_newPhoneCtrl.text.trim()}).'
                  : 'Đã gửi mã tới số ${_newPhoneCtrl.text.trim()}.',
              style: TextStyle(color: p.text, fontSize: 14),
            ),
            const SizedBox(height: 12),
            if (_needsOldCode) ...[
              _codeField('Mã gửi tới số cũ', _oldCodeCtrl),
              const SizedBox(height: 12),
            ],
            _codeField('Mã gửi tới số mới', _newCodeCtrl),
          ],
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(color: p.live, fontSize: 13)),
          ],
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: _loading ? null : (_codeStep ? _confirm : _sendCodes),
            child: Text(
              _loading
                  ? 'Đang xử lý…'
                  : (_codeStep ? 'Xác nhận đổi số' : 'Gửi mã xác thực'),
            ),
          ),
          if (_codeStep)
            TextButton(
              onPressed: _loading
                  ? null
                  : () => setState(() {
                        _codeStep = false;
                        _error = null;
                      }),
              child: const Text('Quay lại'),
            ),
          const SizedBox(height: 16),
          Text(
            'Mất số cũ, không nhận được mã? Liên hệ quản trị nền tảng để '
            'được xác minh và đổi hộ.',
            style: TextStyle(color: p.secondary, fontSize: 12),
          ),
        ],
      ),
    );
  }
}
