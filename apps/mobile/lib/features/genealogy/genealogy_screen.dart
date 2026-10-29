import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:ho_nha_toi/core/repositories/genealogy_repository.dart';
import 'package:ho_nha_toi/core/repositories/lineage_repository.dart';
import 'package:ho_nha_toi/core/widgets/async_view.dart';
import 'package:ho_nha_toi/theme/app_theme.dart';
import 'add_person_screen.dart';
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

  /// Mở hồ sơ thành viên kèm các hành động thêm/sửa/xóa.
  ///
  /// Sau khi thêm/sửa/xóa thành công thì tải lại cây.
  Future<void> _openProfile(
    String lineageId,
    Map<String, dynamic> person,
    List<String> parentIds,
  ) async {
    final treeKey = (lineageId: lineageId, generations: _generations);

    Future<void> refreshTree() async {
      ref.invalidate(genealogyTreeProvider(treeKey));
    }

    await showMemberProfileSheet(
      context,
      person,
      onAddRelative: () async {
        final changed = await Navigator.of(context).push<bool>(
          MaterialPageRoute<bool>(
            builder: (_) => AddPersonScreen(
              lineageId: lineageId,
              anchorPerson: person,
              anchorParentIds: parentIds,
            ),
          ),
        );
        if (changed == true) await refreshTree();
      },
      onEdit: () async {
        final changed = await Navigator.of(context).push<bool>(
          MaterialPageRoute<bool>(
            builder: (_) => AddPersonScreen(
              lineageId: lineageId,
              existingPerson: person,
            ),
          ),
        );
        if (changed == true) await refreshTree();
      },
      onDelete: () async {
        try {
          await ref
              .read(genealogyRepositoryProvider)
              .deletePerson(person['id'] as String);
          await refreshTree();
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Đã xóa hồ sơ.')),
            );
          }
        } catch (_) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Xóa hồ sơ thất bại.')),
            );
          }
        }
      },
    );
  }

  /// Thêm người mới không gắn quan hệ (độc lập trong họ).
  Future<void> _addStandalone(String lineageId) async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => AddPersonScreen(lineageId: lineageId),
      ),
    );
    if (changed == true) {
      ref.invalidate(
        genealogyTreeProvider(
          (lineageId: lineageId, generations: _generations),
        ),
      );
    }
  }

  /// Xuất gia phả ra file rồi mở hộp thoại chia sẻ/lưu file.
  ///
  /// [kind] = 'excel' (bảng tính 3 sheet) hoặc 'backup' (JSON sao lưu
  /// toàn bộ để khôi phục sau này).
  Future<void> _export(
    String lineageId,
    String lineageName,
    String kind,
  ) async {
    try {
      final repo = ref.read(genealogyRepositoryProvider);
      final bytes = kind == 'backup'
          ? await repo.backupLineage(lineageId)
          : await repo.exportLineage(lineageId);
      final dir = await getTemporaryDirectory();
      final filename =
          kind == 'backup' ? 'gia-pha-backup.json' : 'gia-pha.xlsx';
      final file = File('${dir.path}/$filename');
      await file.writeAsBytes(bytes);
      await Share.shareXFiles(
        [XFile(file.path)],
        text: kind == 'backup'
            ? 'Bản sao lưu gia phả $lineageName'
            : 'Gia phả $lineageName',
      );
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Xuất file thất bại. Thử lại.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final lineagesAsync = ref.watch(myLineagesProvider);
    final loadedLineages = lineagesAsync.valueOrNull ?? const [];
    // Họ đang xem: đã chọn thì giữ, chưa thì mặc định họ đầu tiên.
    final effectiveLineageId = _selectedLineageId ??
        (loadedLineages.isNotEmpty
            ? loadedLineages.first['id'] as String
            : null);
    final effectiveLineageName = loadedLineages.isEmpty
        ? null
        : (loadedLineages
                .firstWhere(
                  (l) => l['id'] == effectiveLineageId,
                  orElse: () => loadedLineages.first,
                )['name'] as String?) ??
            'Dòng họ';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Gia phả'),
        backgroundColor: p.bg,
        foregroundColor: p.text,
        elevation: 0,
        actions: [
          if (effectiveLineageId != null)
            PopupMenuButton<String>(
              icon: const Icon(Icons.download_outlined),
              tooltip: 'Xuất / Sao lưu',
              onSelected: (kind) => _export(
                effectiveLineageId,
                effectiveLineageName ?? 'Dòng họ',
                kind,
              ),
              itemBuilder: (context) => const [
                PopupMenuItem(
                  value: 'excel',
                  child: Text('Xuất Excel'),
                ),
                PopupMenuItem(
                  value: 'backup',
                  child: Text('Sao lưu JSON'),
                ),
              ],
            ),
        ],
      ),
      floatingActionButton: effectiveLineageId == null
          ? null
          : FloatingActionButton(
              onPressed: () => _addStandalone(effectiveLineageId),
              tooltip: 'Thêm người mới',
              child: const Icon(Icons.person_add_outlined),
            ),
      body: AsyncView<List<Map<String, dynamic>>>(
        value: lineagesAsync,
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

          final lineageId = effectiveLineageId ??
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
                        onTap: (person) => _openProfile(
                          lineageId,
                          person,
                          const [],
                        ),
                      )
                    : _TreeSection(
                        lineageId: lineageId,
                        generations: _generations,
                        onLoadMore: () => setState(() {
                          if (_generations < 6) _generations++;
                        }),
                        onPersonTap: (person, parentIds) =>
                            _openProfile(lineageId, person, parentIds),
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

/// Chế độ hiển thị cây gia phả (ngang hàng web: dọc / ngang / danh sách).
enum _TreeMode { vertical, horizontal, list }

/// Cây gia phả của họ đang xem + nút tải thêm thế hệ + chuyển chế độ xem.
class _TreeSection extends ConsumerStatefulWidget {
  const _TreeSection({
    required this.lineageId,
    required this.generations,
    required this.onLoadMore,
    required this.onPersonTap,
  });

  final String lineageId;
  final int generations;
  final VoidCallback onLoadMore;

  /// Chạm vào người + danh sách id cha/mẹ của người đó (để thêm
  /// anh/chị/em qua cha/mẹ chung).
  final void Function(Map<String, dynamic> person, List<String> parentIds)
      onPersonTap;

  @override
  ConsumerState<_TreeSection> createState() => _TreeSectionState();
}

class _TreeSectionState extends ConsumerState<_TreeSection> {
  _TreeMode _mode = _TreeMode.vertical;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final treeAsync = ref.watch(
      genealogyTreeProvider(
        (lineageId: widget.lineageId, generations: widget.generations),
      ),
    );

    return AsyncView<Map<String, dynamic>>(
      value: treeAsync,
      onRetry: () => ref.invalidate(
        genealogyTreeProvider(
          (lineageId: widget.lineageId, generations: widget.generations),
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

        // Id cha/mẹ của mỗi người (quan hệ parent/adoptive_parent mà
        // người đó là relatedPersonId) — dùng để thêm anh/chị/em.
        List<String> parentIdsOf(String personId) {
          return relationships
              .where((r) =>
                  (r['relationshipType'] == 'parent' ||
                      r['relationshipType'] == 'adoptive_parent') &&
                  r['relatedPersonId'] == personId)
              .map((r) => r['personId'] as String)
              .toList();
        }

        // Danh sách sắp theo đời rồi tên (chế độ danh sách).
        final sortedPersons = [...persons]
          ..sort((a, b) {
            final ga = a['generation'] as int? ?? 999;
            final gb = b['generation'] as int? ?? 999;
            if (ga != gb) return ga.compareTo(gb);
            return ((a['fullName'] as String?) ?? '')
                .compareTo((b['fullName'] as String?) ?? '');
          });

        return Column(
          children: [
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
              child: Row(
                children: [
                  _modeChip('Cây dọc', _TreeMode.vertical),
                  const SizedBox(width: 8),
                  _modeChip('Cây ngang', _TreeMode.horizontal),
                  const SizedBox(width: 8),
                  _modeChip('Danh sách', _TreeMode.list),
                ],
              ),
            ),
            Expanded(
              child: _mode == _TreeMode.list
                  ? _PersonList(
                      persons: sortedPersons,
                      onTap: (person) => widget.onPersonTap(
                        person,
                        parentIdsOf(person['id'] as String),
                      ),
                    )
                  : Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: FamilyTreeView(
                        root: root,
                        persons: persons,
                        relationships: relationships,
                        horizontal: _mode == _TreeMode.horizontal,
                        onPersonTap: (person) => widget.onPersonTap(
                          person,
                          parentIdsOf(person['id'] as String),
                        ),
                      ),
                    ),
            ),
            if (hasMore && widget.generations < 6)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                child: OutlinedButton.icon(
                  onPressed: widget.onLoadMore,
                  icon: const Icon(Icons.expand_more),
                  label: Text(
                    'Xem thêm thế hệ (đang ${widget.generations})',
                  ),
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

  Widget _modeChip(String label, _TreeMode mode) {
    return ChoiceChip(
      label: Text(label),
      selected: _mode == mode,
      onSelected: (_) => setState(() => _mode = mode),
    );
  }
}

/// Danh sách thành viên (chế độ xem Danh sách của cây gia phả).
class _PersonList extends StatelessWidget {
  const _PersonList({required this.persons, required this.onTap});

  final List<Map<String, dynamic>> persons;
  final void Function(Map<String, dynamic> person) onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    if (persons.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            'Dòng họ chưa có hồ sơ gia phả nào.',
            textAlign: TextAlign.center,
            style: TextStyle(color: p.secondary, fontSize: 14),
          ),
        ),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      itemCount: persons.length,
      itemBuilder: (context, index) {
        final person = persons[index];
        final name = (person['fullName'] as String?) ?? 'Chưa rõ tên';
        final deceased = person['dateOfDeath'] != null;
        final generation = person['generation'] as int?;
        final branch = person['branch'] as String?;
        final detail = [
          if (generation != null) 'Đời $generation',
          if (branch != null && branch.isNotEmpty) branch,
        ].join(' · ');
        return Card(
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: p.elevated,
              child: Text(
                name.isNotEmpty ? name.characters.first : '?',
                style: TextStyle(
                  color: deceased ? p.warmAccent : p.brand,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            title: Text(name),
            subtitle: detail.isEmpty ? null : Text(detail),
            trailing: Text(
              deceased ? 'Đã mất' : 'Còn sống',
              style: TextStyle(
                color: deceased ? p.warmAccent : p.brand,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
            onTap: () => onTap(person),
          ),
        );
      },
    );
  }
}
