import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ho_nha_toi/core/api_client.dart';
import 'package:ho_nha_toi/core/auth_state.dart';

/// Repository Gia phả: cây gia phả, tìm kiếm và chi tiết hồ sơ thành viên.
class GenealogyRepository {
  GenealogyRepository(this._api);

  final ApiClient _api;

  /// GET /genealogy/lineages/:id/tree — cây gia phả (mặc định 3 thế hệ).
  Future<Map<String, dynamic>> getTree(
    String lineageId, {
    int generations = 3,
  }) async {
    return _api.getData(
      'GET',
      '/genealogy/lineages/$lineageId/tree',
      query: {'generations': '$generations'},
    );
  }

  /// GET /genealogy/lineages/:id/persons?q=... — tìm kiếm hồ sơ trong họ.
  Future<List<Map<String, dynamic>>> searchPersons(
    String lineageId,
    String query,
  ) async {
    final data = await _api.getData(
      'GET',
      '/genealogy/lineages/$lineageId/persons',
      query: {'q': query},
    );
    final list = data['persons'] as List<dynamic>? ?? const [];
    return list.map((e) => e as Map<String, dynamic>).toList();
  }

  /// GET /genealogy/persons/:id — chi tiết một hồ sơ.
  Future<Map<String, dynamic>> getPerson(String personId) async {
    final data = await _api.getData('GET', '/genealogy/persons/$personId');
    return data['person'] as Map<String, dynamic>;
  }

  /// POST /genealogy/lineages/:id/persons — tạo người mới.
  ///
  /// Backend tự quyết: người có quyền sửa thì tạo thẳng (nháp),
  /// người chỉ có quyền đề xuất thì tạo đề xuất chờ duyệt.
  /// Trả về map `data`: chứa `person` khi tạo thẳng, `proposal`
  /// khi tạo đề xuất.
  Future<Map<String, dynamic>> createPerson(
    String lineageId,
    Map<String, dynamic> body,
  ) async {
    return _api.getData(
      'POST',
      '/genealogy/lineages/$lineageId/persons',
      body: body,
    );
  }

  /// PATCH /genealogy/persons/:id — sửa hồ sơ.
  Future<Map<String, dynamic>> updatePerson(
    String personId,
    Map<String, dynamic> body,
  ) async {
    final data =
        await _api.getData('PATCH', '/genealogy/persons/$personId', body: body);
    return data['person'] as Map<String, dynamic>? ?? data;
  }

  /// DELETE /genealogy/persons/:id — xóa mềm hồ sơ.
  Future<void> deletePerson(String personId) async {
    await _api.getData('DELETE', '/genealogy/persons/$personId');
  }

  /// POST /genealogy/lineages/:id/relationships — tạo quan hệ hai chiều.
  ///
  /// Backend tự tạo quan hệ ngược (cha ↔ con, vợ ↔ chồng).
  Future<void> createRelationship(
    String lineageId,
    String personId,
    String relatedPersonId,
    String relationshipType,
  ) async {
    await _api.getData(
      'POST',
      '/genealogy/lineages/$lineageId/relationships',
      body: {
        'personId': personId,
        'relatedPersonId': relatedPersonId,
        'relationshipType': relationshipType,
      },
    );
  }

  /// GET /genealogy/lineages/:id/export — tải file Excel gia phả.
  Future<List<int>> exportLineage(String lineageId) async {
    return _api.downloadBytes('/genealogy/lineages/$lineageId/export');
  }

  /// GET /genealogy/lineages/:id/backup — tải file JSON sao lưu.
  Future<List<int>> backupLineage(String lineageId) async {
    return _api.downloadBytes('/genealogy/lineages/$lineageId/backup');
  }
}

final genealogyRepositoryProvider = Provider<GenealogyRepository>(
  (ref) => GenealogyRepository(ApiClient.instance),
);

/// Cây gia phả của một dòng họ — tự tải lại khi đăng nhập/đăng xuất.
/// Tham số gồm lineageId và số thế hệ muốn tải (1–6).
final genealogyTreeProvider = FutureProvider.family<
    Map<String, dynamic>, ({String lineageId, int generations})>(
  (ref, arg) {
    ref.watch(authStateProvider);
    return ref
        .watch(genealogyRepositoryProvider)
        .getTree(arg.lineageId, generations: arg.generations);
  },
);
