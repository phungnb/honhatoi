import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

/// Dữ liệu mẫu cho một sự kiện.
class _SampleEvent {
  final String day;
  final String month;
  final String title;
  final String subtitle;
  final Color tagColor;

  const _SampleEvent(
    this.day,
    this.month,
    this.title,
    this.subtitle,
    this.tagColor,
  );
}

/// Tab Trang chủ: thẻ chào dòng họ và danh sách sự kiện mẫu.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final events = [
      _SampleEvent('22', 'Th10', 'Giỗ cụ Nguyễn Văn Tổ',
          'Ngày mai · Nhà thờ họ', p.warmAccent),
      _SampleEvent('25', 'Th10', 'Sinh nhật bé Minh Anh',
          'Tròn 6 tuổi · Chi 2', p.xp),
      _SampleEvent('20', 'Th12', 'Họp họ cuối năm',
          '8h sáng · 86 đã đăng ký', p.brand),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Trang chủ'),
        backgroundColor: p.bg,
        foregroundColor: p.text,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          // Thẻ chào dòng họ
          Container(
            padding: const EdgeInsets.all(18),
            decoration: AppTheme.cardDecoration(p),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: p.brand,
                  child: Text(
                    'N',
                    style: TextStyle(
                      color: p.onBrand,
                      fontWeight: FontWeight.w800,
                      fontSize: 24,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Họ Nguyễn tại Đồng Nai',
                        style: TextStyle(
                          color: p.text,
                          fontWeight: FontWeight.w800,
                          fontSize: 18,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Quê quán: Đồng Nai · Nhà thờ họ: ấp Tân Lập',
                        style:
                            TextStyle(color: p.secondary, fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          // Thống kê nhanh
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: AppTheme.cardDecoration(p),
                  child: Column(
                    children: [
                      Text('28',
                          style: AppTheme.mono(color: p.brand)),
                      const SizedBox(height: 4),
                      Text('Thành viên',
                          style: TextStyle(
                              color: p.secondary, fontSize: 12)),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: AppTheme.cardDecoration(p),
                  child: Column(
                    children: [
                      Text('4',
                          style: AppTheme.mono(color: p.brand)),
                      const SizedBox(height: 4),
                      Text('Thế hệ',
                          style: TextStyle(
                              color: p.secondary, fontSize: 12)),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Text(
            'SỰ KIỆN SẮP TỚI',
            style: TextStyle(
              color: p.secondary,
              fontWeight: FontWeight.w700,
              fontSize: 13,
              letterSpacing: 1.1,
            ),
          ),
          const SizedBox(height: 10),
          for (final e in events) _EventCard(event: e, p: p),
        ],
      ),
    );
  }
}

class _EventCard extends StatelessWidget {
  final _SampleEvent event;
  final AppPalette p;

  const _EventCard({required this.event, required this.p});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: AppTheme.cardDecoration(p),
      child: Row(
        children: [
          Container(
            width: 54,
            padding: const EdgeInsets.symmetric(vertical: 8),
            decoration: BoxDecoration(
              color: p.elevated,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: p.border),
            ),
            child: Column(
              children: [
                Text(event.day,
                    style: AppTheme.mono(
                        size: 20, color: p.brand)),
                Text(event.month,
                    style: TextStyle(
                        color: p.secondary,
                        fontSize: 11,
                        fontWeight: FontWeight.w700)),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(event.title,
                    style: TextStyle(
                        color: p.text,
                        fontWeight: FontWeight.w700,
                        fontSize: 15)),
                const SizedBox(height: 2),
                Text(event.subtitle,
                    style:
                        TextStyle(color: p.secondary, fontSize: 13)),
              ],
            ),
          ),
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(
              color: event.tagColor,
              shape: BoxShape.circle,
            ),
          ),
        ],
      ),
    );
  }
}
