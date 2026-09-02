import 'package:flutter/material.dart';

import '../core/helpers.dart';
import '../design/components.dart';
import '../design/icons.dart';
import '../design/tokens.dart';
import '../design/typography.dart';
import '../models/models.dart';

/// ═══════════════════════════════════════════════════════════════════════════
/// A task row.
///
/// At rest it shows only what you need in order to read the task: a checkbox,
/// the title, the star if it is set, and any metadata that actually exists.
/// The four action glyphs that used to sit on every row are behind one
/// affordance — with a dozen tasks on screen that was forty-eight icons
/// competing with twelve pieces of content.
///
/// The row draws no border of its own. Containment is the cluster spine's job
/// (see ClusterSpine); a bordered card inside a bordered group was the reason
/// it was hard to tell where one cluster ended and the next began.
/// ═══════════════════════════════════════════════════════════════════════════
class TaskCard extends StatefulWidget {
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
  State<TaskCard> createState() => _TaskCardState();
}

class _TaskCardState extends State<TaskCard> {
  bool _actionsOpen = false;

  @override
  Widget build(BuildContext context) {
    final p = context.ink;
    final t = widget.task;

    final progress = t.milestones.isNotEmpty ? taskProgress(t) : null;
    final overdue =
        t.deadline != null && dateClass(t.deadline) == DateClass.overdue;
    final title = displayTitle(t.title);

    final voice = widget.attachments
        .where((a) => a.kind == NoteKind.voice)
        .length;
    final images = widget.attachments
        .where((a) => a.kind == NoteKind.image)
        .length;
    final others = widget.attachments
        .where((a) => a.kind != NoteKind.voice && a.kind != NoteKind.image)
        .length;

    final hasMeta =
        t.deadline != null ||
        widget.noteCount > 0 ||
        widget.attachments.isNotEmpty ||
        (progress != null && progress.total > 0);

    return AnimatedOpacity(
      duration: Motion.base,
      curve: Motion.curve,
      opacity: t.done ? 0.5 : 1,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: widget.onOpen,
          onLongPress: () => setState(() => _actionsOpen = !_actionsOpen),
          borderRadius: Radii.brSm,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  SpiderCheckbox(
                    value: t.done,
                    onChanged: (_) => widget.onToggle(),
                  ),

                  // Priority reads as a weight of ink, never as a hue.
                  if (t.priority != Priority.none)
                    Container(
                      width: 5,
                      height: 5,
                      margin: const EdgeInsets.only(right: Space.md),
                      decoration: BoxDecoration(
                        color: switch (t.priority) {
                          Priority.high => p.ink,
                          Priority.med => p.inkMuted,
                          _ => p.inkFaint,
                        },
                        shape: BoxShape.circle,
                      ),
                    ),

                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: Space.lg),
                      child: Text(
                        title.isNotEmpty ? title : 'Untitled task',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: AppType.body(t.done ? p.inkMuted : p.ink)
                            .copyWith(
                              decoration: t.done
                                  ? TextDecoration.lineThrough
                                  : null,
                              decorationColor: p.inkFaint,
                            ),
                      ),
                    ),
                  ),

                  // Drawn only when set, or while the row is open: an empty
                  // star on every row is noise the content must compete with.
                  if (t.starred || _actionsOpen)
                    SpiderStar(starred: t.starred, onTap: widget.onStar),

                  SpiderTapIcon(
                    SpiderIcons.moreHoriz,
                    size: 16,
                    color: _actionsOpen ? p.ink : p.inkFaint,
                    hitSize: 38,
                    tooltip: 'Actions',
                    onTap: () => setState(() => _actionsOpen = !_actionsOpen),
                  ),
                ],
              ),

              if (hasMeta)
                Padding(
                  padding: const EdgeInsets.only(
                    left: 40,
                    bottom: Space.lg,
                    right: Space.md,
                  ),
                  child: Wrap(
                    spacing: Space.lg,
                    runSpacing: Space.sm,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      if (t.deadline != null)
                        _Meta(
                          icon: SpiderIcons.clock,
                          label: fmtDate(t.deadline),
                          tone: overdue ? p.danger : p.inkFaint,
                        ),
                      if (progress != null && progress.total > 0)
                        _Meta(
                          icon: SpiderIcons.checklist,
                          label: '${progress.done}/${progress.total}',
                          tone: p.inkFaint,
                        ),
                      if (widget.noteCount > 0)
                        _Meta(
                          icon: SpiderIcons.note,
                          label: '${widget.noteCount}',
                          tone: p.inkFaint,
                        ),
                      if (voice > 0)
                        _Meta(
                          icon: SpiderIcons.mic,
                          label: '$voice',
                          tone: p.inkFaint,
                        ),
                      if (images > 0)
                        _Meta(
                          icon: SpiderIcons.image,
                          label: '$images',
                          tone: p.inkFaint,
                        ),
                      if (others > 0)
                        _Meta(
                          icon: SpiderIcons.attach,
                          label: '$others',
                          tone: p.inkFaint,
                        ),
                    ],
                  ),
                ),

              // Revealed on demand — by the overflow glyph or a long press.
              AnimatedSize(
                duration: Motion.base,
                curve: Motion.curve,
                alignment: Alignment.topCenter,
                child: !_actionsOpen
                    ? const SizedBox(width: double.infinity)
                    : Padding(
                        padding: const EdgeInsets.only(
                          left: 34,
                          bottom: Space.sm,
                        ),
                        child: Row(
                          children: [
                            SpiderTapIcon(
                              SpiderIcons.note,
                              size: 16,
                              hitSize: 40,
                              tooltip: 'Notes',
                              onTap: widget.onNotes,
                            ),
                            SpiderTapIcon(
                              SpiderIcons.pencil,
                              size: 16,
                              hitSize: 40,
                              tooltip: 'Edit',
                              onTap: widget.onOpen,
                            ),
                            if (widget.onCold != null)
                              SpiderTapIcon(
                                SpiderIcons.snowflake,
                                size: 16,
                                hitSize: 40,
                                tooltip: 'Move to cold store',
                                onTap: widget.onCold,
                              ),
                            if (widget.onDelete != null)
                              SpiderTapIcon(
                                SpiderIcons.trash,
                                size: 16,
                                hitSize: 40,
                                danger: true,
                                tooltip: 'Move to bin',
                                onTap: widget.onDelete,
                              ),
                          ],
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// One metadata pair. No pill, no fill — an icon and a figure, set quietly.
class _Meta extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color tone;

  const _Meta({required this.icon, required this.label, required this.tone});

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      AppIcon(icon, size: 12, color: tone),
      const SizedBox(width: Space.sm),
      Text(label, style: AppType.numeric(tone)),
    ],
  );
}
