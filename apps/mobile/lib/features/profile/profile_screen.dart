import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ho_nha_toi/core/auth_state.dart';
import 'package:ho_nha_toi/core/repositories/lineage_repository.dart';
import 'package:ho_nha_toi/core/widgets/async_view.dart';
import 'package:ho_nha_toi/features/profile/change_phone_screen.dart';
import 'package:ho_nha_toi/theme/app_theme.dart';
import 'package:ho_nha_toi/theme/theme_mode_provider.dart';

/// Tab Cá nhân: hồ sơ người dùng (từ GET /auth/me), danh sách dòng họ
/// đã tham gia (dữ liệu thật), cài đặt giao diện và đăng xuất.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final themeMode = ref.watch(themeModeProvider);
    final isLight = themeMode == ThemeMode.light;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Cá nhân'),
        backgroundColor: p.bg,
        foregroundColor: p.text,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          // Hồ sơ — dữ liệu thật từ /auth/me
          AsyncView<Map<String, dynamic>>(
            value: ref.watch(authMeProvider),
            onRetry: () => ref.invalidate(authMeProvider),
            builder: (user) => _profileCard(p, user),
          ),
          const SizedBox(height: 20),
          _sectionTitle(p, 'DÒNG HỌ CỦA TÔI'),
          const SizedBox(height: 8),
          // Danh sách dòng họ thật
          AsyncView<List<Map<String, dynamic>>>(
            value: ref.watch(myLineagesProvider),
            onRetry: () => ref.invalidate(myLineagesProvider),
            builder: (lineages) {
              if (lineages.isEmpty) {
                return Container(
                  padding: const EdgeInsets.all(20),
                  decoration: AppTheme.cardDecoration(p),
                  child: Text(
                    'Bạn chưa tham gia dòng họ nào.',
                    style: TextStyle(color: p.secondary, fontSize: 14),
                  ),
                );
              }
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: AppTheme.cardDecoration(p),
                child: Column(
                  children: [
                    for (var i = 0; i < lineages.length; i++) ...[
                      if (i > 0) Divider(color: p.border, height: 1),
                      _lineageRow(p, lineages[i], i == 0),
                    ],
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: 8),
          Text(
            'Dữ liệu mỗi dòng họ hoàn toàn tách biệt — thành viên họ này '
            'không thể xem bất kỳ dữ liệu nào của họ kia.',
            style: TextStyle(color: p.secondary, fontSize: 12),
          ),
          const SizedBox(height: 20),
          _sectionTitle(p, 'GIAO DIỆN'),
          const SizedBox(height: 8),
          Container(
            decoration: AppTheme.cardDecoration(p),
            child: SwitchListTile(
              title: Text(
                'Chế độ sáng',
                style:
                    TextStyle(color: p.text, fontWeight: FontWeight.w600),
              ),
              subtitle: Text(
                'Dễ đọc hơn vào ban ngày',
                style: TextStyle(color: p.secondary, fontSize: 13),
              ),
              value: isLight,
              onChanged: (_) => ref.read(themeModeProvider.notifier).toggle(),
              activeTrackColor: p.brand,
            ),
          ),
          const SizedBox(height: 20),
          _sectionTitle(p, 'TÀI KHOẢN'),
          const SizedBox(height: 8),
          Container(
            decoration: AppTheme.cardDecoration(p),
            child: ListTile(
              leading: Icon(Icons.phone_iphone, color: p.text),
              title: Text(
                'Đổi số điện thoại',
                style:
                    TextStyle(color: p.text, fontWeight: FontWeight.w600),
              ),
              subtitle: Text(
                'Giữ nguyên tài khoản và vai trò',
                style: TextStyle(color: p.secondary, fontSize: 13),
              ),
              trailing: Icon(Icons.chevron_right, color: p.secondary),
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => ChangePhoneScreen(
                    currentPhone:
                        ref.read(authMeProvider).valueOrNull?['phone']
                            as String?,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Container(
            decoration: AppTheme.cardDecoration(p),
            child: ListTile(
              leading: Icon(Icons.logout, color: p.live),
              title: Text(
                'Đăng xuất',
                style: TextStyle(
                    color: p.live, fontWeight: FontWeight.w600),
              ),
              onTap: () => _confirmLogout(context, ref),
            ),
          ),
          const SizedBox(height: 20),
          Center(
            child: Text(
              'HỌ NHÀ TÔI · Phiên bản 1.0',
              style: TextStyle(color: p.secondary, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _profileCard(AppPalette p, Map<String, dynamic> user) {
    final displayName = (user['displayName'] as String?) ?? 'Người dùng';
    final phone = (user['phone'] as String?) ?? '';
    final profile = user['profile'] as Map<String, dynamic>?;
    final fullName = profile?['fullName'] as String?;
    final initial =
        displayName.isNotEmpty ? displayName.characters.first : '?';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: AppTheme.cardDecoration(p),
      child: Column(
        children: [
          CircleAvatar(
            radius: 38,
            backgroundColor: p.brand,
            child: Text(
              initial,
              style: TextStyle(
                color: p.onBrand,
                fontWeight: FontWeight.w800,
                fontSize: 32,
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            displayName,
            style: TextStyle(
              color: p.text,
              fontWeight: FontWeight.w800,
              fontSize: 19,
            ),
          ),
          if (fullName != null && fullName != displayName) ...[
            const SizedBox(height: 2),
            Text(fullName,
                style: TextStyle(color: p.secondary, fontSize: 13)),
          ],
          if (phone.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(phone,
                style: TextStyle(color: p.secondary, fontSize: 13)),
          ],
        ],
      ),
    );
  }

  Future<void> _confirmLogout(BuildContext context, WidgetRef ref) async {
    final p = context.palette;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: p.surface,
        title: Text('Đăng xuất', style: TextStyle(color: p.text)),
        content: Text(
          'Bạn có chắc muốn đăng xuất khỏi thiết bị này?',
          style: TextStyle(color: p.secondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Hủy'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text('Đăng xuất', style: TextStyle(color: p.live)),
          ),
        ],
      ),
    );
    if (ok == true) {
      await ref.read(authStateProvider.notifier).logout();
    }
  }

  Widget _sectionTitle(AppPalette p, String text) => Text(
        text,
        style: TextStyle(
          color: p.secondary,
          fontWeight: FontWeight.w700,
          fontSize: 13,
          letterSpacing: 1.1,
        ),
      );

  /// Một dòng họ trong danh sách — dữ liệu thật từ API.
  Widget _lineageRow(
      AppPalette p, Map<String, dynamic> lineage, bool active) {
    final name = (lineage['name'] as String?) ?? 'Dòng họ';
    final hometown = (lineage['hometownProvince'] as String?) ?? '';
    final memberCount = lineage['memberCount'];
    final initial = name.isNotEmpty ? name.characters.first : '?';
    final sub = [
      if (memberCount != null) '$memberCount thành viên',
      if (hometown.isNotEmpty) hometown,
      lineageRoleLabel(
        lineage['myRole'] as String?,
        isOwner: lineage['isOwner'] == true,
      ),
    ].join(' · ');

    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: CircleAvatar(
        backgroundColor: active ? p.brand : p.elevated,
        child: Text(
          initial,
          style: TextStyle(
            color: active ? p.onBrand : p.text,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      title:
          Text(name, style: const TextStyle(fontWeight: FontWeight.w700)),
      subtitle: Text(sub, style: TextStyle(color: p.secondary, fontSize: 13)),
      trailing: active
          ? Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: p.brand.withAlpha(26),
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: p.brand),
              ),
              child: Text(
                'Đang xem',
                style: TextStyle(
                    color: p.brand,
                    fontSize: 11,
                    fontWeight: FontWeight.w700),
              ),
            )
          : null,
      onTap: () {},
    );
  }
}
