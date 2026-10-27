import 'package:flutter/material.dart';
import 'package:ho_nha_toi/theme/app_theme.dart';

/// Một "nút" trên cây: một người, hoặc một cặp vợ chồng.
///
/// Con cái luôn gắn vào nút của cha/mẹ (cặp vợ chồng tính là một nút),
/// nên cây vẽ gọn và đúng truyền thống gia phả.
class _TreeUnit {
  _TreeUnit(this.members);

  /// 1 người (độc thân) hoặc 2 người (vợ chồng).
  final List<Map<String, dynamic>> members;
  final List<_TreeUnit> children = [];
  int level = 0;

  /// Bề rộng vùng cây con (đã tính đệ quy), dùng để xếp các nút không
  /// chồng lên nhau.
  double span = 0;

  /// Tọa độ tâm nút (đã tính sau khi xếp layout).
  double centerX = 0;
}

/// Vẽ cây gia phả thật từ dữ liệu API.
///
/// Dữ liệu đầu vào đúng định dạng `GET /genealogy/lineages/:id/tree`:
/// `root` (có thể null), `persons`, `relationships`, `has_more`.
///
/// Cách xếp:
/// - Vợ/chồng ghép thành một nút; con gắn vào nút cha/mẹ.
/// - Bề rộng mỗi nút = max(bề rộng bản thân, tổng bề rộng các nút con),
///   nên các nhánh không bao giờ chồng lên nhau.
/// - Chạm vào một người → [onPersonTap] để mở hồ sơ.
/// - [horizontal] = true: cây chạy từ trái sang phải (đời càng sâu
///   càng sang phải), vợ chồng xếp chồng dọc — chỉ là hoán đổi tọa
///   độ x/y của chế độ dọc nên đường nối vẫn khớp tâm vòng tròn.
class FamilyTreeView extends StatelessWidget {
  const FamilyTreeView({
    super.key,
    required this.root,
    required this.persons,
    required this.relationships,
    required this.onPersonTap,
    this.horizontal = false,
  });

  final Map<String, dynamic>? root;
  final List<Map<String, dynamic>> persons;
  final List<Map<String, dynamic>> relationships;
  final void Function(Map<String, dynamic> person) onPersonTap;

  /// Chế độ ngang (đời chảy từ trái sang phải).
  final bool horizontal;

  /// Bề rộng một nút người (vòng tròn + tên bên dưới).
  static const double nodeWidth = 96;

  /// Khoảng cách giữa hai vòng tròn trong một cặp vợ chồng.
  static const double coupleGap = 16;

  /// Khoảng cách tối thiểu giữa hai nhánh kề nhau.
  static const double siblingGap = 24;

  /// Chiều cao một tầng (nút + khoảng nối xuống tầng dưới).
  static const double levelHeight = 172;

