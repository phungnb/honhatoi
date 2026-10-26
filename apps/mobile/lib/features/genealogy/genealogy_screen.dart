import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ho_nha_toi/core/repositories/genealogy_repository.dart';
import 'package:ho_nha_toi/core/repositories/lineage_repository.dart';
import 'package:ho_nha_toi/core/widgets/async_view.dart';
import 'package:ho_nha_toi/theme/app_theme.dart';
import 'family_tree_view.dart';
import 'member_profile_sheet.dart';

/// Tab Gia phả: cây gia đình thật từ API.
///
/// - Dòng họ đang xem: lấy từ `myLineagesProvider`, mặc định họ đầu tiên,
///   chuyển được bằng chip chọn họ khi có nhiều họ.
/// - Cây tải 3 thế hệ mặc định; nút "Xem thêm thế hệ" tải sâu hơn (tối
///   đa 6 thế hệ theo giới hạn backend).
/// - Ô tìm kiếm → `searchPersons`, chạm kết quả để mở hồ sơ.
/// - Chạm vào một người trên cây → hồ sơ thành viên (trạng thái sống/mất,
///   phần mộ, ghi chú).
class GenealogyScreen extends ConsumerStatefulWidget {
  const GenealogyScreen({super.key});

  @override
  ConsumerState<GenealogyScreen> createState() => _GenealogyScreenState();
}

class _GenealogyScreenState extends ConsumerState<GenealogyScreen> {
  String? _selectedLineageId;
  int _generations = 3;

  final _searchController = TextEditingController();
  Timer? _debounce;
  String _debouncedQuery = '';
  Future<List<Map<String, dynamic>>>? _searchFuture;

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value, String lineageId) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      final query = value.trim();
      setState(() {
        _debouncedQuery = query;
        _searchFuture = query.isEmpty
            ? null
            : ref
                .read(genealogyRepositoryProvider)
                .searchPersons(lineageId, query);
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Gia phả'),
        backgroundColor: p.bg,
        foregroundColor: p.text,
        elevation: 0,
      ),
      body: AsyncView<List<Map<String, dynamic>>>(
        value: ref.watch(myLineagesProvider),
        onRetry: () => ref.invalidate(myLineagesProvider),
        builder: (lineages) {
          if (lineages.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  'Bạn chưa tham gia dòng họ nào. Hãy xin mã mời từ '
                  'trưởng họ để tham gia.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: p.secondary, fontSize: 14),
                ),
              ),
            );
          }

          // Giữ họ đang chọn; mặc định họ đầu tiên.
          final lineageId = _selectedLineageId ??=
              lineages.first['id'] as String;
          final lineageName = lineages
                  .firstWhere(
                    (l) => l['id'] == lineageId,
                    orElse: () => lineages.first,
                  )['name'] as String? ??
              'Dòng họ';

          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (lineages.length > 1)
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
                  child: Row(
                    children: [
                      for (final lineage in lineages) ...[
                        ChoiceChip(
                          label: Text(
                            (lineage['name'] as String?) ?? 'Dòng họ',
                          ),
                          selected: lineage['id'] == lineageId,
                          onSelected: (_) => setState(() {
                            _selectedLineageId =
                                lineage['id'] as String;
                            _generations = 3;
                            _debouncedQuery = '';
                            _searchFuture = null;
                            _searchController.clear();
                          }),
                        ),
                        const SizedBox(width: 8),
                      ],
                    ],
                  ),
                ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                child: TextField(
                  controller: _searchController,
                  onChanged: (v) => _onSearchChanged(v, lineageId),
                  decoration: InputDecoration(
                    hintText: 'Tìm thành viên trong $lineageName…',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _debouncedQuery.isEmpty
                        ? null
                        : IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              setState(() {
                                _debouncedQuery = '';
                                _searchFuture = null;
                              });
                            },
                          ),
                  ),
                ),
              ),
              Expanded(
                child: _debouncedQuery.isNotEmpty
                    ? _SearchResults(
                        future: _searchFuture,
                        onTap: (person) =>
                            showMemberProfileSheet(context, person),
                      )
                    : _TreeSection(
                        lineageId: lineageId,
                        generations: _generations,
                        onLoadMore: () => setState(() {
                          if (_generations < 6) _generations++;
                        }),
                        onPersonTap: (person) =>
                            showMemberProfileSheet(context, person),
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}

/// Danh sách kết quả tìm kiếm thành viên.
class _SearchResults extends StatelessWidget {
  const _SearchResults({required this.future, required this.onTap});

  final Future<List<Map<String, dynamic>>>? future;
  final void Function(Map<String, dynamic> person) onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    if (future == null) {
      return const SizedBox.shrink();
    }
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(
                'Không tìm được. Vui lòng thử lại.',
                style: TextStyle(color: p.secondary, fontSize: 14),
              ),
            ),
          );
        }
        final results = snapshot.data ?? const [];
        if (results.isEmpty) {
          return Center(
            child: Text(
              'Không tìm thấy thành viên nào.',
              style: TextStyle(color: p.secondary, fontSize: 14),
            ),
          );
        }
        return ListView.separated(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
          itemCount: results.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (context, index) {
            final person = results[index];
            final name = (person['fullName'] as String?) ?? 'Chưa rõ tên';
            final deceased = person['dateOfDeath'] != null;
            return Container(
              decoration: AppTheme.cardDecoration(p),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: p.elevated,
                  child: Text(
                    name.isNotEmpty ? name.characters.first : '?',
                    style: TextStyle(
                      color: p.text,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                title: Text(
                  name,
                  style: TextStyle(
                    color: p.text,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                subtitle: Text(
                  [
                    if ((person['branch'] as String?)?.isNotEmpty == true)
                      person['branch'] as String,
                    deceased ? 'Đã mất' : 'Đang sống',
                  ].join(' · '),
                  style: TextStyle(color: p.secondary, fontSize: 13),
                ),
                trailing: Icon(
                  Icons.chevron_right,
                  color: p.secondary,
                ),
                onTap: () => onTap(person),
              ),
            );
          },
        );
      },
    );
  }
}

