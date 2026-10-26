import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ho_nha_toi/core/api_client.dart';
import 'package:ho_nha_toi/core/auth_state.dart';

/// Repository Sự kiện: sự kiện sắp tới của một dòng họ.
///
/// Giá trị `eventType` của backend (snake_case) và nhãn tiếng Việt:
/// ancestral_ceremony → Giỗ tổ · death_anniversary → Ngày giỗ ·
/// birthday → Sinh nhật · family_meeting → Họp họ ·
/// gathering → Gặp mặt · other → Sự kiện
class EventRepository {
  EventRepository(this._api);

  final ApiClient _api;

  /// GET /lineages/:id/events?upcomingOnly=true — sự kiện sắp tới.
  Future<List<Map<String, dynamic>>> upcomingEvents(String lineageId) async {
    final data = await _api.getData(
      'GET',
      '/lineages/$lineageId/events',
      query: {'upcomingOnly': 'true'},
    );
    final list = data['events'] as List<dynamic>? ?? const [];
    return list.map((e) => e as Map<String, dynamic>).toList();
  }

  /// GET /lineages/:id/events?upcomingOnly=false — toàn bộ sự kiện
  /// (kể cả đã qua) để vẽ lịch tháng trong tab Dòng họ.
  Future<List<Map<String, dynamic>>> allEvents(String lineageId) async {
    final data = await _api.getData(
      'GET',
      '/lineages/$lineageId/events',
      query: {'upcomingOnly': 'false'},
    );
    final list = data['events'] as List<dynamic>? ?? const [];
    return list.map((e) => e as Map<String, dynamic>).toList();
  }
}

final eventRepositoryProvider = Provider<EventRepository>(
  (ref) => EventRepository(ApiClient.instance),
);

/// Sự kiện sắp tới của một dòng họ.
final upcomingEventsProvider =
    FutureProvider.family<List<Map<String, dynamic>>, String>(
        (ref, lineageId) {
  ref.watch(authStateProvider);
  return ref.watch(eventRepositoryProvider).upcomingEvents(lineageId);
});

/// Toàn bộ sự kiện của một dòng họ (kể cả đã qua) — dùng cho lịch tháng.
final allEventsProvider =
    FutureProvider.family<List<Map<String, dynamic>>, String>(
        (ref, lineageId) {
  ref.watch(authStateProvider);
  return ref.watch(eventRepositoryProvider).allEvents(lineageId);
});

/// Nhãn tiếng Việt cho loại sự kiện.
String eventTypeLabel(String? eventType) {
  switch (eventType) {
    case 'ancestral_ceremony':
      return 'Giỗ tổ';
    case 'death_anniversary':
      return 'Ngày giỗ';
    case 'birthday':
      return 'Sinh nhật';
    case 'family_meeting':
      return 'Họp họ';
    case 'gathering':
      return 'Gặp mặt';
    default:
      return 'Sự kiện';
  }
}
