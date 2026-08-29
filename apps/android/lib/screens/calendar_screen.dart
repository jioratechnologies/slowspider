import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/app_icons.dart';
import '../core/app_theme.dart';
import '../core/helpers.dart';
import '../models/models.dart';
import '../state/board_provider.dart';

const _weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

class CalendarScreen extends ConsumerStatefulWidget {
  const CalendarScreen({super.key});

  @override
  ConsumerState<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends ConsumerState<CalendarScreen> {
  late DateTime _cursor;
  late DateTime _selected;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _cursor = DateTime(now.year, now.month, 1);
    _selected = DateTime(now.year, now.month, now.day);
  }

  void _shiftMonth(int delta) {
    setState(() {
      _cursor = DateTime(_cursor.year, _cursor.month + delta, 1);
    });
  }

  List<DateTime> _monthGrid(DateTime cursor) {
    final first = DateTime(cursor.year, cursor.month, 1);
    final start = first.subtract(Duration(days: first.weekday % 7)); // Sunday is 0
    return List.generate(42, (i) => start.add(Duration(days: i)));
  }

  String _iso(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  String _formatDisplayDate(DateTime d) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return '${days[d.weekday % 7]}, ${months[d.month - 1].substring(0, 3)} ${d.day}';
  }

  String _googleCalendarUrl(Task task, String? clusterName) {
    final timeStr = task.deadlineTime ?? '09:00';
    final parts = timeStr.split(':').map((s) => int.tryParse(s) ?? 0).toList();
    final hour = parts.isNotEmpty ? parts[0] : 9;
    final minute = parts.length > 1 ? parts[1] : 0;

    final parsedDate = DateTime.tryParse(task.deadline ?? '') ?? DateTime.now();
    final start = DateTime(
      parsedDate.year,
      parsedDate.month,
      parsedDate.day,
      hour,
      minute,
    );
    final end = start.add(const Duration(hours: 1));

    String stamp(DateTime d) =>
        '${d.year}${d.month.toString().padLeft(2, '0')}${d.day.toString().padLeft(2, '0')}T'
        '${d.hour.toString().padLeft(2, '0')}${d.minute.toString().padLeft(2, '0')}00';

    final text = Uri.encodeComponent(displayTitle(task.title));
    final dates = '${stamp(start)}/${stamp(end)}';
    final detailsList = [task.notes, if (clusterName != null) 'Cluster: $clusterName'];
    final details = Uri.encodeComponent(detailsList.where((s) => s.isNotEmpty).join('\n\n'));

    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=$text&dates=$dates&details=$details';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final topBarBg = isDark ? const Color(0xE6181926) : const Color(0xF2FFFFFF);
    final topBarBorder = isDark ? const Color(0xFF2C3042) : const Color(0xFFE2E4EB);
    final cardBg = isDark ? const Color(0xFF1B1D28) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF292C3D) : const Color(0xFFE2E4EA);
    final textColor = theme.colorScheme.onSurface;
    final mutedColor = isDark ? const Color(0xFF949BAE) : const Color(0xFF6B7280);
    final ink3Color = isDark ? AppColors.ink3 : AppColors.lightInk3;

    final board = ref.watch(boardProvider);
    final controller = ref.read(boardProvider.notifier);
    final data = board.data;

    // Map tasks by date
    final byDate = <String, List<Task>>{};
    if (data != null) {
      for (final t in data.tasks) {
        if (t.deadline != null && t.deadline!.isNotEmpty && !t.binned) {
          final k = t.deadline!;
          byDate.putIfAbsent(k, () => []).add(t);
        }
      }
    }

