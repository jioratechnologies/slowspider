import 'package:flutter/material.dart';

import '../core/app_theme.dart';
import '../core/helpers.dart';
import '../models/models.dart';

const _prioLabel = {Priority.high: 'High', Priority.med: 'Med', Priority.low: 'Low', Priority.none: ''};

IconData _chipIcon(NoteKind kind) {
  switch (kind) {
    case NoteKind.voice:
      return Icons.mic;
    case NoteKind.image:
      return Icons.image;
    case NoteKind.video:
      return Icons.videocam;
    default:
      return Icons.attach_file;
  }
}

/// Mirrors apps/mobile/src/components/TaskCard.tsx.
class TaskCard extends StatelessWidget {
  final Task task;
  final int noteCount;
  final List<Note> attachments;
  final VoidCallback onToggle;
  final VoidCallback onOpen;
  final VoidCallback onStar;
  final VoidCallback onNotes;

  const TaskCard({
    super.key,
    required this.task,
    required this.noteCount,
    required this.attachments,
    required this.onToggle,
    required this.onOpen,
    required this.onStar,
    required this.onNotes,
  });

  @override
  Widget build(BuildContext context) {
    final progress = task.milestones.isNotEmpty ? taskProgress(task) : null;
    final dcls = task.deadline != null ? dateClass(task.deadline) : DateClass.none;
    final deadlineColor = dcls == DateClass.overdue ? AppColors.danger : (dcls == DateClass.soon ? AppColors.med : AppColors.ink3);
    final prioColor = AppColors.forPriority(task.priority);
    final hasPrio = task.priority != Priority.none;
    final title = displayTitle(task.title);

    return Opacity(
      opacity: task.done ? 0.55 : 1,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(color: AppColors.panel, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.line)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: GestureDetector(
                    onTap: onToggle,
                    child: Container(
                      width: 18,
                      height: 18,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: task.done ? AppColors.accent : AppColors.lineStrong, width: 1.5),
                        color: task.done ? AppColors.accent : null,
                      ),
                      child: task.done ? const Icon(Icons.check, size: 13, color: AppColors.accentInk) : null,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: GestureDetector(
                    onTap: onOpen,
                    child: Text(
                      title.isNotEmpty ? title : 'Untitled task',
                      style: TextStyle(
                        color: task.done ? AppColors.muted : AppColors.ink,
                        fontSize: 15,
                        height: 1.4,
                        decoration: task.done ? TextDecoration.lineThrough : null,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: Icon(task.starred ? Icons.star : Icons.star_border, size: 18, color: task.starred ? AppColors.star : AppColors.ink3),
                  onPressed: onStar,
                  visualDensity: VisualDensity.compact,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
            if (hasPrio || task.deadline != null || noteCount > 0 || attachments.isNotEmpty) ...[
              const SizedBox(height: 10),
              Padding(
                padding: const EdgeInsets.only(left: 30),
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    if (hasPrio && !task.done)
                      _chip(
                        color: prioColor,
                        label: _prioLabel[task.priority] ?? '',
                        leading: Container(width: 6, height: 6, decoration: BoxDecoration(color: prioColor, shape: BoxShape.circle)),
                      ),
                    if (task.deadline != null)
                      _chip(
                        color: deadlineColor,
                        label: fmtDate(task.deadline) + (task.deadlineTime != null ? ' · ${task.deadlineTime}' : ''),
                        icon: Icons.calendar_today_outlined,
                      ),
                    if (noteCount > 0)
                      _chip(
                        color: const Color(0xFFA855F7),
                        label: '$noteCount note${noteCount > 1 ? 's' : ''}',
                        icon: Icons.edit_outlined,
                        onTap: onNotes,
                      ),
                    ...attachments.take(3).map((a) => _chip(
                          color: a.kind == NoteKind.voice ? const Color(0xFFFACC15) : (a.kind == NoteKind.image ? const Color(0xFF3B82F6) : const Color(0xFFA855F7)),
                          label: a.body.isNotEmpty ? a.body : a.kind.name,
                          icon: _chipIcon(a.kind),
                          onTap: onOpen,
                        )),
                    if (attachments.length > 3) _chip(color: AppColors.muted, label: '+${attachments.length - 3}', onTap: onOpen),
                  ],
                ),
              ),
            ],
            if (progress != null && progress.total > 0) ...[
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.only(left: 30),
                child: Row(
                  children: [
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(1),
                        child: LinearProgressIndicator(value: progress.pct / 100, minHeight: 2, backgroundColor: AppColors.lineStrong, color: AppColors.ink3),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text('${progress.done}/${progress.total}', style: const TextStyle(color: AppColors.ink3, fontSize: 10)),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _chip({required Color color, required String label, IconData? icon, Widget? leading, VoidCallback? onTap}) {
    final child = Container(
      constraints: const BoxConstraints(maxWidth: 160),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        border: Border.all(color: color.withValues(alpha: 0.35)),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        ?leading,
        if (icon != null) Icon(icon, size: 11, color: color),
        if (leading != null || icon != null) const SizedBox(width: 5),
        Flexible(child: Text(label, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color))),
      ]),
    );
    return onTap != null ? InkWell(onTap: onTap, borderRadius: BorderRadius.circular(6), child: child) : child;
  }
}
