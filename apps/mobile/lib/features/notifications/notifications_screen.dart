import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ho_nha_toi/core/repositories/notification_repository.dart';
import 'package:ho_nha_toi/core/widgets/async_view.dart';
import 'package:ho_nha_toi/theme/app_theme.dart';

/// Màn hình Thông báo: danh sách thông báo từ API.
///
/// Chạm vào một thông báo để đánh dấu đã đọc; nút "Đọc tất cả"
/// đánh dấu toàn bộ. Kéo xuống để tải mới.
class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Thông báo'),
        backgroundColor: p.bg,
        foregroundColor: p.text,
        elevation: 0,
        actions: [
          TextButton(
            onPressed: () async {
              await ref
                  .read(notificationRepositoryProvider)
                  .markAllRead();
              ref.invalidate(notificationsProvider);
            },
            child: Text(
              'Đọc tất cả',
              style: TextStyle(color: p.brand, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
      body: AsyncView<List<Map<String, dynamic>>>(
        value: ref.watch(notificationsProvider),
        onRetry: () => ref.invalidate(notificationsProvider),
        builder: (items) {
          if (items.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  'Chưa có thông báo nào.',
                  style: TextStyle(color: p.secondary, fontSize: 14),
                ),
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(notificationsProvider);
              await ref.read(notificationsProvider.future);
            },
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: items.length,
              separatorBuilder: (_, __) =>
                  Divider(color: p.border, height: 1, indent: 72),
              itemBuilder: (context, index) {
                final n = items[index];
                final isRead = n['isRead'] == true;
                final title = (n['title'] as String?) ?? 'Thông báo';
                final body = n['body'] as String?;
                final createdAt = n['createdAt'] as String?;
                return ListTile(
                  leading: Stack(
                    children: [
                      CircleAvatar(
                        radius: 24,
                        backgroundColor: p.elevated,
                        child: Icon(
                          _iconFor(n['type'] as String?),
                          color: isRead ? p.secondary : p.brand,
                        ),
                      ),
                      if (!isRead)
                        Positioned(
                          right: 0,
                          top: 0,
                          child: Container(
                            width: 12,
                            height: 12,
                            decoration: BoxDecoration(
                              color: p.brand,
                              shape: BoxShape.circle,
                              border:
                                  Border.all(color: p.bg, width: 2),
                            ),
                          ),
                        ),
                    ],
                  ),
                  title: Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontWeight:
                          isRead ? FontWeight.w600 : FontWeight.w800,
                      color: p.text,
                    ),
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (body != null && body.isNotEmpty)
                        Text(
                          body,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: p.secondary,
                            fontSize: 13,
                          ),
                        ),
                      const SizedBox(height: 2),
                      Text(
                        _relativeTime(createdAt),
                        style: TextStyle(
                          color: p.secondary,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                  onTap: () async {
                    if (!isRead) {
                      final id = n['id'] as String?;
                      if (id != null) {
                        await ref
                            .read(notificationRepositoryProvider)
                            .markRead(id);
                        ref.invalidate(notificationsProvider);
                      }
                    }
                  },
                );
              },
            ),
          );
        },
      ),
    );
  }

  IconData _iconFor(String? type) {
    switch (type) {
      case 'event_created':
      case 'event_updated':
      case 'event_cancelled':
      case 'event_reminder':
        return Icons.event_outlined;
      case 'chat_message':
      case 'chat_mention':
        return Icons.chat_bubble_outline;
      case 'genealogy_proposal':
      case 'genealogy_verified':
        return Icons.account_tree_outlined;
      case 'lineage_invite':
      case 'lineage_join':
        return Icons.groups_outlined;
      default:
        return Icons.notifications_outlined;
    }
  }

  /// "5 phút trước", "2 giờ trước", "Hôm qua", "12/03/2026".
  String _relativeTime(String? iso) {
    if (iso == null) return '';
    final dt = DateTime.tryParse(iso);
    if (dt == null) return '';
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'Vừa xong';
    if (diff.inMinutes < 60) return '${diff.inMinutes} phút trước';
    if (diff.inHours < 24) return '${diff.inHours} giờ trước';
    if (diff.inDays == 1) return 'Hôm qua';
    if (diff.inDays < 7) return '${diff.inDays} ngày trước';
    return '${dt.day.toString().padLeft(2, '0')}/'
        '${dt.month.toString().padLeft(2, '0')}/${dt.year}';
  }
}