  /// Bán kính vòng tròn avatar.
  static const double nodeRadius = 28;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final layout = _buildLayout();
    if (layout == null) {
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

    final levelCount = layout.levels.length;
    // Chế độ dọc: rộng = tổng bề rộng, cao = số tầng × chiều cao tầng.
    // Chế độ ngang: hoán đổi hai chiều (cộng thêm bề rộng nút vì nút
    // chảy sang phải từ vị trí tầng).
    final canvasWidth = horizontal
        ? levelCount * levelHeight + nodeWidth + 32
        : layout.totalWidth;
    final canvasHeight = horizontal
        ? layout.totalWidth
        : levelCount * levelHeight + 32;

    return SingleChildScrollView(
      scrollDirection: Axis.vertical,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: SizedBox(
          width: canvasWidth,
          height: canvasHeight,
          child: Stack(
            children: [
              CustomPaint(
                size: Size(canvasWidth, canvasHeight),
                painter: _ConnectorPainter(layout, p, horizontal),
              ),
              for (final unit in layout.units)
                for (var i = 0; i < unit.members.length; i++)
                  Positioned(
                    left: horizontal
                        ? unit.level * levelHeight + 16
                        : _nodeCenterX(unit, i) - nodeWidth / 2,
                    top: horizontal
                        ? _nodeCenterX(unit, i) - nodeRadius
                        : unit.level * levelHeight + 16,
                    width: nodeWidth,
                    child: _PersonNode(
                      person: unit.members[i],
                      onTap: () => onPersonTap(unit.members[i]),
                    ),
                  ),
            ],
          ),
        ),
      ),
    );
  }

  /// Tâm X của người thứ [index] trong nút [unit].
  double _nodeCenterX(_TreeUnit unit, int index) {
    if (unit.members.length == 1) return unit.centerX;
    // Cặp vợ chồng: hai vòng tròn cách đều tâm nút.
    final offset = (nodeWidth + coupleGap) / 2;
    return index == 0 ? unit.centerX - offset : unit.centerX + offset;
  }

  _Layout? _buildLayout() {
    if (root == null || persons.isEmpty) return null;
    final byId = <String, Map<String, dynamic>>{};
    for (final person in persons) {
      final id = person['id'] as String?;
      if (id != null) byId[id] = person;
    }
    final rootId = root!['id'] as String?;
    if (rootId == null || !byId.containsKey(rootId)) return null;

    // Ghép vợ/chồng thành một nút (mỗi người chỉ thuộc một nút).
    final spouseOf = <String, String>{};
    for (final rel in relationships) {
      final type = rel['relationshipType'] as String?;
      if (type != 'spouse' && type != 'ex_spouse') continue;
      final a = rel['personId'] as String?;
      final b = rel['relatedPersonId'] as String?;
      if (a == null || b == null) continue;
      if (!byId.containsKey(a) || !byId.containsKey(b)) continue;
      if (spouseOf.containsKey(a) || spouseOf.containsKey(b)) continue;
      spouseOf[a] = b;
      spouseOf[b] = a;
    }

    final unitOf = <String, _TreeUnit>{};
    _TreeUnit unitFor(String personId) {
      if (unitOf.containsKey(personId)) return unitOf[personId]!;
      final spouseId = spouseOf[personId];
      final members = <Map<String, dynamic>>[byId[personId]!];
      if (spouseId != null && byId.containsKey(spouseId)) {
        members.add(byId[spouseId]!);
      }
      final unit = _TreeUnit(members);
      for (final m in members) {
        unitOf[m['id'] as String] = unit;
      }
      return unit;
    }

    // Con gắn vào nút cha/mẹ (tránh trùng khi cả hai vợ chồng đều
    // có quan hệ cha/mẹ với cùng một đứa con).
    for (final rel in relationships) {
      final type = rel['relationshipType'] as String?;
      if (type != 'parent' && type != 'adoptive_parent') continue;
      final parentId = rel['personId'] as String?;
      final childId = rel['relatedPersonId'] as String?;
      if (parentId == null || childId == null) continue;
      if (!byId.containsKey(parentId) || !byId.containsKey(childId)) {
        continue;
      }
      final parentUnit = unitFor(parentId);
      final childUnit = unitFor(childId);
      if (parentUnit != childUnit && !parentUnit.children.contains(childUnit)) {
        parentUnit.children.add(childUnit);
      }
    }

    final rootUnit = unitFor(rootId);

    // Gán tầng bằng BFS từ nút gốc.
    final levels = <List<_TreeUnit>>[];
    final queue = <_TreeUnit>[rootUnit];
    final seen = <_TreeUnit>{rootUnit};
    rootUnit.level = 0;
    while (queue.isNotEmpty) {
      final unit = queue.removeAt(0);
      while (levels.length <= unit.level) {
        levels.add(<_TreeUnit>[]);
      }
      levels[unit.level].add(unit);
      for (final child in unit.children) {
        if (seen.add(child)) {
          child.level = unit.level + 1;
          queue.add(child);
        }
      }
    }

    // Bề rộng vùng cây con (đệ quy, từ dưới lên).
    double spanOf(_TreeUnit unit) {
      final ownWidth =
          unit.members.length == 1 ? nodeWidth : nodeWidth * 2 + coupleGap;
      if (unit.children.isEmpty) {
        unit.span = ownWidth;
        return unit.span;
      }
      var childrenSpan = 0.0;
      for (var i = 0; i < unit.children.length; i++) {
        if (i > 0) childrenSpan += siblingGap;
        childrenSpan += spanOf(unit.children[i]);
      }
      unit.span = ownWidth > childrenSpan ? ownWidth : childrenSpan;
      return unit.span;
    }

    final totalSpan = spanOf(rootUnit);
    const padding = 24.0;
    final totalWidth = totalSpan + padding * 2;

    // Xếp tọa độ từ trên xuống: nút cha ở giữa vùng các nút con.
    void place(_TreeUnit unit, double centerX) {
      unit.centerX = centerX;
      if (unit.children.isEmpty) return;
      var childrenSpan = 0.0;
      for (var i = 0; i < unit.children.length; i++) {
        if (i > 0) childrenSpan += siblingGap;
        childrenSpan += unit.children[i].span;
      }
      var x = centerX - childrenSpan / 2;
      for (final child in unit.children) {
        place(child, x + child.span / 2);
        x += child.span + siblingGap;
      }
    }

    place(rootUnit, totalWidth / 2);

    // Chỉ vẽ các nút BFS tới được từ gốc (tránh nút lạ không thuộc
    // cây chính bị vẽ chồng lên góc).
    return _Layout(
      units: levels.expand((level) => level).toList(),
      levels: levels,
      totalWidth: totalWidth,
    );
  }
}

