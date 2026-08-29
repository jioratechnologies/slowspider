import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/app_icons.dart';
import '../core/app_theme.dart';
import '../core/helpers.dart';
import '../models/models.dart';

class TaskCard extends StatelessWidget {
  final Task task;
  final int noteCount;
  final List<Note> attachments;
  final VoidCallback onToggle;
  final VoidCallback onOpen;
  final VoidCallback onStar;
  final VoidCallback onNotes;
  final VoidCallback? onCold;
  final VoidCallback? onDelete;

  const TaskCard({
    super.key,
    required this.task,
    required this.noteCount,
    required this.attachments,
    required this.onToggle,
    required this.onOpen,
    required this.onStar,
    required this.onNotes,
    this.onCold,
    this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final cardBg = isDark ? AppColors.panel : AppColors.lightPanel;
    final cardBorder = isDark ? AppColors.line : AppColors.lightLine;
    final textColor = isDark ? AppColors.ink : AppColors.lightInk;
    final mutedColor = isDark ? AppColors.muted : AppColors.lightMuted;
    final subtextColor = isDark ? AppColors.ink3 : AppColors.lightInk3;

    final progress = task.milestones.isNotEmpty ? taskProgress(task) : null;
    final dcls = task.deadline != null ? dateClass(task.deadline) : DateClass.none;
    final deadlineColor = dcls == DateClass.overdue
        ? AppColors.danger
        : (dcls == DateClass.soon ? AppColors.med : subtextColor);
    final prioColor = AppColors.forPriority(task.priority);
    final hasPrio = task.priority != Priority.none;
    final title = displayTitle(task.title);

    final voiceNotes = attachments.where((a) => a.kind == NoteKind.voice).toList();
    final imageNotes = attachments.where((a) => a.kind == NoteKind.image).toList();
    final otherNotes = attachments.where((a) => a.kind != NoteKind.voice && a.kind != NoteKind.image).toList();

    final hasMeta = task.deadline != null || noteCount > 0 || attachments.isNotEmpty || (progress != null && progress.total > 0);

    return AnimatedOpacity(
      duration: const Duration(milliseconds: 160),
      opacity: task.done ? 0.55 : 1.0,
      child: Container(
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: task.done ? (isDark ? AppColors.line : AppColors.lightLine) : cardBorder,
            width: 1,
          ),
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          child: InkWell(
            onTap: onOpen,
            borderRadius: BorderRadius.circular(10),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Row 1: Checkbox + Priority Dot + Title + Star
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      // Monochrome Checkbox (Comfortable Touch Target)
                      GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTap: onToggle,
                        child: Container(
                          width: 24,
                          height: 24,
                          decoration: BoxDecoration(
                            color: task.done ? (isDark ? AppColors.ink : AppColors.lightInk) : Colors.transparent,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(
                              color: task.done
                                  ? (isDark ? AppColors.ink : AppColors.lightInk)
                                  : (isDark ? AppColors.lineStrong : AppColors.lightLineStrong),
                              width: 1.5,
                            ),
                          ),
                          alignment: Alignment.center,
                          child: task.done
                              ? Icon(Icons.check_rounded, size: 16, color: isDark ? AppColors.accentInk : AppColors.lightAccentInk)
                              : null,
                        ),
                      ),
                      const SizedBox(width: 9),

                      // Priority Dot
                      if (hasPrio) ...[
                        Container(
                          width: 7,
                          height: 7,
                          decoration: BoxDecoration(color: prioColor, shape: BoxShape.circle),
                        ),
                        const SizedBox(width: 7),
                      ],

                      // Task Title
                      Expanded(
                        child: Text(
                          title.isNotEmpty ? title : 'Untitled task',
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: task.done ? mutedColor : textColor,
                            decoration: task.done ? TextDecoration.lineThrough : null,
                            decorationColor: mutedColor,
                            height: 1.3,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 6),

                      // Star toggle (Larger touch target)
                      _pillAction(
                        icon: task.starred ? Icons.star_rounded : Icons.star_outline_rounded,
                        iconSize: 19,
                        tooltip: task.starred ? 'Starred' : 'Star',
                        color: task.starred
                            ? (isDark ? AppColors.ink : AppColors.lightInk)
                            : (isDark ? AppColors.ink3 : AppColors.lightInk3),
                        onTap: onStar,
                      ),
                    ],
                  ),

                  // Row 2: Quick Action Pill (right-aligned, below title)
                  Padding(
                    padding: const EdgeInsets.only(left: 33, top: 6),
                    child: Row(
                      children: [
                        const Spacer(),
                        GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onTap: () {},
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 3, vertical: 2),
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.panel2 : AppColors.lightPanel2,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: isDark ? AppColors.line : AppColors.lightLine,
                                width: 1.0,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                _pillAction(
                                  icon: AppIcons.notes,
                                  iconSize: 15,
                                  tooltip: 'Notes',
                                  color: isDark ? AppColors.muted : AppColors.lightMuted,
                                  onTap: onNotes,
                                ),
                                _pillAction(
                                  icon: AppIcons.edit,
                                  iconSize: 15,
                                  tooltip: 'Edit task',
                                  color: isDark ? AppColors.muted : AppColors.lightMuted,
                                  onTap: onOpen,
                                ),
                                if (onCold != null)
                                  _pillAction(
                                    icon: AppIcons.coldStore,
                                    iconSize: 15,
                                    tooltip: 'Move to Cold store',
                                    color: isDark ? AppColors.muted : AppColors.lightMuted,
                                    onTap: onCold!,
                                  ),
                                if (onDelete != null)
                                  _pillAction(
                                    icon: AppIcons.delete,
                                    iconSize: 15,
                                    tooltip: 'Move to bin',
                                    color: isDark ? AppColors.muted : AppColors.lightMuted,
                                    hoverDanger: true,
                                    onTap: onDelete!,
                                  ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Metadata Row: Deadlines, Attachments, Notes chips, Milestones
                  if (hasMeta) ...[
                    const SizedBox(height: 6),
                    Padding(
                      padding: const EdgeInsets.only(left: 33),
                      child: Wrap(
                        spacing: 6,
                        runSpacing: 5,
                        children: [
                          // Deadline badge
                          if (task.deadline != null)
                            _badge(
                              color: deadlineColor,
                              bgColor: isDark ? AppColors.panel2 : AppColors.lightPanel2,
                              icon: Icons.access_time_rounded,
                              label: fmtDate(task.deadline),
                              onTap: onOpen,
                            ),

                          // Voice Notes badge
                          if (voiceNotes.isNotEmpty)
                            _badge(
                              color: isDark ? AppColors.muted : AppColors.lightMuted,
                              bgColor: isDark ? AppColors.panel2 : AppColors.lightPanel2,
                              icon: AppIcons.voiceNote,
                              label: voiceNotes.length == 1 ? 'Voice' : '${voiceNotes.length}',
                              onTap: onOpen,
                            ),

                          // Images badge
                          if (imageNotes.isNotEmpty)
                            _badge(
                              color: isDark ? AppColors.muted : AppColors.lightMuted,
                              bgColor: isDark ? AppColors.panel2 : AppColors.lightPanel2,
                              icon: AppIcons.imageAttachment,
                              label: imageNotes.length == 1 ? 'Image' : '${imageNotes.length}',
                              onTap: onOpen,
                            ),

                          // Other Attachments badge
                          if (otherNotes.isNotEmpty)
                            _badge(
                              color: isDark ? AppColors.muted : AppColors.lightMuted,
                              bgColor: isDark ? AppColors.panel2 : AppColors.lightPanel2,
                              icon: AppIcons.fileAttachment,
                              label: '${otherNotes.length}',
                              onTap: onOpen,
                            ),

                          // Milestones count
                          if (progress != null && progress.total > 0)
                            _badge(
                              color: isDark ? AppColors.muted : AppColors.lightMuted,
                              bgColor: isDark ? AppColors.panel2 : AppColors.lightPanel2,
                              icon: Icons.checklist_rounded,
                              label: '${progress.done}/${progress.total}',
                              onTap: onOpen,
                            ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _pillAction({
    required IconData icon,
    double iconSize = 15,
    required String tooltip,
    required Color color,
    Color? bgColor,
    Color? borderColor,
    bool hoverDanger = false,
    required VoidCallback onTap,
  }) {
    return Tooltip(
      message: tooltip,
      waitDuration: const Duration(milliseconds: 200),
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Container(
          width: 28,
          height: 28,
          margin: const EdgeInsets.symmetric(horizontal: 1.5),
          decoration: BoxDecoration(
            color: bgColor ?? Colors.transparent,
            borderRadius: BorderRadius.circular(6),
            border: borderColor != null ? Border.all(color: borderColor, width: 0.8) : null,
          ),
          child: Center(
            child: Icon(
              icon,
              size: iconSize,
              color: color,
            ),
          ),
        ),
      ),
    );
  }

  Widget _badge({
    required Color color,
    required Color bgColor,
    required IconData icon,
    required String label,
    VoidCallback? onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(6),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(6),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 12, color: color),
              const SizedBox(width: 4),
              Text(
                label,
                style: GoogleFonts.inter(
                  color: color,
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
