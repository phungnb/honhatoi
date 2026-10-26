import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ho_nha_toi/core/repositories/event_repository.dart';
import 'package:ho_nha_toi/core/repositories/lineage_repository.dart';
import 'package:ho_nha_toi/core/repositories/notification_repository.dart';
import 'package:ho_nha_toi/core/widgets/async_view.dart';
import 'package:ho_nha_toi/features/notifications/notifications_screen.dart';
import 'package:ho_nha_toi/theme/app_theme.dart';

/// Tab Trang chủ: thẻ chào dòng họ, thống kê nhanh và
/// danh sách sự kiện sắp tới (dữ liệu thật từ API).
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Trang chủ'),
        backgroundColor: p.bg,
        foregroundColor: p.text,
        elevation: 0,
        actions: [
          const _NotificationBell(),
        ],
      ),
      body: AsyncView<List<Map<String, dynamic>>>(
        value: ref.watch(myLineagesProvider),
        onRetry: () => ref.invalidate(myLineagesProvider),
        builder: (lineages) {
          if (lineages.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Text(
                  'Chào mừng đến với Họ Nhà Tôi!\nHãy tham gia một dòng họ '
                  'để xem tin tức và sự kiện.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: p.secondary, fontSize: 15),
                ),
              ),
            );
          }
          final first = lineages.first;
          final lineageId = first['id'] as String;
          return _HomeContent(p: p, lineage: first, lineageId: lineageId);
        },
      ),
    );
  }
}

/// Chuông thông báo trên app bar: chấm đỏ + số chưa đọc,
/// chạm để mở màn hình Thông báo.
class _NotificationBell extends ConsumerWidget {
  const _NotificationBell();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final unread = ref.watch(unreadNotificationCountProvider);

    return Stack(
      children: [
        IconButton(
          icon: const Icon(Icons.notifications_outlined),
          color: p.text,
          onPressed: () {
            Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => const NotificationsScreen(),
              ),
            );
          },
        ),
        if (unread > 0)
          Positioned(
            right: 8,
            top: 8,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              decoration: BoxDecoration(
                color: p.live,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                unread > 99 ? '99+' : '$unread',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _HomeContent extends ConsumerWidget {
  const _HomeContent({
    required this.p,
    required this.lineage,
    required this.lineageId,
  });

  final AppPalette p;
  final Map<String, dynamic> lineage;
  final String lineageId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final name = (lineage['name'] as String?) ?? 'Dòng họ';
    final hometown = (lineage['hometownProvince'] as String?) ?? '';
    final memberCount = lineage['memberCount']?.toString() ?? '–';
    final personCount = lineage['personCount']?.toString() ?? '–';
    final initial = name.isNotEmpty ? name.characters.first : '?';

    return ListView(
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
                  initial,
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
                      name,
                      style: TextStyle(
                        color: p.text,
                        fontWeight: FontWeight.w800,
                        fontSize: 18,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      hometown.isNotEmpty ? 'Quê quán: $hometown' : '',
                      style: TextStyle(color: p.secondary, fontSize: 13),
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
                    Text(memberCount, style: AppTheme.mono(color: p.brand)),
                    const SizedBox(height: 4),
                    Text('Thành viên',
                        style:
                            TextStyle(color: p.secondary, fontSize: 12)),
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
                    Text(personCount, style: AppTheme.mono(color: p.brand)),
                    const SizedBox(height: 4),
                    Text('Hồ sơ gia phả',
                        style:
                            TextStyle(color: p.secondary, fontSize: 12)),
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
        // Sự kiện thật từ GET /lineages/:id/events?upcomingOnly=true
        AsyncView<List<Map<String, dynamic>>>(
          value: ref.watch(upcomingEventsProvider(lineageId)),
          onRetry: () => ref.invalidate(upcomingEventsProvider(lineageId)),
          builder: (events) {
            if (events.isEmpty) {
              return Container(
                padding: const EdgeInsets.all(20),
                decoration: AppTheme.cardDecoration(p),
                child: Text(
                  'Chưa có sự kiện nào sắp tới.',
                  style: TextStyle(color: p.secondary, fontSize: 14),
                ),
              );
            }
            return Column(
              children: [
                for (final e in events) _EventCard(event: e, p: p),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _EventCard extends StatelessWidget {
  final Map<String, dynamic> event;
  final AppPalette p;

  const _EventCard({required this.event, required this.p});

  /// Màu chấm theo loại sự kiện: giỗ → vàng ấm, sinh nhật → xanh dương,
  /// họp họ → xanh lá (brand).
  Color _tagColor() {
    switch (event['eventType'] as String?) {
      case 'ancestral_ceremony':
      case 'death_anniversary':
        return p.warmAccent;
      case 'birthday':
        return p.xp;
      case 'family_meeting':
      case 'gathering':
        return p.brand;
      default:
        return p.secondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = (event['title'] as String?) ?? 'Sự kiện';
    final typeLabel = eventTypeLabel(event['eventType'] as String?);
    final location = (event['location'] as String?) ?? '';
    final startAt = DateTime.tryParse((event['startAt'] as String?) ?? '');
    final day = startAt != null
        ? startAt.day.toString().padLeft(2, '0')
        : '--';
    final monthLabel =
        startAt != null ? 'Th${startAt.month}' : '';
    final subtitle = [
      typeLabel,
      if (location.isNotEmpty) location,
    ].join(' · ');

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
                Text(day, style: AppTheme.mono(size: 20, color: p.brand)),
                Text(monthLabel,
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
                Text(title,
                    style: TextStyle(
                        color: p.text,
                        fontWeight: FontWeight.w700,
                        fontSize: 15)),
                const SizedBox(height: 2),
                Text(subtitle,
                    style: TextStyle(color: p.secondary, fontSize: 13)),
              ],
            ),
          ),
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(
              color: _tagColor(),
              shape: BoxShape.circle,
            ),
          ),
        ],
      ),
    );
  }
}