/// Cây gia phả của họ đang xem + nút tải thêm thế hệ.
class _TreeSection extends ConsumerWidget {
  const _TreeSection({
    required this.lineageId,
    required this.generations,
    required this.onLoadMore,
    required this.onPersonTap,
  });

  final String lineageId;
  final int generations;
  final VoidCallback onLoadMore;
  final void Function(Map<String, dynamic> person) onPersonTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final treeAsync = ref.watch(
      genealogyTreeProvider(
        (lineageId: lineageId, generations: generations),
      ),
    );

    return AsyncView<Map<String, dynamic>>(
      value: treeAsync,
      onRetry: () => ref.invalidate(
        genealogyTreeProvider(
          (lineageId: lineageId, generations: generations),
        ),
      ),
      builder: (tree) {
        final root = tree['root'] as Map<String, dynamic>?;
        final persons = (tree['persons'] as List<dynamic>? ?? const [])
            .map((e) => e as Map<String, dynamic>)
            .toList();
        final relationships =
            (tree['relationships'] as List<dynamic>? ?? const [])
                .map((e) => e as Map<String, dynamic>)
                .toList();
        final hasMore = tree['has_more'] == true;

        return Column(
          children: [
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: FamilyTreeView(
                  root: root,
                  persons: persons,
                  relationships: relationships,
                  onPersonTap: onPersonTap,
                ),
              ),
            ),
            if (hasMore && generations < 6)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                child: OutlinedButton.icon(
                  onPressed: onLoadMore,
                  icon: const Icon(Icons.expand_more),
                  label: Text('Xem thêm thế hệ (đang $generations)'),
                ),
              )
            else
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                child: Text(
                  'Chạm vào một người để xem hồ sơ.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: p.secondary, fontSize: 13),
                ),
              ),
          ],
        );
      },
    );
  }
}
