import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ho_nha_toi/core/auth_state.dart';
import 'package:ho_nha_toi/core/repositories/chat_repository.dart';
import 'package:ho_nha_toi/core/widgets/async_view.dart';
import 'package:ho_nha_toi/theme/app_theme.dart';

/// Màn hình chi tiết hội thoại.
///
/// WebSocket realtime không chạy trên Vercel serverless nên màn hình này
/// dùng polling: tự tải lại tin nhắn mỗi 10 giây + kéo để tải mới.
/// Gửi tin nhắn qua REST (idempotent theo clientMessageId).
class ChatDetailScreen extends ConsumerStatefulWidget {
  const ChatDetailScreen({
    super.key,
    required this.conversationId,
    required this.title,
  });

  final String conversationId;
  final String title;

  @override
  ConsumerState<ChatDetailScreen> createState() => _ChatDetailScreenState();
}

class _ChatDetailScreenState extends ConsumerState<ChatDetailScreen> {
  final _inputController = TextEditingController();
  Timer? _pollTimer;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    // Đánh dấu đã đọc khi mở hội thoại (lỗi thì bỏ qua).
    ref.read(chatRepositoryProvider).markRead(widget.conversationId).then(
      (_) => ref.invalidate(conversationsProvider),
      onError: (_) {},
    );
    // Polling mỗi 10 giây để nhận tin mới (thay cho WebSocket).
    _pollTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      if (mounted) {
        ref.invalidate(conversationMessagesProvider(widget.conversationId));
      }
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _inputController.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _inputController.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      await ref
          .read(chatRepositoryProvider)
          .sendText(widget.conversationId, text);
      _inputController.clear();
      ref.invalidate(conversationMessagesProvider(widget.conversationId));
      ref.invalidate(conversationsProvider);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Gửi tin nhắn thất bại. Thử lại.')),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final myId = ref.watch(authStateProvider).userId;

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        backgroundColor: p.bg,
        foregroundColor: p.text,
        elevation: 0,
      ),
      body: Column(
        children: [
          Expanded(
            child: AsyncView<List<Map<String, dynamic>>>(
              value: ref.watch(
                conversationMessagesProvider(widget.conversationId),
              ),
              onRetry: () => ref.invalidate(
                conversationMessagesProvider(widget.conversationId),
              ),
              builder: (messages) {
                if (messages.isEmpty) {
                  return Center(
                    child: Text(
                      'Chưa có tin nhắn nào.\nHãy gửi tin đầu tiên!',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: p.secondary, fontSize: 14),
                    ),
                  );
                }
                // API trả mới nhất trước; ListView đảo chiều để
                // tin mới nhất nằm dưới cùng như app chat thường.
                return RefreshIndicator(
                  onRefresh: () async {
                    ref.invalidate(
                      conversationMessagesProvider(widget.conversationId),
                    );
                    await ref.read(
                      conversationMessagesProvider(widget.conversationId)
                          .future,
                    );
                  },
                  child: ListView.builder(
                    reverse: true,
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                    itemCount: messages.length,
                    itemBuilder: (context, index) {
                      final m = messages[index];
                      final isMine = m['senderId'] == myId;
                      return _MessageBubble(
                        message: m,
                        isMine: isMine,
                      );
                    },
                  ),
                );
              },
            ),
          ),
          Container(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
            decoration: BoxDecoration(
              color: p.surface,
              border: Border(top: BorderSide(color: p.border)),
            ),
            child: SafeArea(
              top: false,
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _inputController,
                      minLines: 1,
                      maxLines: 4,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _send(),
                      decoration: const InputDecoration(
                        hintText: 'Nhắn tin…',
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _sending ? null : _send,
                    icon: _sending
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                            ),
                          )
                        : const Icon(Icons.send),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Một bong bóng tin nhắn: của mình thì phải, xanh lá; của người khác
/// thì trái, nền elevated, kèm tên người gửi.
class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message, required this.isMine});

  final Map<String, dynamic> message;
  final bool isMine;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final recalled = message['recalled'] == true;
    final content = recalled
        ? 'Tin nhắn đã thu hồi'
        : (message['content'] as String?) ?? '';
    final senderName = message['senderName'] as String?;
    final createdAt = message['createdAt'] as String?;
    final time = _timeText(createdAt);

    final bubble = Container(
      constraints: BoxConstraints(
        maxWidth: MediaQuery.of(context).size.width * 0.75,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: isMine ? p.brand : p.elevated,
        borderRadius: BorderRadius.only(
          topLeft: const Radius.circular(18),
          topRight: const Radius.circular(18),
          bottomLeft: Radius.circular(isMine ? 18 : 4),
          bottomRight: Radius.circular(isMine ? 4 : 18),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isMine && senderName != null && senderName.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 2),
              child: Text(
                senderName,
                style: TextStyle(
                  color: p.brand,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          Text(
            content,
            style: TextStyle(
              color: isMine ? p.onBrand : p.text,
              fontSize: 15,
              fontStyle: recalled ? FontStyle.italic : FontStyle.normal,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            time,
            style: TextStyle(
              color: (isMine ? p.onBrand : p.secondary).withAlpha(180),
              fontSize: 11,
            ),
          ),
        ],
      ),
    );

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment:
            isMine ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [bubble],
      ),
    );
  }

  /// "14:32" nếu hôm nay, "Hôm qua 14:32", còn lại "12/03 14:32".
  String _timeText(String? iso) {
    if (iso == null) return '';
    final dt = DateTime.tryParse(iso);
    if (dt == null) return '';
    final hh = dt.hour.toString().padLeft(2, '0');
    final mm = dt.minute.toString().padLeft(2, '0');
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final day = DateTime(dt.year, dt.month, dt.day);
    if (day == today) return '$hh:$mm';
    if (day == today.subtract(const Duration(days: 1))) {
      return 'Hôm qua $hh:$mm';
    }
    return '${dt.day.toString().padLeft(2, '0')}/'
        '${dt.month.toString().padLeft(2, '0')} $hh:$mm';
  }
}
