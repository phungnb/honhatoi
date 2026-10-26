import 'package:flutter/material.dart';
import 'package:ho_nha_toi/theme/app_theme.dart';

/// Mở hồ sơ thành viên khi chạm vào một người trên cây gia phả.
///
/// Hiển thị trạng thái còn sống/đã mất, vị trí phần mộ (khi đã mất)
/// và ghi chú — đúng yêu cầu hồ sơ thành viên của dự án.
Future<void> showMemberProfileSheet(
  BuildContext context,
  Map<String, dynamic> person,
) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (context) => _MemberProfileSheet(person: person),
  );
}

class _MemberProfileSheet extends StatelessWidget {
  const _MemberProfileSheet({required this.person});

  final Map<String, dynamic> person;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final name = (person['fullName'] as String?) ?? 'Chưa rõ tên';
    final nickname = person['nickname'] as String?;
    final deceased = person['dateOfDeath'] != null;
    final initial = name.isNotEmpty ? name.characters.first : '?';

    return Container(
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: p.border,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: p.elevated,
                    border: Border.all(
                      color: deceased ? p.warmAccent : p.brand,
                      width: 3,
                    ),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    initial,
                    style: TextStyle(
                      color: p.text,
                      fontWeight: FontWeight.w800,
                      fontSize: 30,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: TextStyle(
                          color: p.text,
                          fontWeight: FontWeight.w800,
                          fontSize: 20,
                        ),
                      ),
                      if (nickname != null && nickname.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          'Tên gọi ở nhà: $nickname',
                          style: TextStyle(
                            color: p.secondary,
                            fontSize: 14,
                          ),
                        ),
                      ],
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: (deceased ? p.warmAccent : p.brand)
                              .withAlpha(26),
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(
                            color: deceased ? p.warmAccent : p.brand,
                          ),
                        ),
                        child: Text(
                          deceased ? 'Đã mất' : 'Đang sống',
                          style: TextStyle(
                            color: deceased ? p.warmAccent : p.brand,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            _infoRow(
              p,
              Icons.cake_outlined,
              'Ngày sinh',
              _birthText(person),
            ),
            if (deceased)
              _infoRow(
                p,
                Icons.event_outlined,
                'Ngày mất',
                _dateText(person['dateOfDeath']),
              ),
            if (deceased &&
                (person['burialPlace'] as String?)?.isNotEmpty == true)
              _infoRow(
                p,
                Icons.place_outlined,
                'Phần mộ',
                person['burialPlace'] as String,
              ),
            _infoRow(
              p,
              Icons.home_outlined,
              'Quê quán',
              person['hometown'] as String?,
            ),
            _infoRow(
              p,
              Icons.location_on_outlined,
              'Nơi ở hiện tại',
              person['currentPlace'] as String?,
            ),
            _infoRow(
              p,
              Icons.work_outline,
              'Nghề nghiệp',
              person['occupation'] as String?,
            ),
            _infoRow(
              p,
              Icons.school_outlined,
              'Học vấn',
              person['education'] as String?,
            ),
            _infoRow(
              p,
              Icons.account_tree_outlined,
              'Chi',
              person['branch'] as String?,
            ),
            _infoRow(
              p,
              Icons.layers_outlined,
              'Thế hệ',
              person['generation'] == null
                  ? null
                  : 'Đời thứ ${person['generation']}',
            ),
            _infoRow(
              p,
              Icons.star_outline,
              'Vai trò trong họ',
              person['roleInLineage'] as String?,
            ),
            _infoRow(
              p,
              Icons.verified_outlined,
              'Trạng thái xác minh',
              _verificationLabel(person['verificationStatus'] as String?),
            ),
            // Ghi chú: luôn hiển thị (kể cả khi trống) để người dùng
            // biết hồ sơ có chỗ ghi chú.
            const SizedBox(height: 8),
            Text(
              'GHI CHÚ',
              style: TextStyle(
                color: p.secondary,
                fontWeight: FontWeight.w700,
                fontSize: 13,
                letterSpacing: 1.1,
              ),
            ),
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: AppTheme.cardDecoration(p),
              child: Text(
                (person['bio'] as String?)?.isNotEmpty == true
                    ? person['bio'] as String
                    : 'Chưa có ghi chú.',
                style: TextStyle(
                  color: (person['bio'] as String?)?.isNotEmpty == true
                      ? p.text
                      : p.secondary,
                  fontSize: 14,
                  height: 1.5,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Một dòng thông tin; tự ẩn khi giá trị trống.
  Widget _infoRow(
    AppPalette p,
    IconData icon,
    String label,
    String? value,
  ) {
    if (value == null || value.isEmpty) {
      return const SizedBox.shrink();
    }
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: p.secondary),
          const SizedBox(width: 12),
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: TextStyle(color: p.secondary, fontSize: 14),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                color: p.text,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _birthText(Map<String, dynamic> person) {
    if (person['birthYearOnly'] == true) {
      final raw = person['dateOfBirth'] as String?;
      if (raw != null && raw.length >= 4) return 'Năm ${raw.substring(0, 4)}';
      return '';
    }
    return _dateText(person['dateOfBirth']);
  }

  /// "12/03/1930" từ chuỗi ISO; trả '' khi không parse được.
  String _dateText(dynamic value) {
    if (value is! String || value.isEmpty) return '';
    final dt = DateTime.tryParse(value);
    if (dt == null) return value.length >= 10 ? value.substring(0, 10) : value;
    return '${dt.day.toString().padLeft(2, '0')}/'
        '${dt.month.toString().padLeft(2, '0')}/${dt.year}';
  }

  String _verificationLabel(String? status) {
    switch (status) {
      case 'verified':
        return 'Đã xác minh';
      case 'pending_verification':
        return 'Chờ xác minh';
      case 'disputed':
        return 'Đang tranh chấp';
      default:
        return 'Bản nháp';
    }
  }
}
