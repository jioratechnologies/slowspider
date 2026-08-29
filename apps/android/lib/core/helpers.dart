// Mirrors apps/mobile/src/helpers.ts — task/cluster sorting, date labels, progress calc.

import '../models/models.dart';

const Map<Priority, int> prioRank = {Priority.high: 3, Priority.med: 2, Priority.low: 1, Priority.none: 0};
const int binMs = 14 * 86400000; // 2 weeks

bool isClusterActive(Cluster c) => c.status == ClusterStatus.active;

bool isTaskLive(Task t, List<Cluster> clusters) {
  if (t.binned || t.cold) return false;
  if (t.clusterId == null) return true;
  final c = clusters.where((x) => x.id == t.clusterId).cast<Cluster?>().firstWhere((_) => true, orElse: () => null);
  return c != null ? isClusterActive(c) : true;
}

DateTime _todayStr() {
  final d = DateTime.now();
  return DateTime(d.year, d.month, d.day);
}

int? dayDiff(String? dateStr) {
  if (dateStr == null || dateStr.isEmpty) return null;
  final d = DateTime.parse('${dateStr}T00:00:00');
  return (DateTime(d.year, d.month, d.day).difference(_todayStr()).inMilliseconds / 86400000).round();
}

String fmtDate(String? dateStr) {
  final diff = dayDiff(dateStr);
  if (diff == null) return '';
  final d = DateTime.parse('${dateStr}T00:00:00');
  String label = _monthDay(d);
  if (diff == 0) {
    label = 'Today';
  } else if (diff == 1) {
    label = 'Tomorrow';
  } else if (diff == -1) {
    label = 'Yesterday';
  } else if (diff < -1) {
    label = '${-diff}d overdue';
  } else if (diff <= 7) {
    label = 'in ${diff}d';
  }
  return label;
}

const _months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];
String _monthDay(DateTime d) => '${_months[d.month - 1]} ${d.day}';

/// Web's quick-add stamps attachment markers into the title (`[File: name.ext]`) and strips
/// them at render time. Mobile shows the same tasks, so it strips them the same way.
String displayTitle(String title) => title.replaceAll(RegExp(r'\[File:\s*[^\]]+\]'), '').trim();

enum DateClass { none, overdue, soon }

DateClass dateClass(String? dateStr) {
  final diff = dayDiff(dateStr);
  if (diff == null) return DateClass.none;
  if (diff < 0) return DateClass.overdue;
  if (diff <= 2) return DateClass.soon;
  return DateClass.none;
}

class Progress {
  final int done;
  final int total;
  final int pct;
  Progress({required this.done, required this.total, required this.pct});
}

Progress taskProgress(Task t) {
  final ms = t.milestones;
  if (ms.isEmpty) return Progress(done: t.done ? 1 : 0, total: 0, pct: t.done ? 100 : 0);
  final done = ms.where((m) => m.done).length;
  return Progress(done: done, total: ms.length, pct: (done / ms.length * 100).round());
}

List<Task> sortTasks(List<Task> tasks, SortMode mode) {
  final list = [...tasks];
  if (mode == SortMode.manual) {
    list.sort((a, b) {
      if (a.done != b.done) return a.done ? 1 : -1;
      if (a.starred != b.starred) return a.starred ? -1 : 1;
      return a.pos.compareTo(b.pos);
    });
    return list;
  }
  list.sort((a, b) {
    if (a.done != b.done) return a.done ? 1 : -1;
    if (a.starred != b.starred) return a.starred ? -1 : 1;
    final ad = a.deadline != null ? (dayDiff(a.deadline) ?? 1 << 30) : 1 << 30;
    final bd = b.deadline != null ? (dayDiff(b.deadline) ?? 1 << 30) : 1 << 30;
    if (ad != bd) return ad.compareTo(bd);
    final pr = prioRank[b.priority]! - prioRank[a.priority]!;
    if (pr != 0) return pr;
    return a.pos.compareTo(b.pos);
  });
  return list;
}

Progress clusterProgress(int clusterId, List<Task> tasks) {
  final arr = tasks.where((t) => t.clusterId == clusterId && !t.binned && !t.cold).toList();
  final total = arr.length;
  final done = arr.where((t) => t.done).length;
  return Progress(done: done, total: total, pct: total > 0 ? (done / total * 100).round() : 0);
}

int daysLeft(String? binnedAt) {
  if (binnedAt == null) return 14;
  try {
    final ms = binMs - (DateTime.now().difference(DateTime.parse(binnedAt)).inMilliseconds);
    return (ms / 86400000).ceil().clamp(0, 1 << 30);
  } catch (_) {
    return 14;
  }
}

bool isCalendarSyncable(Task t) => t.deadline != null && t.deadline!.isNotEmpty && t.deadlineTime != null && t.deadlineTime!.isNotEmpty;

Map<String, List<Task>> tasksByDate(List<Task> tasks, List<Cluster> clusters) {
  final map = <String, List<Task>>{};
  for (final t in tasks) {
    if (t.deadline == null || !isTaskLive(t, clusters)) continue;
    final arr = map.putIfAbsent(t.deadline!, () => []);
    arr.add(t);
  }
  for (final arr in map.values) {
    arr.sort((a, b) => (a.deadlineTime ?? '99:99').compareTo(b.deadlineTime ?? '99:99'));
  }
  return map;
}

String isoDate(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

/// Monday-first grid covering the whole month plus the padding days around it.
List<DateTime> monthGrid(int year, int month) {
  final first = DateTime(year, month, 1);
  final weekday = first.weekday; // 1=Mon..7=Sun
  final start = first.subtract(Duration(days: (weekday - 1) % 7));
  return List.generate(42, (i) => start.add(Duration(days: i)));
}

/// Google Calendar's event-template URL. Only tasks with an explicit time get one.
String googleCalendarUrl(Task task, String? clusterName) {
  final parts = (task.deadlineTime ?? '09:00').split(':');
  final h = int.tryParse(parts[0]) ?? 9;
  final m = int.tryParse(parts.length > 1 ? parts[1] : '0') ?? 0;
  final start = DateTime.parse('${task.deadline}T00:00:00').add(Duration(hours: h, minutes: m));
  final end = start.add(const Duration(hours: 1));
  String stamp(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}${d.month.toString().padLeft(2, '0')}${d.day.toString().padLeft(2, '0')}T'
      '${d.hour.toString().padLeft(2, '0')}${d.minute.toString().padLeft(2, '0')}00';
  final title = task.title.isNotEmpty ? task.title : 'Untitled task';
  final details = [task.notes, if (clusterName != null) 'Cluster: $clusterName'].where((s) => s.isNotEmpty).join('\n\n');
  final params = {
    'action': 'TEMPLATE',
    'text': title,
    'dates': '${stamp(start)}/${stamp(end)}',
    'details': details,
  };
  final query = params.entries.map((e) => '${Uri.encodeQueryComponent(e.key)}=${Uri.encodeQueryComponent(e.value)}').join('&');
  return 'https://calendar.google.com/calendar/render?$query';
}
