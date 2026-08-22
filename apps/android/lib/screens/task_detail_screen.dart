import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/app_theme.dart';
import '../core/helpers.dart';
import '../models/models.dart';
import '../state/auth_provider.dart';
import '../state/board_provider.dart';
import '../widgets/attachments_section.dart';
import '../widgets/notes_section.dart';

/// Combines apps/mobile's TaskSheet.tsx (details/priority/deadline/cluster/milestones/
/// attachments) and NotesSheet.tsx (authored notes) into one screen with two tabs, since
/// go_router pushes full routes rather than RN's sibling-modal pattern.
class TaskDetailScreen extends ConsumerStatefulWidget {
  final int taskId;
  final bool initialNotesTab;
  const TaskDetailScreen({super.key, required this.taskId, this.initialNotesTab = false});

  @override
  ConsumerState<TaskDetailScreen> createState() => _TaskDetailScreenState();
}

class _TaskDetailScreenState extends ConsumerState<TaskDetailScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _msCtrl = TextEditingController();
  late TextEditingController _titleCtrl;
  late TextEditingController _deadlineCtrl;
  late TextEditingController _timeCtrl;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this, initialIndex: widget.initialNotesTab ? 1 : 0);
    _titleCtrl = TextEditingController();
    _deadlineCtrl = TextEditingController();
    _timeCtrl = TextEditingController();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _msCtrl.dispose();
    _titleCtrl.dispose();
    _deadlineCtrl.dispose();
    _timeCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final board = ref.watch(boardProvider);
    final controller = ref.read(boardProvider.notifier);
    final userId = ref.watch(authProvider).session?.userId ?? '';
    final data = board.data;
    final task = data?.tasks.where((t) => t.id == widget.taskId).cast<Task?>().firstWhere((_) => true, orElse: () => null);

    if (task == null) {
      return Scaffold(appBar: AppBar(), body: const Center(child: Text('Task not found.', style: TextStyle(color: AppColors.ink3))));
    }

    if (_titleCtrl.text != task.title && !_titleCtrl.selection.isValid) _titleCtrl.text = task.title;
    if (_deadlineCtrl.text.isEmpty && task.deadline != null) _deadlineCtrl.text = task.deadline!;
    if (_timeCtrl.text.isEmpty && task.deadlineTime != null) _timeCtrl.text = task.deadlineTime!;

    final notes = data!.notes.where((n) => n.taskId == task.id).toList();
    final attachments = notes.where((n) => isAttachmentKind(n.kind)).toList();
    final textNotes = notes.where((n) => isTextNoteKind(n.kind)).toList();
    final clusters = data.clusters.where((c) => c.status == ClusterStatus.active).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Task'),
        actions: [
          IconButton(
            icon: Icon(task.starred ? Icons.star : Icons.star_border, color: task.starred ? AppColors.star : AppColors.ink),
            onPressed: () => controller.patchTask(task.id, {'starred': !task.starred}, (t) => t.copyWith(starred: !t.starred)),
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline, color: AppColors.danger),
            onPressed: () => _confirmBin(context, controller, task),
          ),
        ],
        bottom: TabBar(controller: _tabController, tabs: [
          const Tab(text: 'Details'),
          Tab(text: 'Notes${textNotes.isNotEmpty ? ' (${textNotes.length})' : ''}'),
          Tab(text: 'Files${attachments.isNotEmpty ? ' (${attachments.length})' : ''}'),
        ]),
      ),
      body: TabBarView(controller: _tabController, children: [
        // ---- Details ----
        ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextField(
              controller: _titleCtrl,
              maxLines: null,
              style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w600, color: AppColors.ink),
              decoration: const InputDecoration(border: InputBorder.none, hintText: 'Untitled'),
              onChanged: (v) => controller.patchTask(task.id, {'title': v}, (t) => t.copyWith(title: v)),
            ),
            const SizedBox(height: 10),
            const _Label('Priority'),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: Priority.values.map((p) {
                final label = {Priority.high: 'High', Priority.med: 'Med', Priority.low: 'Low', Priority.none: 'None'}[p]!;
                final selected = task.priority == p;
                return ChoiceChip(
                  label: Text(label),
                  selected: selected,
                  selectedColor: p == Priority.none ? AppColors.ink : AppColors.forPriority(p),
                  onSelected: (_) => controller.patchTask(task.id, {'priority': p.name}, (t) => t.copyWith(priority: p)),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
            const _Label('Deadline'),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(
                child: TextField(
                  controller: _deadlineCtrl,
                  decoration: const InputDecoration(labelText: 'YYYY-MM-DD'),
                  onSubmitted: (v) => controller.patchTask(task.id, {'deadline': v.isEmpty ? null : v}, (t) => t.copyWith(deadline: v.isEmpty ? null : v, deadlineSet: true)),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _timeCtrl,
                  decoration: const InputDecoration(labelText: 'HH:MM'),
                  onSubmitted: (v) => controller.patchTask(task.id, {'deadline_time': v.isEmpty ? null : v}, (t) => t.copyWith(deadlineTime: v.isEmpty ? null : v, deadlineTimeSet: true)),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.check, color: AppColors.accent),
                onPressed: () {
                  final d = _deadlineCtrl.text.trim();
                  final tm = _timeCtrl.text.trim();
                  controller.patchTask(
                    task.id,
                    {'deadline': d.isEmpty ? null : d, 'deadline_time': tm.isEmpty ? null : tm},
                    (t) => t.copyWith(deadline: d.isEmpty ? null : d, deadlineSet: true, deadlineTime: tm.isEmpty ? null : tm, deadlineTimeSet: true),
                  );
                },
              ),
            ]),
            const Text('A time is what makes it eligible for calendar sync.', style: TextStyle(color: AppColors.ink3, fontSize: 12)),
            const SizedBox(height: 16),
            const _Label('Cluster'),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ChoiceChip(label: const Text('Floating'), selected: task.clusterId == null, onSelected: (_) => controller.moveTask(task.id, null)),
                ...clusters.map((c) => ChoiceChip(
                      label: Text(c.name),
                      avatar: CircleAvatar(backgroundColor: colorFromHex(c.color), radius: 6),
                      selected: task.clusterId == c.id,
                      onSelected: (_) => controller.moveTask(task.id, c.id),
                    )),
              ],
            ),
            const SizedBox(height: 16),
            const _Label('Milestones'),
            const SizedBox(height: 8),
            if (task.milestones.isEmpty) const Text('No milestones yet.', style: TextStyle(color: AppColors.ink3, fontSize: 13)),
            for (final m in task.milestones)
              Row(children: [
                Checkbox(value: m.done, onChanged: (_) => controller.toggleMilestone(task.id, m.id), activeColor: AppColors.accent),
                Expanded(
                  child: TextFormField(
                    initialValue: m.title,
                    style: TextStyle(color: AppColors.ink, decoration: m.done ? TextDecoration.lineThrough : null),
                    decoration: const InputDecoration(border: InputBorder.none),
                    onFieldSubmitted: (v) {
                      if (v.trim().isNotEmpty && v != m.title) controller.renameMilestone(task.id, m.id, v.trim());
                    },
                  ),
                ),
                IconButton(icon: const Icon(Icons.close, size: 17), onPressed: () => controller.deleteMilestone(task.id, m.id)),
              ]),
            Row(children: [
              Expanded(
                child: TextField(
                  controller: _msCtrl,
                  decoration: const InputDecoration(labelText: 'Add a milestone'),
                  onSubmitted: (_) {
                    final v = _msCtrl.text.trim();
                    if (v.isNotEmpty) {
                      controller.addMilestone(task.id, v);
                      _msCtrl.clear();
                    }
                  },
                ),
              ),
              IconButton(
                icon: const Icon(Icons.add_circle, color: AppColors.accent),
                onPressed: () {
                  final v = _msCtrl.text.trim();
                  if (v.isNotEmpty) {
                    controller.addMilestone(task.id, v);
                    _msCtrl.clear();
                  }
                },
              ),
            ]),
            const SizedBox(height: 16),
            const _Label('Free-form notes'),
            const SizedBox(height: 8),
            TextFormField(
              initialValue: task.notes,
              maxLines: 4,
              decoration: const InputDecoration(hintText: 'Anything else…'),
              onFieldSubmitted: (v) => controller.patchTask(task.id, {'notes': v}, (t) => t.copyWith(notes: v)),
            ),
          ],
        ),
        // ---- Notes ----
        SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Private notes stay visible only to you, even when this workspace is shared.', style: TextStyle(color: AppColors.ink3, fontSize: 13)),
            const SizedBox(height: 12),
            NotesSection(
              parent: NoteParent(taskId: task.id),
              notes: textNotes,
              userId: userId,
              resetKey: task.id,
              onAdd: controller.addNote,
              onDelete: controller.deleteNote,
            ),
          ]),
        ),
        // ---- Files ----
        SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: AttachmentsSection(
            taskId: task.id,
            attachments: attachments,
            storageUsed: data.storageUsed,
            currentUserId: userId,
            onAdd: controller.addNote,
            onDelete: controller.deleteNote,
          ),
        ),
      ]),
    );
  }

  void _confirmBin(BuildContext context, BoardController controller, Task task) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.panel,
        title: const Text('Move to bin?'),
        content: Text('"${displayTitle(task.title).isNotEmpty ? displayTitle(task.title) : 'Untitled'}" goes to the Dumping bin.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              final now = DateTime.now().toIso8601String();
              controller.patchTask(task.id, {'binned': true, 'cold': false, 'binned_at': now}, (t) => t.copyWith(binned: true, cold: false, binnedAt: now, binnedAtSet: true));
              Navigator.of(context).pop();
            },
            child: const Text('Move to bin', style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
  }
}

class _Label extends StatelessWidget {
  final String text;
  const _Label(this.text);
  @override
  Widget build(BuildContext context) => Text(text.toUpperCase(), style: const TextStyle(color: AppColors.muted, fontSize: 11, letterSpacing: 0.6, fontWeight: FontWeight.w600));
}