class _Layout {
  _Layout({
    required this.units,
    required this.levels,
    required this.totalWidth,
  });

  final List<_TreeUnit> units;
  final List<List<_TreeUnit>> levels;
  final double totalWidth;
}

/// Vẽ đường nối: cặp vợ chồng nối ngang, cha/mẹ nối xuống các con
/// qua một thanh ngang chung. Chế độ ngang chỉ hoán đổi x/y của mọi
/// điểm nên hình học giữ nguyên.
class _ConnectorPainter extends CustomPainter {
  _ConnectorPainter(this.layout, this.p, this.horizontal);

  final _Layout layout;
  final AppPalette p;
  final bool horizontal;

  /// Điểm trong chế độ dọc → hoán đổi x/y khi ở chế độ ngang.
  Offset _pt(double x, double y) =>
      horizontal ? Offset(y, x) : Offset(x, y);

  @override
  void paint(Canvas canvas, Size size) {
    final linePaint = Paint()
      ..color = p.border
      ..strokeWidth = 2.0
      ..style = PaintingStyle.stroke;

    double nodeCenterX(_TreeUnit unit, int index) {
      if (unit.members.length == 1) return unit.centerX;
      final offset =
          (FamilyTreeView.nodeWidth + FamilyTreeView.coupleGap) / 2;
      return index == 0 ? unit.centerX - offset : unit.centerX + offset;
    }

    for (final unit in layout.units) {
      final topY = unit.level * FamilyTreeView.levelHeight + 16;
      final circleY = topY + FamilyTreeView.nodeRadius;

      // Nối vợ chồng bằng đường ngang.
      if (unit.members.length == 2) {
        canvas.drawLine(
          _pt(nodeCenterX(unit, 0), circleY),
          _pt(nodeCenterX(unit, 1), circleY),
          linePaint,
        );
      }

      // Nối xuống các con.
      if (unit.children.isEmpty) continue;
      final bottomY = topY + FamilyTreeView.nodeRadius * 2;
      final midY = bottomY +
          (FamilyTreeView.levelHeight - FamilyTreeView.nodeRadius * 2) / 2;
      final firstX = unit.children.first.centerX;
      final lastX = unit.children.last.centerX;
      canvas.drawLine(_pt(unit.centerX, bottomY),
          _pt(unit.centerX, midY), linePaint);
      if (unit.children.length > 1) {
        canvas.drawLine(_pt(firstX, midY), _pt(lastX, midY), linePaint);
      }
      for (final child in unit.children) {
        final childTopY =
            child.level * FamilyTreeView.levelHeight + 16;
        canvas.drawLine(
            _pt(child.centerX, midY), _pt(child.centerX, childTopY),
            linePaint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant _ConnectorPainter oldDelegate) =>
      oldDelegate.layout != layout ||
      oldDelegate.horizontal != horizontal;
}

/// Một người trên cây: vòng tròn chữ cái đầu + tên + năm sinh–năm mất.
///
/// Viền vàng ấm = người đã mất, viền xanh lá = người đang sống
/// (đúng quy ước màu sự kiện của app).
class _PersonNode extends StatelessWidget {
  const _PersonNode({required this.person, required this.onTap});

  final Map<String, dynamic> person;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final name = (person['fullName'] as String?) ?? 'Chưa rõ tên';
    final initial = name.isNotEmpty ? name.characters.first : '?';
    final deceased = person['dateOfDeath'] != null;
    final ring = deceased ? p.warmAccent : p.brand;

    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: FamilyTreeView.nodeRadius * 2,
            height: FamilyTreeView.nodeRadius * 2,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: p.elevated,
              border: Border.all(color: ring, width: 2.5),
            ),
            alignment: Alignment.center,
            child: Text(
              initial,
              style: TextStyle(
                color: p.text,
                fontWeight: FontWeight.w800,
                fontSize: 20,
              ),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            name,
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: p.text,
              fontSize: 12,
              fontWeight: FontWeight.w600,
              height: 1.25,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            _yearRange(person),
            textAlign: TextAlign.center,
            style: TextStyle(color: p.secondary, fontSize: 11),
          ),
        ],
      ),
    );
  }

  /// "1930 – 2010" hoặc "1930 – nay" (chỉ lấy năm để gọn trên cây).
  String _yearRange(Map<String, dynamic> person) {
    String? yearOf(dynamic value) {
      if (value == null) return null;
      if (value is String && value.length >= 4) return value.substring(0, 4);
      return null;
    }

    final birth = yearOf(person['dateOfBirth']);
    final death = yearOf(person['dateOfDeath']);
    if (birth == null && death == null) return '';
    if (birth == null) return '– $death';
    if (death == null) return '$birth – nay';
    return '$birth – $death';
  }
}
