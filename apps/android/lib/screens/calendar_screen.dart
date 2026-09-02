import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../design/typography.dart';

import 'package:url_launcher/url_launcher.dart';

import '../core/app_theme.dart';
import '../design/tokens.dart';
import '../core/helpers.dart';
import '../models/models.dart';
import '../state/board_provider.dart';
import '../design/icons.dart';

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
    final start = first.subtract(
      Duration(days: first.weekday % 7),
    ); // Sunday is 0
    return List.generate(42, (i) => start.add(Duration(days: i)));
  }

  String _iso(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  String _formatDisplayDate(DateTime d) {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
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
    final detailsList = [
      task.notes,
      if (clusterName != null) 'Cluster: $clusterName',
    ];
    final details = Uri.encodeComponent(
      detailsList.where((s) => s.isNotEmpty).join('\n\n'),
    );

    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=$text&dates=$dates&details=$details';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final p = context.ink;

    final topBarBg = isDark ? AppColors.bg : AppColors.lightBg;
    final topBarBorder = isDark ? AppColors.line : AppColors.lightLine;
    final cardBg = isDark ? AppColors.panel2 : Colors.white;
    final cardBorder = isDark ? AppColors.panel3 : AppColors.lightLine;
    final textColor = theme.colorScheme.onSurface;
    final mutedColor = isDark ? AppColors.muted : AppColors.lightMuted;
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
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    final currentMonthLabel =
        '${monthNames[_cursor.month - 1]} ${_cursor.year}';

    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 56,
        backgroundColor: topBarBg,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: Text(
          'Calendar Schedule',
          style: AppType.sans(
            color: textColor,
            fontSize: 16,
            fontWeight: FontWeight.w700,
          ),
        ),
        actions: [
          IconButton(
            icon: AppIcon(
              SpiderIcons.calendarToday,
              size: 20,
              color: p.gold,
            ),
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
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isWide = constraints.maxWidth >= 720;
          final calendarCard = Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: cardBorder),
              boxShadow: [
                BoxShadow(
                  color: isDark
                      ? Colors.black.withValues(alpha: 0.25)
                      : Colors.black.withValues(alpha: 0.03),
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
                      icon: AppIcon(
                        SpiderIcons.chevronLeft,
                        size: 22,
                        color: textColor,
                      ),
                      onPressed: () => _shiftMonth(-1),
                      tooltip: 'Previous month',
                    ),
                    Text(
                      currentMonthLabel,
                      style: AppType.sans(
                        color: textColor,
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.2,
                      ),
                    ),
                    IconButton(
                      icon: AppIcon(
                        SpiderIcons.chevronRight,
                        size: 22,
                        color: textColor,
                      ),
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
                            style: AppType.sans(
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

                // 42-Day Month Grid — redesigned: small pill for selected, not full-cell black square
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 7,
                    mainAxisSpacing: isWide ? 6 : 4,
                    crossAxisSpacing: isWide ? 6 : 4,
                    childAspectRatio: isWide ? 1.15 : 1.05,
                  ),
                  itemCount: 42,
                  itemBuilder: (ctx, i) {
                    final day = grid[i];
                    final inMonth = day.month == _cursor.month;
                    final isSel =
                        day.year == _selected.year &&
                        day.month == _selected.month &&
                        day.day == _selected.day;
                    final now = DateTime.now();
                    final isToday =
                        day.year == now.year &&
                        day.month == now.month &&
                        day.day == now.day;
                    final dayKey = _iso(day);
                    final tasksForDay = byDate[dayKey] ?? [];
                    final hasTasks = tasksForDay.isNotEmpty;

                    return Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: () => setState(() => _selected = day),
                        borderRadius: BorderRadius.circular(12),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            AnimatedContainer(
                              duration: const Duration(milliseconds: 180),
                              curve: Curves.easeOutCubic,
                              width: isWide ? 42 : 36,
                              height: isWide ? 42 : 36,
                              decoration: BoxDecoration(
                                color: isSel
                                    ? p.ink
                                    : (isToday
                                          ? p.ink.withValues(alpha: 0.08)
                                          : Colors.transparent),
                                borderRadius: BorderRadius.circular(12),
                                border: isToday && !isSel
                                    ? Border.all(
                                        color: p.ink.withValues(alpha: 0.18),
                                        width: 1.2,
                                      )
                                    : Border.all(
                                        color: Colors.transparent,
                                        width: 1.2,
                                      ),
                                boxShadow: isSel
                                    ? [
                                        BoxShadow(
                                          color: p.ink.withValues(alpha: 0.14),
                                          blurRadius: 8,
                                          offset: const Offset(0, 2),
                                        ),
                                      ]
                                    : null,
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                '${day.day}',
                                style: AppType.sans(
                                  fontSize: isWide ? 13.5 : 12.5,
                                  fontWeight: isSel || isToday
                                      ? FontWeight.w700
                                      : FontWeight.w500,
                                  color: isSel
                                      ? p.onInk
                                      : (inMonth
                                            ? textColor
                                            : mutedColor.withValues(alpha: 0.35)),
                                ),
                              ),
                            ),
                            if (hasTasks) ...[
                              const SizedBox(height: 3),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  for (
                                    var ti = 0;
                                    ti < tasksForDay.length.clamp(0, 3);
                                    ti++
                                  )
                                    Container(
                                      width: 4.5,
                                      height: 4.5,
                                      margin: const EdgeInsets.symmetric(horizontal: 0.7),
                                      decoration: BoxDecoration(
                                        color: isSel
                                            ? p.onInk.withValues(alpha: 0.9)
                                            : (tasksForDay[ti].done
                                                  ? AppColors.muted
                                                  : AppColors.gold),
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                ],
                              ),
                            ] else
                              const SizedBox(height: 7.5),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
          );
          // Agenda section reused below
          final agenda = Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    _formatDisplayDate(_selected),
                    style: AppType.sans(
                      color: textColor,
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.panel3 : AppColors.lightPanel2,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: cardBorder),
                    ),
                    child: Text(
                      '${selectedTasks.length} ${selectedTasks.length == 1 ? 'task' : 'tasks'}',
                      style: AppType.sans(
                        color: mutedColor,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
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
                      AppIcon(SpiderIcons.eventAvailable, size: 36, color: ink3Color),
                      const SizedBox(height: 8),
                      Text(
                        'No tasks scheduled for this day',
                        style: AppType.sans(
                          color: mutedColor,
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
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
                      controller.patchTask(t.id, {'done': !t.done}, (tt) => tt.copyWith(done: !tt.done));
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
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.panel2 : AppColors.lightPanel2,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: cardBorder),
                ),
                child: Row(
                  children: [
                    AppIcon(SpiderIcons.sync, size: 16, color: AppColors.muted),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Add a time to any task to sync with Google Calendar & ICS.',
                        style: AppType.sans(color: mutedColor, fontSize: 11.5),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          );

          if (isWide) {
            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(flex: 5, child: calendarCard),
                    const SizedBox(width: 16),
                    Expanded(flex: 4, child: agenda),
                  ],
                ),
              ],
            );
          }

          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 110),
            children: [
              calendarCard,
              const SizedBox(height: 18),
              agenda,
            ],
          );
        },
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
    final clusterColor = cluster != null
        ? colorFromHex(cluster.color)
        : AppColors.accent;

    return Container(
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: task.done
              ? (isDark ? AppColors.panel3 : AppColors.lightLine)
              : cardBorder,
        ),
        boxShadow: [
          BoxShadow(
            color: isDark
                ? Colors.black.withValues(alpha: 0.15)
                : Colors.black.withValues(alpha: 0.02),
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
                          ? AppColors.muted.withValues(alpha: 0.2)
                          : (isDark ? AppColors.panel : AppColors.lightBg),
                      border: Border.all(
                        color: task.done
                            ? AppColors.muted
                            : (isDark
                                  ? AppColors.lineStrong
                                  : AppColors.lightLineStrong),
                        width: 1.5,
                      ),
                    ),
                    alignment: Alignment.center,
                    child: task.done
                        ? const AppIcon(
                            SpiderIcons.taskCheck,
                            size: 14,
                            color: AppColors.muted,
                          )
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
                        style: AppType.sans(
                          color: task.done ? mutedColor : textColor,
                          fontSize: 13.5,
                          fontWeight: FontWeight.w600,
                          decoration: task.done
                              ? TextDecoration.lineThrough
                              : null,
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
                              decoration: BoxDecoration(
                                color: clusterColor,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              cluster.name,
                              style: AppType.sans(
                                color: mutedColor,
                                fontSize: 11,
                              ),
                            ),
                            const SizedBox(width: 8),
                          ],
                          if (task.deadlineTime != null) ...[
                            AppIcon(
                              SpiderIcons.clock,
                              size: 12,
                              color: ink3Color,
                            ),
                            const SizedBox(width: 3),
                            Text(
                              task.deadlineTime!,
                              style: AppType.sans(
                                color: ink3Color,
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),

                // Google Calendar 1-Tap Sync Button
                IconButton(
                  icon: const AppIcon(SpiderIcons.openExternal, size: 16),
                  color: AppColors.muted,
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
