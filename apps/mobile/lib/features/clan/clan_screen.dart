import 'package:flutter/material.dart';
import 'package:table_calendar/table_calendar.dart';
import '../../theme/app_theme.dart';

/// Tab Dòng họ: lịch sự kiện của dòng họ và danh sách sự kiện sắp tới.
///
/// Dùng package table_calendar. Muốn hiển thị tiếng Việt đầy đủ
/// (thứ, tháng), gọi `initializeDateFormatting('vi')` trong main()
/// và truyền `locale: 'vi'` vào TableCalendar.
class ClanScreen extends StatefulWidget {
  const ClanScreen({super.key});

  @override
  State<ClanScreen> createState() => _ClanScreenState();
}

class _ClanScreenState extends State<ClanScreen> {
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;

  Map<DateTime, List<String>> get _events => {
        DateTime.utc(2026, 10, 22): ['Giỗ cụ Nguyễn Văn Tổ'],
        DateTime.utc(2026, 10, 25): ['Sinh nhật bé Minh Anh'],
        DateTime.utc(2026, 12, 20): ['Họp họ cuối năm'],
      };

  List<String> _eventsFor(DateTime day) =>
      _events[DateTime.utc(day.year, day.month, day.day)] ?? const [];

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final selectedEvents =
        _selectedDay == null ? const <String>[] : _eventsFor(_selectedDay!);

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
          Container(
            padding: const EdgeInsets.all(18),
            decoration: AppTheme.cardDecoration(p),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: p.brand,
                  child: Text(
                    'N',
                    style: TextStyle(
                      color: p.onBrand,
                      fontWeight: FontWeight.w800,
                      fontSize: 24,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Họ Nguyễn tại Đồng Nai',
                        style: TextStyle(
                          color: p.text,
                          fontWeight: FontWeight.w800,
                          fontSize: 18,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Quê quán: Đồng Nai · Nhà thờ họ: ấp Tân Lập',
                        style:
                            TextStyle(color: p.secondary, fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(8),
            decoration: AppTheme.cardDecoration(p),
            child: TableCalendar<String>(
              firstDay: DateTime.utc(2024, 1, 1),
              lastDay: DateTime.utc(2030, 12, 31),
              focusedDay: _focusedDay,
              selectedDayPredicate: (d) => isSameDay(d, _selectedDay),
              onDaySelected: (selected, focused) => setState(() {
                _selectedDay = selected;
                _focusedDay = focused;
              }),
              onPageChanged: (focused) => _focusedDay = focused,
              eventLoader: _eventsFor,
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
                markerDecoration: BoxDecoration(
                  color: p.warmAccent,
                  shape: BoxShape.circle,
                ),
              ),
              headerStyle: HeaderStyle(
                titleTextStyle: TextStyle(
                  color: p.text,
                  fontWeight: FontWeight.w700,
                  fontSize: 16,
                ),
                formatButtonVisible: false,
                leftChevronIcon: Icon(Icons.chevron_left, color: p.text),
                rightChevronIcon:
                    Icon(Icons.chevron_right, color: p.text),
              ),
              daysOfWeekStyle: DaysOfWeekStyle(
                weekdayStyle:
                    TextStyle(color: p.secondary, fontSize: 12),
                weekendStyle:
                    TextStyle(color: p.secondary, fontSize: 12),
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
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: p.warmAccent,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              e,
                              style: TextStyle(
                                color: p.text,
                                fontWeight: FontWeight.w600,
                              ),
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
    );
  }
}
