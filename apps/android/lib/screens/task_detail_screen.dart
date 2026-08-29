import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/app_icons.dart';
import '../core/app_theme.dart';
import '../core/helpers.dart';
import '../models/models.dart';
import '../state/auth_provider.dart';
import '../state/board_provider.dart';
import '../widgets/attachments_section.dart';
import '../widgets/custom_date_picker_dialog.dart';
import '../widgets/custom_time_picker_dialog.dart';
import '../widgets/notes_section.dart';

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
  late TextEditingController _notesCtrl;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this, initialIndex: widget.initialNotesTab ? 1 : 0);
    _titleCtrl = TextEditingController();
    _notesCtrl = TextEditingController();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _msCtrl.dispose();
    _titleCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate(BuildContext context, Task task, BoardController controller) async {
    final initialDate = DateTime.tryParse(task.deadline ?? '') ?? DateTime.now();
    final picked = await showCustomDatePicker(
      context,
      initialDate: initialDate,
    );
    if (picked != null) {
      final iso = '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
      controller.patchTask(task.id, {'deadline': iso}, (t) => t.copyWith(deadline: iso, deadlineSet: true));
    }
  }

  Future<void> _pickTime(BuildContext context, Task task, BoardController controller) async {
    final parts = (task.deadlineTime ?? '09:00').split(':').map((s) => int.tryParse(s) ?? 0).toList();
    final initialTime = TimeOfDay(hour: parts.isNotEmpty ? parts[0] : 9, minute: parts.length > 1 ? parts[1] : 0);
    final picked = await showCustomTimePicker(context, initialTime: initialTime);
    if (picked != null) {
      final formatted = '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
      controller.patchTask(task.id, {'deadline_time': formatted}, (t) => t.copyWith(deadlineTime: formatted, deadlineTimeSet: true));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final topBarBg = isDark ? const Color(0xE6181926) : const Color(0xF2FFFFFF);
    final topBarBorder = isDark ? const Color(0xFF2C3042) : const Color(0xFFE2E4EB);
    final cardBg = isDark ? const Color(0xFF191B26) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF282B3C) : const Color(0xFFE5E7EB);
    final inputBg = isDark ? const Color(0xFF1E212E) : const Color(0xFFF3F4F6);
    final textColor = theme.colorScheme.onSurface;
    final mutedColor = isDark ? const Color(0xFF949BAE) : const Color(0xFF6B7280);
    final ink3Color = isDark ? AppColors.ink3 : AppColors.lightInk3;

    final board = ref.watch(boardProvider);
    final controller = ref.read(boardProvider.notifier);
    final userId = ref.watch(authProvider).session?.userId ?? '';
    final data = board.data;
    final task = data?.tasks.where((t) => t.id == widget.taskId).cast<Task?>().firstWhere((_) => true, orElse: () => null);

    if (task == null) {
      return Scaffold(
        appBar: AppBar(),
        body: Center(
          child: Text('Task not found.', style: GoogleFonts.inter(color: ink3Color, fontSize: 14)),
        ),
      );
    }

    if (_titleCtrl.text != task.title && !_titleCtrl.selection.isValid) _titleCtrl.text = task.title;
    if (_notesCtrl.text != task.notes && !_notesCtrl.selection.isValid) _notesCtrl.text = task.notes;

    final notes = data!.notes.where((n) => n.taskId == task.id).toList();
    final attachments = notes.where((n) => isAttachmentKind(n.kind)).toList();
    final textNotes = notes.where((n) => isTextNoteKind(n.kind)).toList();
    final clusters = data.clusters.where((c) => c.status == ClusterStatus.active).toList();

    return PopScope(
      canPop: true,
      child: GestureDetector(
        behavior: HitTestBehavior.translucent,
        onTap: () => FocusScope.of(context).unfocus(),
        child: Scaffold(
          backgroundColor: isDark ? const Color(0xFF0E0F14) : const Color(0xFFF8F9FB),
          appBar: AppBar(
            toolbarHeight: 56,
            backgroundColor: topBarBg,
            surfaceTintColor: Colors.transparent,
            elevation: 0,
            leading: IconButton(
              icon: Icon(AppIcons.back, color: textColor, size: 20),
              onPressed: () => Navigator.pop(context),
            ),
            title: Text(
              'Task Details',
              style: GoogleFonts.inter(color: textColor, fontSize: 16, fontWeight: FontWeight.w700),
            ),
            actions: [
              // Star Button
              IconButton(
                icon: Icon(
                  task.starred ? Icons.star_rounded : Icons.star_outline_rounded,
                  color: task.starred ? const Color(0xFFF59E0B) : mutedColor,
                  size: 22,
                ),
                tooltip: task.starred ? 'Unstar task' : 'Star task',
                onPressed: () => controller.patchTask(task.id, {'starred': !task.starred}, (t) => t.copyWith(starred: !t.starred)),
              ),
              // Delete / Bin Button
              IconButton(
                icon: const Icon(AppIcons.delete, color: AppColors.danger, size: 20),
                tooltip: 'Move to bin',
                onPressed: () => _confirmBin(context, controller, task),
              ),
              const SizedBox(width: 8),
            ],
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(50),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 820),
                  child: Column(
                    children: [
                      // Capsule Segmented Tab Bar
                      Container(
                        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                        padding: const EdgeInsets.all(3),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF14151E) : const Color(0xFFECEEF2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: isDark ? const Color(0xFF26293A) : const Color(0xFFE2E4EB)),
                        ),
                        child: TabBar(
                          controller: _tabController,
                          indicator: BoxDecoration(
                            color: isDark ? const Color(0xFF242738) : Colors.white,
                            borderRadius: BorderRadius.circular(9),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: isDark ? 0.25 : 0.06),
                                blurRadius: 4,
                                offset: const Offset(0, 1),
                              ),
                            ],
                          ),
                          indicatorSize: TabBarIndicatorSize.tab,
                          dividerColor: Colors.transparent,
                          labelColor: isDark ? Colors.white : AppColors.lightInk,
                          unselectedLabelColor: mutedColor,
                          labelStyle: GoogleFonts.inter(fontSize: 12.5, fontWeight: FontWeight.w700),
                          unselectedLabelStyle: GoogleFonts.inter(fontSize: 12.5, fontWeight: FontWeight.w500),
                          tabs: [
                            const Tab(height: 32, text: 'Details'),
                            Tab(height: 32, text: 'Notes${textNotes.isNotEmpty ? ' (${textNotes.length})' : ''}'),
                            Tab(height: 32, text: 'Files${attachments.isNotEmpty ? ' (${attachments.length})' : ''}'),
                          ],
                        ),
                      ),
                      Container(height: 1, color: topBarBorder),
                    ],
                  ),
                ),
              ),
            ),
          ),
          body: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 820),
              child: TabBarView(
                controller: _tabController,
                children: [
                  // ==========================================
                  // TAB 1: DETAILS
                  // ==========================================
                  ListView(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
                    children: [
                // 1. Task Title & Done Toggle Hero Card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: cardBg,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: cardBorder),
                    boxShadow: [
                      BoxShadow(
                        color: isDark ? Colors.black.withValues(alpha: 0.2) : Colors.black.withValues(alpha: 0.03),
                        blurRadius: 10,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Emerald Checkbox Toggle
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: GestureDetector(
                          onTap: () => controller.patchTask(task.id, {'done': !task.done}, (t) => t.copyWith(done: !t.done)),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 140),
                            width: 22,
                            height: 22,
                            decoration: BoxDecoration(
                              color: task.done ? const Color(0xFF10B981) : Colors.transparent,
                              borderRadius: BorderRadius.circular(7),
                              border: Border.all(
                                color: task.done ? const Color(0xFF10B981) : (isDark ? const Color(0xFF3C4054) : const Color(0xFFD1D5DB)),
                                width: 1.8,
                              ),
                            ),
                            alignment: Alignment.center,
                            child: task.done ? const Icon(Icons.check_rounded, size: 15, color: Colors.white) : null,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),

                      // Task Title Input
                      Expanded(
                        child: TextField(
                          controller: _titleCtrl,
                          maxLines: null,
                          style: GoogleFonts.inter(
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                            color: task.done ? mutedColor : textColor,
                            decoration: task.done ? TextDecoration.lineThrough : null,
                            height: 1.35,
                          ),
                          decoration: InputDecoration(
                            border: InputBorder.none,
                            enabledBorder: InputBorder.none,
                            focusedBorder: InputBorder.none,
                            disabledBorder: InputBorder.none,
                            errorBorder: InputBorder.none,
                            filled: false,
                            fillColor: Colors.transparent,
                            hintText: 'What needs to be done?',
                            hintStyle: GoogleFonts.inter(color: ink3Color, fontSize: 17, fontWeight: FontWeight.w500),
                            isDense: true,
                            contentPadding: EdgeInsets.zero,
                          ),
                          onChanged: (v) => controller.patchTask(task.id, {'title': v}, (t) => t.copyWith(title: v)),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // 2. Priority Card
                _buildSectionCard(
                  cardBg: cardBg,
                  cardBorder: cardBorder,
                  isDark: isDark,
                  title: 'PRIORITY',
                  ink3Color: ink3Color,
                  child: Row(
                    children: Priority.values.map((p) {
                      final isSel = task.priority == p;
                      final (label, color) = switch (p) {
                        Priority.high => ('High', const Color(0xFFEF4444)),
                        Priority.med => ('Med', const Color(0xFFF59E0B)),
                        Priority.low => ('Low', const Color(0xFF3B82F6)),
                        Priority.none => ('None', mutedColor),
                      };

                      return Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 3),
                          child: GestureDetector(
                            onTap: () => controller.patchTask(task.id, {'priority': p.name}, (t) => t.copyWith(priority: p)),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 140),
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              decoration: BoxDecoration(
                                color: isSel ? color.withValues(alpha: 0.16) : inputBg,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: isSel ? color : (isDark ? const Color(0xFF2E3244) : const Color(0xFFE2E4EA)),
                                  width: isSel ? 1.4 : 1,
                                ),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                label,
                                style: GoogleFonts.inter(
                                  color: isSel ? color : mutedColor,
                                  fontSize: 12,
                                  fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                                ),
                              ),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 14),

                // 3. Deadline & Schedule Card
                _buildSectionCard(
                  cardBg: cardBg,
                  cardBorder: cardBorder,
                  isDark: isDark,
                  title: 'DEADLINE & TIME',
                  ink3Color: ink3Color,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          // Date Picker Button
                          Expanded(
                            child: GestureDetector(
                              onTap: () => _pickDate(context, task, controller),
                              child: Container(
                                height: 42,
                                padding: const EdgeInsets.symmetric(horizontal: 12),
                                decoration: BoxDecoration(
                                  color: inputBg,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: isDark ? const Color(0xFF2E3244) : const Color(0xFFE2E4EA)),
                                ),
                                child: Row(
                                  children: [
                                    Icon(Icons.calendar_today_rounded, size: 16, color: AppColors.accent),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        task.deadline ?? 'Set date',
                                        style: GoogleFonts.inter(
                                          color: task.deadline != null ? textColor : ink3Color,
                                          fontSize: 13,
                                          fontWeight: task.deadline != null ? FontWeight.w600 : FontWeight.w400,
                                        ),
                                      ),
                                    ),
                                    if (task.deadline != null)
                                      GestureDetector(
                                        onTap: () => controller.patchTask(task.id, {'deadline': null}, (t) => t.copyWith(deadline: null, deadlineSet: true)),
                                        child: Icon(Icons.close_rounded, size: 15, color: mutedColor),
                                      ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),

                          // Time Picker Button
                          Expanded(
                            child: GestureDetector(
                              onTap: () => _pickTime(context, task, controller),
                              child: Container(
                                height: 42,
                                padding: const EdgeInsets.symmetric(horizontal: 12),
                                decoration: BoxDecoration(
                                  color: inputBg,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: isDark ? const Color(0xFF2E3244) : const Color(0xFFE2E4EA)),
                                ),
                                child: Row(
                                  children: [
                                    Icon(Icons.schedule_rounded, size: 16, color: const Color(0xFF38BDF8)),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        task.deadlineTime ?? 'Set time',
                                        style: GoogleFonts.inter(
                                          color: task.deadlineTime != null ? textColor : ink3Color,
                                          fontSize: 13,
                                          fontWeight: task.deadlineTime != null ? FontWeight.w600 : FontWeight.w400,
                                        ),
                                      ),
                                    ),
                                    if (task.deadlineTime != null)
                                      GestureDetector(
                                        onTap: () => controller.patchTask(task.id, {'deadline_time': null}, (t) => t.copyWith(deadlineTime: null, deadlineTimeSet: true)),
                                        child: Icon(Icons.close_rounded, size: 15, color: mutedColor),
                                      ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'A time is required for Google Calendar sync.',
                        style: GoogleFonts.inter(color: mutedColor, fontSize: 11.5),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // 4. Cluster Assignment Card
                _buildSectionCard(
                  cardBg: cardBg,
                  cardBorder: cardBorder,
                  isDark: isDark,
                  title: 'CLUSTER',
                  ink3Color: ink3Color,
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      // Floating Option
                      _buildClusterChip(
                        label: 'Floating',
                        color: mutedColor,
                        isSelected: task.clusterId == null,
                        isDark: isDark,
                        inputBg: inputBg,
                        onTap: () => controller.moveTask(task.id, null),
                      ),
                      // Cluster Options
                      for (final c in clusters)
                        _buildClusterChip(
                          label: c.name,
                          color: colorFromHex(c.color),
                          isSelected: task.clusterId == c.id,
                          isDark: isDark,
                          inputBg: inputBg,
                          onTap: () => controller.moveTask(task.id, c.id),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // 5. Milestones Checklist Card
                _buildSectionCard(
                  cardBg: cardBg,
                  cardBorder: cardBorder,
                  isDark: isDark,
                  title: 'MILESTONES (${task.milestones.where((m) => m.done).length}/${task.milestones.length})',
                  ink3Color: ink3Color,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (task.milestones.isEmpty)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Text(
                            'No milestones yet. Break down your task into steps.',
                            style: GoogleFonts.inter(color: mutedColor, fontSize: 12),
                          ),
                        )
                      else
                        for (final m in task.milestones)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 3),
                            child: Row(
                              children: [
                                GestureDetector(
                                  onTap: () => controller.toggleMilestone(task.id, m.id),
                                  child: Container(
                                    width: 18,
                                    height: 18,
                                    decoration: BoxDecoration(
                                      color: m.done ? const Color(0xFF10B981) : Colors.transparent,
                                      borderRadius: BorderRadius.circular(5),
                                      border: Border.all(
                                        color: m.done ? const Color(0xFF10B981) : (isDark ? const Color(0xFF383C4E) : const Color(0xFFD1D5DB)),
                                        width: 1.5,
                                      ),
                                    ),
                                    alignment: Alignment.center,
                                    child: m.done ? const Icon(Icons.check_rounded, size: 13, color: Colors.white) : null,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    m.title,
                                    style: GoogleFonts.inter(
                                      color: m.done ? mutedColor : textColor,
                                      fontSize: 13,
                                      decoration: m.done ? TextDecoration.lineThrough : null,
                                    ),
                                  ),
                                ),
                                IconButton(
                                  icon: Icon(Icons.close_rounded, size: 16, color: mutedColor),
                                  onPressed: () => controller.deleteMilestone(task.id, m.id),
                                  constraints: const BoxConstraints(),
                                  padding: const EdgeInsets.all(4),
                                ),
                              ],
                            ),
                          ),

                      const SizedBox(height: 10),

                      // Single-Outline Add Milestone Input with Inline Add Pill Button
                      TextField(
                        controller: _msCtrl,
                        style: GoogleFonts.inter(color: textColor, fontSize: 13),
                        decoration: InputDecoration(
                          hintText: 'Add a milestone...',
                          hintStyle: GoogleFonts.inter(color: ink3Color, fontSize: 12.5),
                          prefixIcon: Icon(Icons.add_task_rounded, size: 17, color: ink3Color),
                          suffixIcon: Padding(
                            padding: const EdgeInsets.only(right: 5, top: 4, bottom: 4),
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.accent,
                                foregroundColor: Colors.white,
                                elevation: 0,
                                padding: const EdgeInsets.symmetric(horizontal: 14),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                minimumSize: const Size(0, 32),
                              ),
                              onPressed: () {
                                final val = _msCtrl.text.trim();
                                if (val.isNotEmpty) {
                                  controller.addMilestone(task.id, val);
                                  _msCtrl.clear();
                                }
                              },
                              child: const Text('Add', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                            ),
                          ),
                          filled: true,
                          fillColor: inputBg,
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: cardBorder),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: cardBorder),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: AppColors.accent, width: 1.4),
                          ),
                        ),
                        onSubmitted: (v) {
                          final val = v.trim();
                          if (val.isNotEmpty) {
                            controller.addMilestone(task.id, val);
                            _msCtrl.clear();
                          }
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // 6. Free-Form Notes Card
                _buildSectionCard(
                  cardBg: cardBg,
                  cardBorder: cardBorder,
                  isDark: isDark,
                  title: 'FREE-FORM NOTES',
                  ink3Color: ink3Color,
                  child: TextField(
                    controller: _notesCtrl,
                    maxLines: 4,
                    style: GoogleFonts.inter(color: textColor, fontSize: 13, height: 1.4),
                    decoration: InputDecoration(
                      hintText: 'Add extra details, context, or links...',
                      hintStyle: GoogleFonts.inter(color: ink3Color, fontSize: 13),
                      filled: true,
                      fillColor: inputBg,
                      contentPadding: const EdgeInsets.all(12),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: cardBorder),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: cardBorder),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.accent, width: 1.4),
                      ),
                    ),
                    onChanged: (v) => controller.patchTask(task.id, {'notes': v}, (t) => t.copyWith(notes: v)),
                  ),
                ),
              ],
            ),

            // ==========================================
            // TAB 2: NOTES & LATEX / MATH
            // ==========================================
            SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
              child: NotesSection(
                parent: NoteParent(taskId: task.id),
                notes: textNotes,
                userId: userId,
                resetKey: task.id,
                storageUsed: data.storageUsed,
                onAdd: controller.addNote,
                onDelete: controller.deleteNote,
              ),
            ),

            // ==========================================
            // TAB 3: FILES & ATTACHMENTS
            // ==========================================
            SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
              child: AttachmentsSection(
                taskId: task.id,
                attachments: attachments,
                storageUsed: data.storageUsed,
                currentUserId: userId,
                onAdd: controller.addNote,
                onDelete: controller.deleteNote,
              ),
            ),
          ],
        ),
      ),
    ),
    ),
    ),
    );
  }

  Widget _buildSectionCard({
    required Color cardBg,
    required Color cardBorder,
    required bool isDark,
    required String title,
    required Color ink3Color,
    required Widget child,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: isDark ? Colors.black.withValues(alpha: 0.18) : Colors.black.withValues(alpha: 0.02),
            blurRadius: 6,
            offset: const Offset(0, 1.5),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: GoogleFonts.inter(
              color: ink3Color,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.4,
            ),
          ),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }

  Widget _buildClusterChip({
    required String label,
    required Color color,
    required bool isSelected,
    required bool isDark,
    required Color inputBg,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 140),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF8B5CF6).withValues(alpha: 0.18) : inputBg,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? const Color(0xFF8B5CF6) : (isDark ? const Color(0xFF2E3244) : const Color(0xFFE2E4EA)),
            width: isSelected ? 1.4 : 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: GoogleFonts.inter(
                color: isSelected ? const Color(0xFF8B5CF6) : (isDark ? Colors.white : AppColors.lightInk),
                fontSize: 12.5,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmBin(BuildContext context, BoardController controller, Task task) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Move to bin?', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700)),
        content: Text('"${displayTitle(task.title).isNotEmpty ? displayTitle(task.title) : 'Untitled'}" will be moved to Dumping bin.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () {
              Navigator.pop(ctx);
              final now = DateTime.now().toIso8601String();
              controller.patchTask(task.id, {'binned': true, 'cold': false, 'binned_at': now}, (t) => t.copyWith(binned: true, cold: false, binnedAt: now, binnedAtSet: true));
              Navigator.of(context).pop();
            },
            child: const Text('Move to bin', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
