import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/app_theme.dart';
import '../core/helpers.dart';
import '../state/board_provider.dart';

const _weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const _months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/// Mirrors apps/mobile/src/screens/CalendarScreen.tsx — month grid + agenda for the
/// selected day, Google Calendar sync link for timed tasks.
class CalendarScreen extends ConsumerStatefulWidget {
  const CalendarScreen({super.key});

  @override
  ConsumerState<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends ConsumerState<CalendarScreen> {
  late DateTime _cursor;
  late String _selected;

  @override
  void initState() {
    super.initState();
    final today = DateTime.now();
    _cursor = DateTime(today.year, today.month, 1);
    _selected = isoDate(today);
  }

  @override
  Widget build(BuildContext context) {
    final board = ref.watch(boardProvider);
    final data = board.data;
    if (board.loading && data == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    final byDate = tasksByDate(data?.tasks ?? [], data?.clusters ?? []);
    final grid = monthGrid(_cursor.year, _cursor.month);
    final dayTasks = byDate[_selected] ?? [];
    final today = isoDate(DateTime.now());

    String? clusterName(int? id) => id == null ? null : data?.clusters.where((c) => c.id == id).cast<dynamic>().firstWhere((_) => true, orElse: () => null)?.name;

    return Scaffold(
      appBar: AppBar(title: const Text('Calendar')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton(icon: const Icon(Icons.chevron_left), onPressed: () => setState(() => _cursor = DateTime(_cursor.year, _cursor.month - 1, 1))),
              SizedBox(width: 170, child: Text('${_months[_cursor.month - 1]} ${_cursor.year}', textAlign: TextAlign.center, style: const TextStyle(color: AppColors.ink, fontSize: 16, fontWeight: FontWeight.w700))),
              IconButton(icon: const Icon(Icons.chevron_right), onPressed: () => setState(() => _cursor = DateTime(_cursor.year, _cursor.month + 1, 1))),
            ],
          ),
          Row(children: _weekdays.map((w) => Expanded(child: Center(child: Text(w, style: const TextStyle(color: AppColors.ink3, fontSize: 11, fontWeight: FontWeight.w600))))).toList()),
          const SizedBox(height: 4),
          GridView.count(
            crossAxisCount: 7,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 1.3,
            children: grid.map((d) {
              final key = isoDate(d);
              final inMonth = d.month == _cursor.month;
              final count = (byDate[key] ?? []).length;
              final isToday = key == today;
              final isSelected = key == _selected;
              return Padding(
                padding: const EdgeInsets.all(2),
                child: InkWell(
                  borderRadius: BorderRadius.circular(10),
                  onTap: () => setState(() => _selected = key),
                  child: Container(
                    decoration: BoxDecoration(
                      color: isSelected ? AppColors.accent : null,
                      border: isToday && !isSelected ? Border.all(color: AppColors.lineStrong) : null,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    alignment: Alignment.center,
                    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      Text('${d.day}', style: TextStyle(color: isSelected ? AppColors.accentInk : (inMonth ? AppColors.ink : AppColors.ink3.withValues(alpha: 0.6)), fontWeight: isSelected ? FontWeight.w700 : FontWeight.normal, fontSize: 13)),
                      if (count > 0) Container(margin: const EdgeInsets.only(top: 2), width: 4, height: 4, decoration: BoxDecoration(color: isSelected ? AppColors.accentInk : AppColors.accent, shape: BoxShape.circle)),
                    ]),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 18),
          Text(_agendaTitle(_selected), style: const TextStyle(color: AppColors.ink, fontSize: 15, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          if (dayTasks.isEmpty) const Text('Nothing scheduled.', style: TextStyle(color: AppColors.ink3, fontStyle: FontStyle.italic, fontSize: 13)),
          for (final t in dayTasks)
            Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(color: AppColors.panel, borderRadius: BorderRadius.circular(12)),
              child: Row(children: [
                Expanded(child: InkWell(onTap: () => context.push('/task/${t.id}'), child: Text(displayTitle(t.title).isNotEmpty ? displayTitle(t.title) : 'Untitled', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.ink, fontSize: 14)))),
                if (t.deadlineTime != null) ...[
                  const Icon(Icons.access_time, size: 12, color: AppColors.ink3),
                  const SizedBox(width: 4),
                  Text(t.deadlineTime!, style: const TextStyle(color: AppColors.ink3, fontSize: 11.5)),
                ],
                if (isCalendarSyncable(t)) ...[
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.open_in_new, size: 16, color: AppColors.ink3),
                    onPressed: () => launchUrl(Uri.parse(googleCalendarUrl(t, clusterName(t.clusterId))), mode: LaunchMode.externalApplication),
                  ),
                ],
              ]),
            ),
          if (dayTasks.any((t) => !isCalendarSyncable(t)))
            const Padding(padding: EdgeInsets.only(top: 4), child: Text('Add a time to a task to sync it to Google Calendar.', style: TextStyle(color: AppColors.ink3, fontSize: 12))),
        ],
      ),
    );
  }

  String _agendaTitle(String iso) {
    final d = DateTime.parse('${iso}T00:00:00');
    const weekdayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return '${weekdayNames[d.weekday - 1]}, ${_months[d.month - 1].substring(0, 3)} ${d.day}';
  }
}
