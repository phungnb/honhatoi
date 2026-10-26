import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ho_nha_toi/core/api_client.dart';
import 'package:ho_nha_toi/core/auth_state.dart';

/// Repository Thông báo: danh sách thông báo và số lượng chưa đọc.
class NotificationRepository {
  NotificationRepository(this._api);

  final ApiClient _api;

  /// GET /notifications — danh sách thông báo của tôi.
  Future<List<Map<String, dynamic>>> notifications() async {
    final data = await _api.getData('GET', '/notifications');
    final list = data['notifications'] as List<dynamic>? ?? const [];
    return list.map((e) => e as Map<String, dynamic>).toList();
  }

  /// POST /notifications/:id/read — đánh dấu một thông báo đã đọc.
  Future<void> markRead(String notificationId) async {
    await _api.getData('POST', '/notifications/$notificationId/read');
  }

  /// POST /notifications/read-all — đánh dấu tất cả đã đọc.
  Future<void> markAllRead() async {
    await _api.getData('POST', '/notifications/read-all');
  }
}

final notificationRepositoryProvider = Provider<NotificationRepository>(
  (ref) => NotificationRepository(ApiClient.instance),
);

/// Danh sách thông báo — tự tải lại khi đăng nhập/đăng xuất.
final notificationsProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) {
  ref.watch(authStateProvider);
  return ref.watch(notificationRepositoryProvider).notifications();
});

/// Số thông báo chưa đọc (đếm từ danh sách đã tải).
final unreadNotificationCountProvider = Provider<int>((ref) {
  final asyncList = ref.watch(notificationsProvider);
  return asyncList.maybeWhen(
    data: (list) => list.where((n) => n['isRead'] != true).length,
    orElse: () => 0,
  );
});
