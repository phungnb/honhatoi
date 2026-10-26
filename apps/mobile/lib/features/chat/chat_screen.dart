import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ho_nha_toi/core/repositories/chat_repository.dart';
import 'package:ho_nha_toi/core/widgets/async_view.dart';
import 'package:ho_nha_toi/theme/app_theme.dart';
import 'chat_detail_screen.dart';

/// Tab Tin nhắn: danh sách hội thoại thật từ API.
///
/// Chạm vào hội thoại → màn hình chi tiết (tin nhắn + gửi tin).
/// Kéo xuống để tải mới.
class ChatScreen extends ConsumerWidget {
  const ChatScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tin nhắn'),
        backgroundColor: p.bg,
        foregroundColor: p.text,
        elevation: 0,
      ),
      body: AsyncView<List<Map<String, dynamic>>>(
        value: ref.watch(conversationsProvider),
        onRetry: () => ref.invalidate(conversationsProvider),
        builder: (conversations) {
          if (conversations.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  'Chưa có cuộc trò chuyện nào.\nTrưởng họ sẽ thêm bạn '
                  'vào phòng chat của dòng họ.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: p.secondary, fontSize: 14),
                ),
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(conversationsProvider);
              await ref.read(conversationsProvider.future);
            },
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: conversations.length,
              separatorBuilder: (_, __) =>
                  Divider(color: p.border, height: 1, indent: 72),
              itemBuilder: (context, index) {
                final c = conversations[index];
                final title = (c['title'] as String?) ?? 'Trò chuyện';
                final initial =
                    title.isNotEmpty ? title.characters.first : '?';
                final last =
                    c['lastMessage'] as Map<String, dynamic>?;
                final snippet = last == null
                    ? 'Chưa có tin nhắn'
                    : (last['recalled'] == true
                        ? 'Tin nhắn đã thu hồi'
                        : (last['content'] as String?) ??
                            'Đã gửi một tin nhắn');
                final unread = (c['unreadCount'] as num?)?.toInt() ?? 0;

                return ListTile(
                  leading: CircleAvatar(
                    radius: 24,
                    backgroundColor: p.elevated,
                    child: Text(
                      initial,
                      style: TextStyle(
                        color: p.text,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  title: Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontWeight: unread > 0
                          ? FontWeight.w800
                          : FontWeight.w700,
                      color: p.text,
                    ),
                  ),
                  subtitle: Text(
                    snippet,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: p.secondary, fontSize: 13),
                  ),
                  trailing: unread > 0
                      ? Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: p.brand,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            unread > 99 ? '99+' : '$unread',
                            style: TextStyle(
                              color: p.onBrand,
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        )
                      : null,
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => ChatDetailScreen(
                          conversationId: c['id'] as String,
                          title: title,
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          );
        },
      ),
    );
  }
}
