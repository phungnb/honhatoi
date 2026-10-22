import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/app_theme.dart';
import '../../theme/theme_mode_provider.dart';

/// Tab Cá nhân: hồ sơ người dùng, danh sách dòng họ đã tham gia,
/// cài đặt quyền riêng tư và công tắc Sáng/Tối.
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
          // Hồ sơ
          Container(
            padding: const EdgeInsets.all(20),
            decoration: AppTheme.cardDecoration(p),
            child: Column(
              children: [
                CircleAvatar(
                  radius: 38,
                  backgroundColor: p.brand,
                  child: Text(
                    'B',
                    style: TextStyle(
                      color: p.onBrand,
                      fontWeight: FontWeight.w800,
                      fontSize: 32,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Ba Phùng Nguyễn',
                  style: TextStyle(
                    color: p.text,
                    fontWeight: FontWeight.w800,
                    fontSize: 19,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Đời thứ 3 · Chi trưởng · Đã xác minh',
                  style: TextStyle(color: p.secondary, fontSize: 13),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          _sectionTitle(p, 'DÒNG HỌ CỦA TÔI'),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: AppTheme.cardDecoration(p),
            child: Column(
              children: [
                _lineageRow(p, 'N', 'Họ Nguyễn tại Đồng Nai',
                    '28 thành viên · Đồng Nai', true),
                Divider(color: p.border, height: 1),
                _lineageRow(p, 'T', 'Họ Trần tại TP. Hồ Chí Minh',
                    '16 thành viên · TP. Hồ Chí Minh', false),
              ],
            ),
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
                style: TextStyle(
                    color: p.text, fontWeight: FontWeight.w600),
              ),
              subtitle: Text(
                'Dễ đọc hơn vào ban ngày',
                style: TextStyle(color: p.secondary, fontSize: 13),
              ),
              value: isLight,
              onChanged: (_) =>
                  ref.read(themeModeProvider.notifier).toggle(),
              activeTrackColor: p.brand,
            ),
          ),
          const SizedBox(height: 20),
          _sectionTitle(p, 'QUYỀN RIÊNG TƯ'),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: AppTheme.cardDecoration(p),
            child: Column(
              children: [
                _kvRow(p, 'Số điện thoại', 'Chỉ mình tôi', p.brand),
                Divider(color: p.border, height: 1),
                _kvRow(p, 'Ngày sinh', 'Thành viên dòng họ', null),
                Divider(color: p.border, height: 1),
                _kvRow(p, 'Đăng nhập bằng passkey', 'Đã bật', p.brand),
              ],
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

  Widget _sectionTitle(AppPalette p, String text) => Text(
        text,
        style: TextStyle(
          color: p.secondary,
          fontWeight: FontWeight.w700,
          fontSize: 13,
          letterSpacing: 1.1,
        ),
      );

  Widget _lineageRow(AppPalette p, String initial, String name,
      String sub, bool active) {
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
      title: Text(name,
          style: const TextStyle(fontWeight: FontWeight.w700)),
      subtitle:
          Text(sub, style: TextStyle(color: p.secondary, fontSize: 13)),
      trailing: active
          ? Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: 10, vertical: 4),
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

  Widget _kvRow(AppPalette p, String key, String value, Color? valueColor) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(key, style: TextStyle(color: p.secondary, fontSize: 14)),
          Text(
            value,
            style: TextStyle(
              color: valueColor ?? p.text,
              fontWeight: FontWeight.w600,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }
}
