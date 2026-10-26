import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:table_calendar/table_calendar.dart';
import 'package:ho_nha_toi/core/repositories/event_repository.dart';
import 'package:ho_nha_toi/core/repositories/lineage_repository.dart';
import 'package:ho_nha_toi/core/widgets/async_view.dart';
import 'package:ho_nha_toi/theme/app_theme.dart';

/// Tab Dòng họ: danh sách các dòng họ tôi đã tham gia (dữ liệu thật từ
/// GET /lineages) và lịch sự kiện của dòng họ đang xem.
///
/// TODO: nối lịch với API — GET /lineages/:id/events của dòng họ đang xem
/// (hiện lịch vẫn dùng dữ liệu mẫu).
class ClanScreen extends ConsumerWidget {
  const ClanScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dòng họ'),
        backgroundColor: p.bg,
        foregroundColor: p.text,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          Text(
            'DÒNG HỌ CỦA TÔI',
            style: TextStyle(
              color: p.secondary,
              fontWeight: FontWeight.w700,
              fontSize: 13,
              letterSpacing: 1.1,
            ),
          ),
          const SizedBox(height: 8),
          AsyncView<List<Map<String, dynamic>>>(
            value: ref.watch(myLineagesProvider),
            onRetry: () => ref.invalidate(myLineagesProvider),
            builder: (lineages) {
              if (lineages.isEmpty) {
                return Container(
                  padding: const EdgeInsets.all(20),
                  decoration: AppTheme.cardDecoration(p),
                  child: Text(
                    'Bạn chưa tham gia dòng họ nào. Hãy xin mã mời từ '
                    'trưởng họ để tham gia.',
                    style: TextStyle(color: p.secondary, fontSize: 14),
                  ),
                );
              }
              return Column(
                children: [
                  for (final lineage in lineages) ...[
                    _lineageCard(p, lineage),
                    const SizedBox(height: 10),
                  ],
                ],
              );
            },
          ),
          const SizedBox(height: 16),
          Text(
            'LỊCH SỰ KIỆN',
            style: TextStyle(
              color: p.secondary,
              fontWeight: FontWeight.w700,
              fontSize: 13,
              letterSpacing: 1.1,
            ),
          ),
          const SizedBox(height: 8),
          const _ClanCalendarSection(),
        ],
      ),
    );
  }

  /// Thẻ một dòng họ: tên + quê quán + vai trò của tôi + số thành viên.
  Widget _lineageCard(AppPalette p, Map<String, dynamic> lineage) {
    final name = (lineage['name'] as String?) ?? 'Dòng họ';
    final hometown = (lineage['hometownProvince'] as String?) ?? '';
    final branch = (lineage['branchName'] as String?) ?? '';
    final memberCount = lineage['memberCount'];
    final initial = name.isNotEmpty ? name.characters.first : '?';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: AppTheme.cardDecoration(p),
      child: Row(
        children: [
          CircleAvatar(
            radius: 26,
            backgroundColor: p.brand,
            child: Text(
              initial,
              style: TextStyle(
                color: p.onBrand,
                fontWeight: FontWeight.w800,
                fontSize: 22,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: TextStyle(
                    color: p.text,
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  [
                    if (hometown.isNotEmpty) 'Quê quán: $hometown',
                    if (branch.isNotEmpty) branch,
                    if (memberCount != null) '$memberCount thành viên',
                  ].join(' · '),
                  style: TextStyle(color: p.secondary, fontSize: 13),
                ),
              ],
            ),
          ),
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: p.brand.withAlpha(26),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: p.brand),
            ),
            child: Text(
              lineageRoleLabel(lineage['myRole'] as String?),
              style: TextStyle(
                color: p.brand,
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Lịch sự kiện của dòng họ đang xem (dữ liệu thật).
///
/// Chọn họ bằng chip khi có nhiều họ; lịch lấy toàn bộ sự kiện
/// (kể cả đã qua) qua `allEventsProvider`. Màu chấm theo loại sự kiện:
/// giỗ → vàng ấm, sinh nhật → xanh dương, họp họ → xanh lá.
class _ClanCalendarSection extends ConsumerStatefulWidget {
  const _ClanCalendarSection();

  @override
  ConsumerState<_ClanCalendarSection> createState() =>
      _ClanCalendarSectionState();
}

class _ClanCalendarSectionState
    extends ConsumerState<_ClanCalendarSection> {
  String? _selectedLineageId;
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final lineagesAsync = ref.watch(myLineagesProvider);

    return AsyncView<List<Map<String, dynamic>>>(
      value: lineagesAsync,
      onRetry: () => ref.invalidate(myLineagesProvider),
      builder: (lineages) {
        if (lineages.isEmpty) {
          return const SizedBox.shrink();
        }
        final lineageId =
            _selectedLineageId ??= lineages.first['id'] as String;
        final eventsAsync = ref.watch(allEventsProvider(lineageId));

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (lineages.length > 1)
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.only(bottom: 8),
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
                          _selectedDay = null;
                        }),
                      ),
                      const SizedBox(width: 8),
                    ],
                  ],
                ),
              ),
            AsyncView<List<Map<String, dynamic>>>(
              value: eventsAsync,
              onRetry: () =>
                  ref.invalidate(allEventsProvider(lineageId)),
              builder: (events) {
                final byDay = <DateTime, List<Map<String, dynamic>>>{};
                for (final e in events) {
                  final startAt =
                      DateTime.tryParse((e['startAt'] as String?) ?? '');
                  if (startAt == null) continue;
                  final day =
                      DateTime.utc(startAt.year, startAt.month, startAt.day);
                  (byDay[day] ??= []).add(e);
                }

                List<Map<String, dynamic>> eventsFor(DateTime day) =>
                    byDay[DateTime.utc(day.year, day.month, day.day)] ??
                    const [];
                final selectedEvents = _selectedDay == null
                    ? const <Map<String, dynamic>>[]
                    : eventsFor(_selectedDay!);

                return Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: AppTheme.cardDecoration(p),
                      child: TableCalendar<Map<String, dynamic>>(
                        firstDay: DateTime.utc(2024, 1, 1),
                        lastDay: DateTime.utc(2030, 12, 31),
                        focusedDay: _focusedDay,
                        selectedDayPredicate: (d) =>
                            isSameDay(d, _selectedDay),
                        onDaySelected: (selected, focused) => setState(() {
                          _selectedDay = selected;
                          _focusedDay = focused;
                        }),
                        onPageChanged: (focused) =>
                            _focusedDay = focused,
                        eventLoader: eventsFor,
                        calendarBuilders: CalendarBuilders(
                          markerBuilder: (context, day, dayEvents) {
                            if (dayEvents.isEmpty) {
                              return const SizedBox.shrink();
                            }
                            return Positioned(
                              bottom: 1,
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  for (final e
                                      in dayEvents.take(3)) ...[
                                    Container(
                                      width: 6,
                                      height: 6,
                                      margin:
                                          const EdgeInsets.symmetric(
                                        horizontal: 1,
                                      ),
                                      decoration: BoxDecoration(
                                        color: _eventColor(
                                          p,
                                          e['eventType'] as String?,
                                        ),
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            );
                          },
                        ),
                        calendarStyle: CalendarStyle(
                          selectedDecoration: BoxDecoration(
                            color: p.brand,
                            shape: BoxShape.circle,
                          ),
                          selectedTextStyle: TextStyle(
                            color: p.onBrand,
                            fontWeight: FontWeight.w700,
                          ),
                          todayTextStyle: TextStyle(
                            color: p.brand,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        headerStyle: HeaderStyle(
                          titleTextStyle: TextStyle(
                            color: p.text,
                            fontWeight: FontWeight.w700,
                            fontSize: 16,
                          ),
                          formatButtonVisible: false,
                          leftChevronIcon:
                              Icon(Icons.chevron_left, color: p.text),
                          rightChevronIcon:
                              Icon(Icons.chevron_right, color: p.text),
                        ),
                        daysOfWeekStyle: DaysOfWeekStyle(
                          weekdayStyle: TextStyle(
                            color: p.secondary,
                            fontSize: 12,
                          ),
                          weekendStyle: TextStyle(
                            color: p.secondary,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (selectedEvents.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: AppTheme.cardDecoration(p),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Sự kiện trong ngày đã chọn',
                              style: TextStyle(
                                color: p.secondary,
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                              ),
                            ),
                            const SizedBox(height: 8),
                            for (final e in selectedEvents)
                              Padding(
                                padding:
                                    const EdgeInsets.symmetric(vertical: 4),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 8,
                                      height: 8,
                                      decoration: BoxDecoration(
                                        color: _eventColor(
                                          p,
                                          e['eventType'] as String?,
                                        ),
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            (e['title'] as String?) ??
                                                'Sự kiện',
                                            style: TextStyle(
                                              color: p.text,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                          Text(
                                            [
                                              eventTypeLabel(
                                                e['eventType'] as String?,
                                              ),
                                              if ((e['location'] as String?)
                                                      ?.isNotEmpty ==
                                                  true)
                                                e['location'] as String,
                                            ].join(' · '),
                                            style: TextStyle(
                                              color: p.secondary,
                                              fontSize: 13,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                      ),
                  ],
                );
              },
            ),
          ],
        );
      },
    );
  }

  /// Màu chấm theo loại sự kiện: giỗ → vàng ấm, sinh nhật → xanh dương,
  /// họp họ → xanh lá (brand).
  Color _eventColor(AppPalette p, String? eventType) {
    switch (eventType) {
      case 'ancestral_ceremony':
      case 'death_anniversary':
        return p.warmAccent;
      case 'birthday':
        return p.xp;
      case 'family_meeting':
      case 'gathering':
        return p.brand;
      default:
        return p.secondary;
    }
  }
}
