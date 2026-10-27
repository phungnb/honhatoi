import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ho_nha_toi/core/repositories/genealogy_repository.dart';
import 'package:ho_nha_toi/theme/app_theme.dart';

/// Quan hệ của người mới so với người mốc trên cây.
enum RelativeType {
  /// Người mới là cha/mẹ của người mốc.
  parent,

  /// Người mới là vợ/chồng của người mốc.
  spouse,

  /// Người mới là con của người mốc.
  child,

  /// Người mới là anh/chị/em của người mốc (ghép qua cha/mẹ chung).
  sibling,
}

/// Màn hình thêm/sửa hồ sơ thành viên.
///
/// - Tạo mới có người mốc: chọn quan hệ rồi nhập thông tin, app tự
///   tạo người rồi gắn quan hệ hai chiều (backend tự sinh chiều ngược).
/// - Tạo mới không có người mốc: chỉ tạo hồ sơ độc lập trong họ.
/// - Sửa: truyền [existingPerson], form nạp sẵn, lưu bằng PATCH.
/// - Người chỉ có quyền đề xuất (không có quyền sửa) thì backend tự
///   chuyển thành đề xuất chờ duyệt; khi đó chưa gắn được quan hệ
///   (người chưa tồn tại) — quan hệ gắn sau khi đề xuất được duyệt.
class AddPersonScreen extends ConsumerStatefulWidget {
  const AddPersonScreen({
    super.key,
    required this.lineageId,
    this.anchorPerson,
    this.anchorParentIds = const [],
    this.existingPerson,
  });

  final String lineageId;

  /// Người mốc để gắn quan hệ (null = thêm người độc lập).
  final Map<String, dynamic>? anchorPerson;

  /// Id cha/mẹ của người mốc (để thêm anh/chị/em).
  final List<String> anchorParentIds;

  /// Hồ sơ đang sửa (null = tạo mới).
  final Map<String, dynamic>? existingPerson;

  @override
  ConsumerState<AddPersonScreen> createState() => _AddPersonScreenState();
}

class _AddPersonScreenState extends ConsumerState<AddPersonScreen> {
  bool get _isEdit => widget.existingPerson != null;

  RelativeType _relativeType = RelativeType.child;

  final _nameController = TextEditingController();
  final _nicknameController = TextEditingController();
  final _hometownController = TextEditingController();
  final _burialController = TextEditingController();
  final _generationController = TextEditingController();
  final _branchController = TextEditingController();
  final _bioController = TextEditingController();
  final _birthYearController = TextEditingController();

  String? _gender;
  bool _birthYearOnly = false;
  DateTime? _birthDate;
  DateTime? _deathDate;

  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final existing = widget.existingPerson;
    if (existing != null) {
      _nameController.text = (existing['fullName'] as String?) ?? '';
      _nicknameController.text = (existing['nickname'] as String?) ?? '';
      _hometownController.text = (existing['hometown'] as String?) ?? '';
      _burialController.text = (existing['burialPlace'] as String?) ?? '';
      _generationController.text =
          existing['generation']?.toString() ?? '';
      _branchController.text = (existing['branch'] as String?) ?? '';
      _bioController.text = (existing['bio'] as String?) ?? '';
      _gender = existing['gender'] as String?;
      _birthYearOnly = existing['birthYearOnly'] == true;
      final birthRaw = existing['dateOfBirth'] as String?;
      if (birthRaw != null) {
        final parsed = DateTime.tryParse(birthRaw);
        if (parsed != null) {
          if (_birthYearOnly) {
            _birthYearController.text = '${parsed.year}';
          } else {
            _birthDate = parsed;
          }
        }
      }
      final deathRaw = existing['dateOfDeath'] as String?;
      if (deathRaw != null) {
        _deathDate = DateTime.tryParse(deathRaw);
      }
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _nicknameController.dispose();
    _hometownController.dispose();
    _burialController.dispose();
    _generationController.dispose();
    _branchController.dispose();
    _bioController.dispose();
    _birthYearController.dispose();
    super.dispose();
  }

  String _dateLabel(DateTime? date) {
    if (date == null) return 'Chọn ngày';
    return '${date.day.toString().padLeft(2, '0')}/'
        '${date.month.toString().padLeft(2, '0')}/${date.year}';
  }

