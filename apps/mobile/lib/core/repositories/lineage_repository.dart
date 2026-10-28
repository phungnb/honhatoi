import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ho_nha_toi/core/api_client.dart';
import 'package:ho_nha_toi/core/auth_state.dart';

/// Repository Dòng họ: đọc danh sách và chi tiết dòng họ của tôi.
///
/// Mọi dữ liệu đều đã được backend cô lập theo lineageId — app chỉ nhận
/// được các họ mà user là thành viên được duyệt.
class LineageRepository {
  LineageRepository(this._api);

  final ApiClient _api;

  /// GET /lineages — các dòng họ tôi đã tham gia (kèm vai trò của tôi).
  Future<List<Map<String, dynamic>>> myLineages() async {
    final data = await _api.getData('GET', '/lineages');
    final list = data['lineages'] as List<dynamic>? ?? const [];
    return list.map((e) => e as Map<String, dynamic>).toList();
  }

  /// GET /lineages/:id — chi tiết một dòng họ.
  Future<Map<String, dynamic>> getLineage(String id) async {
    final data = await _api.getData('GET', '/lineages/$id');
    return data['lineage'] as Map<String, dynamic>;
  }
}

final lineageRepositoryProvider = Provider<LineageRepository>(
  (ref) => LineageRepository(ApiClient.instance),
);

/// Danh sách dòng họ của tôi — tự tải lại khi đăng nhập/đăng xuất.
final myLineagesProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) {
  ref.watch(authStateProvider);
  return ref.watch(lineageRepositoryProvider).myLineages();
});

/// Nhãn tiếng Việt cho vai trò trong dòng họ.
String lineageRoleLabel(String? role) {
  switch (role) {
    case 'SYSTEM_ADMIN':
      return 'Quản trị hệ thống';
    case 'SENIOR_ADMIN':
      return 'Trưởng họ';
    case 'ADMIN':
      return 'Quản trị';
    case 'GENEALOGY_MANAGER':
      return 'Quản lý gia phả';
    case 'MEMBER':
      return 'Thành viên';
    case 'APP_MEMBER':
      return 'Thành viên app';
    case 'GUEST':
      return 'Khách';
    default:
      return 'Thành viên';
  }
}
