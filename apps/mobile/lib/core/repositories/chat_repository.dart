import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ho_nha_toi/core/api_client.dart';
import 'package:ho_nha_toi/core/auth_state.dart';

/// Repository Tin nhắn: danh sách hội thoại, tin nhắn và gửi tin nhắn.
class ChatRepository {
  ChatRepository(this._api);

  final ApiClient _api;

  /// GET /chat/conversations — danh sách hội thoại của tôi.
  Future<List<Map<String, dynamic>>> conversations() async {
    final data = await _api.getData('GET', '/chat/conversations');
    final list = data['conversations'] as List<dynamic>? ?? const [];
    return list.map((e) => e as Map<String, dynamic>).toList();
  }

  /// GET /chat/conversations/:id/messages — tin nhắn trong hội thoại.
  Future<List<Map<String, dynamic>>> messages(String conversationId) async {
    final data = await _api.getData(
      'GET',
      '/chat/conversations/$conversationId/messages',
    );
    final list = data['messages'] as List<dynamic>? ?? const [];
    return list.map((e) => e as Map<String, dynamic>).toList();
  }

  /// POST /chat/conversations/:id/messages — gửi tin nhắn văn bản.
  Future<Map<String, dynamic>> sendText(
    String conversationId,
    String text,
  ) async {
    final clientMessageId =
        '${DateTime.now().millisecondsSinceEpoch}-${Random().nextInt(1 << 32)}';
    final data = await _api.getData(
      'POST',
      '/chat/conversations/$conversationId/messages',
      body: {
        'clientMessageId': clientMessageId,
        'type': 'text',
        'content': text,
      },
    );
    return data['message'] as Map<String, dynamic>;
  }

  /// POST /chat/conversations/:id/read — đánh dấu đã đọc hội thoại.
  Future<void> markRead(String conversationId) async {
    await _api.getData('POST', '/chat/conversations/$conversationId/read');
  }
}

final chatRepositoryProvider = Provider<ChatRepository>(
  (ref) => ChatRepository(ApiClient.instance),
);

/// Danh sách hội thoại — tự tải lại khi đăng nhập/đăng xuất.
final conversationsProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) {
  ref.watch(authStateProvider);
  return ref.watch(chatRepositoryProvider).conversations();
});

/// Tin nhắn của một hội thoại.
final conversationMessagesProvider =
    FutureProvider.family<List<Map<String, dynamic>>, String>(
        (ref, conversationId) {
  ref.watch(authStateProvider);
  return ref.watch(chatRepositoryProvider).messages(conversationId);
});
