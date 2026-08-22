import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

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
    this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final cardBg = isDark ? const Color(0xFF1B1D26) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF282B38) : const Color(0xFFE5E7EB);
    final textColor = isDark ? const Color(0xFFF3F4F6) : const Color(0xFF111827);
    final mutedColor = isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280);
    final subtextColor = isDark ? const Color(0xFF6B7280) : const Color(0xFF9CA3AF);
    final actionPillBg = isDark ? const Color(0xFF14151C) : const Color(0xFFF3F4F6);
    final actionPillBorder = isDark ? const Color(0xFF2B2E3D) : const Color(0xFFE2E4EB);

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
      opacity: task.done ? 0.6 : 1.0,
      child: Container(
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: task.done ? (isDark ? const Color(0xFF20222C) : const Color(0xFFE5E7EB)) : cardBorder,
            width: 1,
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
              padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Main Row: Emerald Checkbox + Priority Dot + Title + Action Pill
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      // Emerald Checkbox (Comfortable 22x22 Touch Target)
                      GestureDetector(
                        onTap: onToggle,
                        child: Container(
                          width: 22,
                          height: 22,
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
                            boxShadow: task.done
                                ? [
                                    BoxShadow(
                                      color: const Color(0xFF10B981).withValues(alpha: 0.3),
                                      blurRadius: 6,
                                    ),
                                  ]
                                : null,
                          ),
                          alignment: Alignment.center,
                          child: task.done
                              ? const Icon(Icons.check_rounded, size: 15.5, color: Color(0xFF10B981))
                              : null,
                        ),
                      ),
                      const SizedBox(width: 8),

                      // Priority Dot
                      if (hasPrio && !task.done) ...[
                        Container(
                          width: 6.5,
                          height: 6.5,
                          decoration: BoxDecoration(
                            color: prioColor,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(color: prioColor.withValues(alpha: 0.6), blurRadius: 4),
                            ],
                          ),
                        ),
                        const SizedBox(width: 6),
                      ],

                      // Title
                      Expanded(
                        child: Text(
                          title.isNotEmpty ? title : 'Untitled task',
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            height: 1.3,
                            color: task.done ? mutedColor : textColor,
                            decoration: task.done ? TextDecoration.lineThrough : null,
                            decorationColor: mutedColor,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),

                      // Quick Action Floating Pill (Comfortable Touch Targets with 17.5px Icons)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2.5),
                        decoration: BoxDecoration(
                          color: actionPillBg,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: actionPillBorder, width: 0.9),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            // 1. Notes icon
                            _pillAction(
                              icon: Icons.edit_note_rounded,
                              tooltip: 'Notes',
                              color: subtextColor,
                              onTap: onNotes,
                            ),
                            const SizedBox(width: 2),
                            // 2. Edit Task icon
                            _pillAction(
                              icon: Icons.edit_outlined,
                              tooltip: 'Edit task',
                              color: subtextColor,
                              onTap: onOpen,
                            ),
                            const SizedBox(width: 2),
                            // 3. Delete to bin icon
                            if (onDelete != null) ...[
                              _pillAction(
                                icon: Icons.delete_outline_rounded,
                                tooltip: 'Move to bin',
                                color: subtextColor,
                                hoverDanger: true,
                                onTap: onDelete!,
                              ),
                              const SizedBox(width: 2),
                            ],
                            // 4. Star toggle icon
                            _pillAction(
                              icon: task.starred ? Icons.star_rounded : Icons.star_outline_rounded,
                              tooltip: task.starred ? 'Starred' : 'Star',
                              color: task.starred ? AppColors.star : subtextColor,
                              onTap: onStar,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  // Metadata Row: Deadlines, Attachments, Notes chips, Milestones
                  if (hasMeta) ...[
                    const SizedBox(height: 6),
                    Padding(
                      padding: const EdgeInsets.only(left: 30),
                      child: Wrap(
                        spacing: 5,
                        runSpacing: 4,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          // Deadline
                          if (task.deadline != null)
                            _badge(
                              color: deadlineColor,
                              bgColor: dcls == DateClass.overdue
                                  ? AppColors.danger.withValues(alpha: 0.12)
                                  : (isDark ? const Color(0xFF222532) : const Color(0xFFF3F4F6)),
                              icon: Icons.schedule_rounded,
                              label: fmtDate(task.deadline),
                            ),

                          // Notes count badge
                          if (noteCount > 0)
                            _badge(
                              color: const Color(0xFFA855F7),
                              bgColor: isDark ? const Color(0xFF291B3A) : const Color(0xFFF3E8FF),
                              icon: Icons.edit_note_rounded,
                              label: '$noteCount',
                              onTap: onNotes,
                            ),

                          // Voice badge
                          if (voiceNotes.isNotEmpty)
                            _badge(
                              color: const Color(0xFFF59E0B),
                              bgColor: isDark ? const Color(0xFF2C2210) : const Color(0xFFFEF3C7),
                              icon: Icons.mic_rounded,
                              label: voiceNotes.length == 1 ? 'Voice' : '${voiceNotes.length}',
                            ),

                          // Image badge
                          if (imageNotes.isNotEmpty)
                            _badge(
                              color: const Color(0xFF38BDF8),
                              bgColor: isDark ? const Color(0xFF132536) : const Color(0xFFEFF6FF),
                              icon: Icons.image_rounded,
                              label: imageNotes.length == 1 ? 'Image' : '${imageNotes.length}',
                            ),

                          // Other files badge
                          if (otherNotes.isNotEmpty)
                            _badge(
                              color: mutedColor,
                              bgColor: isDark ? const Color(0xFF222532) : const Color(0xFFF3F4F6),
                              icon: Icons.attach_file_rounded,
                              label: '${otherNotes.length}',
                            ),

                          // Milestone Progress Ring
                          if (progress != null && progress.total > 0)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: isDark ? const Color(0xFF202330) : const Color(0xFFF3F4F6),
                                borderRadius: BorderRadius.circular(5),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  SizedBox(
                                    width: 9,
                                    height: 9,
                                    child: CircularProgressIndicator(
                                      value: progress.pct / 100,
                                      strokeWidth: 1.6,
                                      backgroundColor: isDark ? const Color(0xFF35394C) : const Color(0xFFD1D5DB),
                                      color: AppColors.accent,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    '${progress.done}/${progress.total}',
                                    style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w600, color: mutedColor),
                                  ),
                                ],
                              ),
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
    required String tooltip,
    required Color color,
    bool hoverDanger = false,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(6),
      child: Padding(
        padding: const EdgeInsets.all(4.5),
        child: Icon(
          icon,
          size: 17.5,
          color: color,
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
    final badge = Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(5),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 3.5),
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 10.5,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );

    if (onTap != null) {
      return InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(5),
        child: badge,
      );
    }
    return badge;
  }
}