  String _isoDate(DateTime date) {
    return '${date.year.toString().padLeft(4, '0')}-'
        '${date.month.toString().padLeft(2, '0')}-'
        '${date.day.toString().padLeft(2, '0')}';
  }

  Future<void> _pickDate({
    required DateTime? initial,
    required ValueChanged<DateTime> onPicked,
  }) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initial ?? DateTime(now.year - 30),
      firstDate: DateTime(1800),
      lastDate: now,
    );
    if (picked != null) onPicked(picked);
  }

  Future<void> _save() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng nhập họ tên.')),
      );
      return;
    }
    if (_relativeType == RelativeType.sibling &&
        widget.anchorParentIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Chưa có cha/mẹ của người này trong cây nên chưa thêm '
            'được anh/chị/em. Hãy thêm cha/mẹ trước.',
          ),
        ),
      );
      return;
    }

    setState(() => _saving = true);
    try {
      final body = <String, dynamic>{'fullName': name};
      void addIfNotEmpty(String key, String value) {
        if (value.trim().isNotEmpty) body[key] = value.trim();
      }

      addIfNotEmpty('nickname', _nicknameController.text);
      if (_gender != null) body['gender'] = _gender;
      if (_birthYearOnly) {
        final year = int.tryParse(_birthYearController.text.trim());
        if (year != null) {
          body['dateOfBirth'] = '$year-01-01';
          body['birthYearOnly'] = true;
        }
      } else if (_birthDate != null) {
        body['dateOfBirth'] = _isoDate(_birthDate!);
      }
      if (_deathDate != null) {
        body['dateOfDeath'] = _isoDate(_deathDate!);
        addIfNotEmpty('burialPlace', _burialController.text);
      }
      addIfNotEmpty('hometown', _hometownController.text);
      final generation =
          int.tryParse(_generationController.text.trim());
      if (generation != null) body['generation'] = generation;
      addIfNotEmpty('branch', _branchController.text);
      addIfNotEmpty('bio', _bioController.text);

      final repo = ref.read(genealogyRepositoryProvider);

      if (_isEdit) {
        await repo.updatePerson(
          widget.existingPerson!['id'] as String,
          body,
        );
        if (mounted) Navigator.of(context).pop(true);
        return;
      }

      final data =
          await repo.createPerson(widget.lineageId, body);
      final person = data['person'] as Map<String, dynamic>?;

      // Tạo thẳng (người có quyền sửa): gắn quan hệ nếu có người mốc.
      if (person != null) {
        final anchor = widget.anchorPerson;
        if (anchor != null) {
          final anchorId = anchor['id'] as String;
          final newId = person['id'] as String;
          switch (_relativeType) {
            case RelativeType.parent:
              await repo.createRelationship(
                widget.lineageId,
                newId,
                anchorId,
                'parent',
              );
            case RelativeType.spouse:
              await repo.createRelationship(
                widget.lineageId,
                newId,
                anchorId,
                'spouse',
              );
            case RelativeType.child:
              await repo.createRelationship(
                widget.lineageId,
                anchorId,
                newId,
                'parent',
              );
            case RelativeType.sibling:
              // Ghép qua cha/mẹ chung (gắn một người là đủ vì cây
              // nhóm vợ chồng thành một nút).
              await repo.createRelationship(
                widget.lineageId,
                widget.anchorParentIds.first,
                newId,
                'parent',
              );
          }
        }
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Đã thêm thành viên.')),
          );
          Navigator.of(context).pop(true);
        }
        return;
      }

      // Chỉ có quyền đề xuất: backend đã nhận đề xuất chờ duyệt.
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Đã gửi đề xuất thêm người, chờ duyệt. Quan hệ sẽ '
              'được gắn sau khi đề xuất được duyệt.',
            ),
          ),
        );
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Không lưu được: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final anchor = widget.anchorPerson;
    final anchorName = anchor == null
        ? null
        : (anchor['fullName'] as String?) ?? 'người này';
    final canAddSibling = widget.anchorParentIds.isNotEmpty;

    return Scaffold(
      appBar: AppBar(
        title: Text(_isEdit ? 'Sửa hồ sơ' : 'Thêm người thân'),
        backgroundColor: p.bg,
        foregroundColor: p.text,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          if (!_isEdit && anchorName != null) ...[
            Text(
              'NGƯỜI MỚI LÀ GÌ CỦA $anchorName'.toUpperCase(),
              style: TextStyle(
                color: p.secondary,
                fontWeight: FontWeight.w700,
                fontSize: 13,
                letterSpacing: 1.1,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _relationChip(p, RelativeType.parent, 'Cha/mẹ'),
                _relationChip(p, RelativeType.spouse, 'Vợ/chồng'),
                _relationChip(p, RelativeType.child, 'Con'),
                _relationChip(
                  p,
                  RelativeType.sibling,
                  'Anh/chị/em',
                  enabled: canAddSibling,
                ),
              ],
            ),
            if (!canAddSibling)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  'Chưa có cha/mẹ của $anchorName trong cây nên chưa '
                  'thêm được anh/chị/em — hãy thêm cha/mẹ trước.',
                  style: TextStyle(color: p.secondary, fontSize: 13),
                ),
              ),
            const SizedBox(height: 20),
          ],
          TextField(
            controller: _nameController,
            decoration: const InputDecoration(
              labelText: 'Họ tên *',
              hintText: 'Ví dụ: Nguyễn Văn An',
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _nicknameController,
            decoration: const InputDecoration(
              labelText: 'Tên gọi ở nhà',
            ),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _gender,
            decoration: const InputDecoration(labelText: 'Giới tính'),
            items: const [
              DropdownMenuItem(value: 'male', child: Text('Nam')),
              DropdownMenuItem(value: 'female', child: Text('Nữ')),
            ],
            onChanged: (v) => setState(() => _gender = v),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Text(
                  'Ngày sinh',
                  style: TextStyle(color: p.text, fontSize: 15),
                ),
              ),
              TextButton.icon(
                onPressed: () => setState(
                  () => _birthYearOnly = !_birthYearOnly,
                ),
                icon: Icon(
                  _birthYearOnly
                      ? Icons.check_box
                      : Icons.check_box_outline_blank,
                  color: p.brand,
                ),
                label: const Text('Chỉ nhớ năm'),
              ),
            ],
          ),
          if (_birthYearOnly)
            TextField(
              controller: _birthYearController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Năm sinh',
                hintText: 'Ví dụ: 1930',
              ),
            )
          else
            OutlinedButton.icon(
              onPressed: () => _pickDate(
                initial: _birthDate,
                onPicked: (d) => setState(() => _birthDate = d),
              ),
              icon: const Icon(Icons.cake_outlined),
              label: Text(_dateLabel(_birthDate)),
            ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Text(
                  'Ngày mất (nếu đã mất)',
                  style: TextStyle(color: p.text, fontSize: 15),
                ),
              ),
              if (_deathDate != null)
                TextButton(
                  onPressed: () => setState(() => _deathDate = null),
                  child: const Text('Xóa'),
                ),
            ],
          ),
          OutlinedButton.icon(
            onPressed: () => _pickDate(
              initial: _deathDate,
              onPicked: (d) => setState(() => _deathDate = d),
            ),
            icon: const Icon(Icons.event_outlined),
            label: Text(_dateLabel(_deathDate)),
          ),
          if (_deathDate != null) ...[
            const SizedBox(height: 12),
            TextField(
              controller: _burialController,
              decoration: const InputDecoration(
                labelText: 'Phần mộ ở đâu',
                hintText: 'Ví dụ: Nghĩa trang quê nhà',
              ),
            ),
          ],
          const SizedBox(height: 12),
          TextField(
            controller: _hometownController,
            decoration: const InputDecoration(labelText: 'Quê quán'),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _generationController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Đời thứ mấy',
                    hintText: 'Ví dụ: 5',
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(
                  controller: _branchController,
                  decoration: const InputDecoration(
                    labelText: 'Chi',
                    hintText: 'Ví dụ: Chi 2',
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _bioController,
            maxLines: 4,
            decoration: const InputDecoration(
              labelText: 'Ghi chú',
              hintText: 'Tiểu sử, kỷ niệm, dặn dò…',
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _saving ? null : _save,
              child: Text(
                _saving
                    ? 'Đang lưu…'
                    : (_isEdit ? 'Lưu thay đổi' : 'Thêm vào gia phả'),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _relationChip(
    AppPalette p,
    RelativeType type,
    String label, {
    bool enabled = true,
  }) {
    final selected = _relativeType == type;
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: enabled
          ? (_) => setState(() => _relativeType = type)
          : null,
    );
  }
}