    final grid = _monthGrid(_cursor);
    final selectedKey = _iso(_selected);
    final selectedTasks = byDate[selectedKey] ?? [];

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    final currentMonthLabel = '${monthNames[_cursor.month - 1]} ${_cursor.year}';

    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 56,
        backgroundColor: topBarBg,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: Text(
          'Calendar Schedule',
          style: GoogleFonts.inter(
            color: textColor,
            fontSize: 16,
            fontWeight: FontWeight.w700,
          ),
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.today_rounded, size: 20, color: AppColors.accent),
            tooltip: 'Go to today',
            onPressed: () {
              final now = DateTime.now();
              setState(() {
                _cursor = DateTime(now.year, now.month, 1);
                _selected = DateTime(now.year, now.month, now.day);
              });
            },
          ),
          const SizedBox(width: 8),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: topBarBorder),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 110),
        children: [
          // 1. Month Navigation Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: cardBorder),
              boxShadow: [
                BoxShadow(
                  color: isDark ? Colors.black.withValues(alpha: 0.25) : Colors.black.withValues(alpha: 0.03),
                  blurRadius: 10,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              children: [
                // Month Header Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    IconButton(
                      icon: Icon(Icons.chevron_left_rounded, size: 22, color: textColor),
                      onPressed: () => _shiftMonth(-1),
                      tooltip: 'Previous month',
                    ),
                    Text(
                      currentMonthLabel,
                      style: GoogleFonts.inter(
                        color: textColor,
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.2,
                      ),
                    ),
                    IconButton(
                      icon: Icon(Icons.chevron_right_rounded, size: 22, color: textColor),
                      onPressed: () => _shiftMonth(1),
                      tooltip: 'Next month',
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // Weekday Headers
                Row(
                  children: [
                    for (final day in _weekdays)
                      Expanded(
                        child: Center(
                          child: Text(
                            day,
                            style: GoogleFonts.inter(
                              color: ink3Color,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 8),

                // 42-Day Month Grid
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 7,
                    mainAxisSpacing: 4,
                    crossAxisSpacing: 4,
                    childAspectRatio: 1.05,
                  ),
                  itemCount: 42,
                  itemBuilder: (ctx, i) {
                    final day = grid[i];
                    final inMonth = day.month == _cursor.month;
                    final isSel = day.year == _selected.year &&
                        day.month == _selected.month &&
                        day.day == _selected.day;
                    final now = DateTime.now();
                    final isToday = day.year == now.year && day.month == now.month && day.day == now.day;
                    final dayKey = _iso(day);
                    final tasksForDay = byDate[dayKey] ?? [];
                    final hasTasks = tasksForDay.isNotEmpty;

                    return Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: () => setState(() => _selected = day),
                        borderRadius: BorderRadius.circular(10),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 140),
                          decoration: BoxDecoration(
                            color: isSel
                                ? const Color(0xFF8B5CF6)
                                : (isToday
                                    ? (isDark ? const Color(0xFF26293B) : const Color(0xFFF3F4F6))
                                    : Colors.transparent),
                            borderRadius: BorderRadius.circular(10),
                            border: isToday && !isSel
                                ? Border.all(color: const Color(0xFF8B5CF6).withValues(alpha: 0.6), width: 1.2)
                                : null,
                            boxShadow: isSel
                                ? [
                                    BoxShadow(
                                      color: const Color(0xFF8B5CF6).withValues(alpha: 0.4),
                                      blurRadius: 8,
                                      offset: const Offset(0, 2),
                                    ),
                                  ]
                                : null,
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                '${day.day}',
                                style: GoogleFonts.inter(
                                  fontSize: 12.5,
                                  fontWeight: isSel || isToday ? FontWeight.w700 : FontWeight.w500,
                                  color: isSel
                                      ? Colors.white
                                      : (inMonth
                                          ? textColor
                                          : mutedColor.withValues(alpha: 0.35)),
                                ),
                              ),
                              if (hasTasks) ...[
                                const SizedBox(height: 2),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    for (var ti = 0; ti < tasksForDay.length.clamp(0, 3); ti++)
                                      Container(
                                        width: 4.5,
                                        height: 4.5,
                                        margin: const EdgeInsets.symmetric(horizontal: 0.7),
                                        decoration: BoxDecoration(
                                          color: isSel
                                              ? Colors.white
                                              : (tasksForDay[ti].done ? const Color(0xFF10B981) : const Color(0xFFF59E0B)),
                                          shape: BoxShape.circle,
                                        ),
                                      ),
                                  ],
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),

          const SizedBox(height: 18),

          // 2. Selected Day Header & Agenda
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                _formatDisplayDate(_selected),
                style: GoogleFonts.inter(
                  color: textColor,
                  fontSize: 14.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF26293A) : const Color(0xFFE5E7EB),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '${selectedTasks.length} ${selectedTasks.length == 1 ? 'task' : 'tasks'}',
                  style: GoogleFonts.inter(
                    color: mutedColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // 3. Selected Day Tasks List
          if (selectedTasks.isEmpty)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 16),
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: cardBorder),
              ),
              alignment: Alignment.center,
              child: Column(
                children: [
                  Icon(Icons.event_available_rounded, size: 36, color: ink3Color),
                  const SizedBox(height: 8),
                  Text(
                    'No tasks scheduled for this day',
                    style: GoogleFonts.inter(color: mutedColor, fontSize: 13, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            )
          else
            for (final t in selectedTasks) ...[
              _buildCalendarTaskCard(
                context: context,
                task: t,
                cluster: data?.clusters.where((c) => c.id == t.clusterId).cast<Cluster?>().firstWhere((_) => true, orElse: () => null),
                cardBg: cardBg,
                cardBorder: cardBorder,
                textColor: textColor,
                mutedColor: mutedColor,
                ink3Color: ink3Color,
                isDark: isDark,
                onToggle: () {
                  controller.patchTask(
                    t.id,
                    {'done': !t.done},
                    (tt) => tt.copyWith(done: !tt.done),
                  );
                },
                onOpen: () => context.push('/task/${t.id}'),
                onSyncGoogle: () {
                  final clName = data?.clusters.where((c) => c.id == t.clusterId).cast<Cluster?>().firstWhere((_) => true, orElse: () => null)?.name;
                  final url = _googleCalendarUrl(t, clName);
                  launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
                },
              ),
              const SizedBox(height: 8),
            ],

          const SizedBox(height: 16),

          // 4. Google Calendar Sync Info Banner
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF191C28) : const Color(0xFFF3F4F8),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: cardBorder),
            ),
            child: Row(
              children: [
                Icon(Icons.sync_rounded, size: 16, color: const Color(0xFF38BDF8)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Add a time to any task to sync with Google Calendar & ICS.',
                    style: GoogleFonts.inter(color: mutedColor, fontSize: 11.5),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCalendarTaskCard({
    required BuildContext context,
    required Task task,
    required Cluster? cluster,
    required Color cardBg,
    required Color cardBorder,
    required Color textColor,
    required Color mutedColor,
    required Color ink3Color,
    required bool isDark,
    required VoidCallback onToggle,
    required VoidCallback onOpen,
    required VoidCallback onSyncGoogle,
  }) {
    final title = displayTitle(task.title);
    final clusterColor = cluster != null ? colorFromHex(cluster.color) : AppColors.accent;

    return Container(
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: task.done ? (isDark ? const Color(0xFF222430) : const Color(0xFFE5E7EB)) : cardBorder,
        ),
        boxShadow: [
          BoxShadow(
            color: isDark ? Colors.black.withValues(alpha: 0.15) : Colors.black.withValues(alpha: 0.02),
            blurRadius: 4,
            offset: const Offset(0, 1.5),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onOpen,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                // Emerald Checkbox
                GestureDetector(
                  onTap: onToggle,
                  child: Container(
                    width: 20,
                    height: 20,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(6),
                      color: task.done
                          ? const Color(0xFF10B981).withValues(alpha: 0.2)
                          : (isDark ? const Color(0xFF14151C) : const Color(0xFFF9FAFB)),
                      border: Border.all(
                        color: task.done
                            ? const Color(0xFF10B981)
                            : (isDark ? const Color(0xFF383C4E) : const Color(0xFFD1D5DB)),
                        width: 1.5,
                      ),
                    ),
                    alignment: Alignment.center,
                    child: task.done
                        ? const Icon(AppIcons.taskCheck, size: 14, color: Color(0xFF10B981))
                        : null,
                  ),
                ),
                const SizedBox(width: 10),

                // Title + Cluster & Time meta
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title.isNotEmpty ? title : 'Untitled task',
                        style: GoogleFonts.inter(
                          color: task.done ? mutedColor : textColor,
                          fontSize: 13.5,
                          fontWeight: FontWeight.w600,
                          decoration: task.done ? TextDecoration.lineThrough : null,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          if (cluster != null) ...[
                            Container(
                              width: 6,
                              height: 6,
                              decoration: BoxDecoration(color: clusterColor, shape: BoxShape.circle),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              cluster.name,
                              style: GoogleFonts.inter(color: mutedColor, fontSize: 11),
                            ),
                            const SizedBox(width: 8),
                          ],
                          if (task.deadlineTime != null) ...[
                            Icon(Icons.schedule_rounded, size: 12, color: ink3Color),
                            const SizedBox(width: 3),
                            Text(
                              task.deadlineTime!,
                              style: GoogleFonts.inter(color: ink3Color, fontSize: 11, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),

                // Google Calendar 1-Tap Sync Button
                IconButton(
                  icon: const Icon(Icons.open_in_new_rounded, size: 16),
                  color: const Color(0xFF38BDF8),
                  tooltip: 'Sync to Google Calendar',
                  onPressed: onSyncGoogle,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
