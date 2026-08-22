import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/app_theme.dart';
import '../core/helpers.dart';
import '../models/models.dart';
import '../state/auth_provider.dart';
import '../state/board_provider.dart';
import '../widgets/create_cluster_sheet.dart';
import '../widgets/quick_capture_sheet.dart';
import '../widgets/task_card.dart';

/// Mirrors apps/mobile/src/screens/BoardScreen.tsx: Floating + per-cluster columns of task
/// cards, category filter chips, quick-capture FAB. Drag-and-drop reorder (Drax in the RN
/// app) is simplified here to a "Move to…" action sheet — see report for rationale.
class BoardScreen extends ConsumerStatefulWidget {
  const BoardScreen({super.key});

  @override
  ConsumerState<BoardScreen> createState() => _BoardScreenState();
}

class _BoardScreenState extends ConsumerState<BoardScreen> {
  bool _searchOpen = false;
  final _searchCtrl = TextEditingController();
  int? _activeCategory;
  final Set<int?> _collapsed = {};

  @override
  Widget build(BuildContext context) {
    final board = ref.watch(boardProvider);
    final controller = ref.read(boardProvider.notifier);
    final data = board.data;

    if (board.loading && data == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final query = _searchCtrl.text.trim().toLowerCase();
    bool matches(Task t) => query.isEmpty || displayTitle(t.title).toLowerCase().contains(query) || t.notes.toLowerCase().contains(query);
    final liveTasks = data == null ? <Task>[] : data.tasks.where((t) => isTaskLive(t, data.clusters) && matches(t)).toList();

    final activeClusters = data == null
        ? <Cluster>[]
        : data.clusters.where(isClusterActive).where((c) => _activeCategory == null || c.categoryId == _activeCategory).toList();

    final workspaceName = board.workspaces.where((w) => w.id == data?.workspaceId).cast<Workspace?>().firstWhere((_) => true, orElse: () => null)?.name;

    return Scaffold(
      appBar: AppBar(
        title: _searchOpen
            ? TextField(
                controller: _searchCtrl,
                autofocus: true,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(hintText: 'Search tasks, notes, clusters...', border: InputBorder.none),
                style: const TextStyle(color: AppColors.ink),
              )
            : Row(children: [
                const Icon(Icons.hub_outlined, size: 20, color: AppColors.ink),
                const SizedBox(width: 8),
                Flexible(child: Text(workspaceName ?? 'My Workspace', overflow: TextOverflow.ellipsis)),
                const Icon(Icons.unfold_more, size: 16, color: AppColors.ink3),
              ]),
        leading: _searchOpen
            ? IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => setState(() { _searchOpen = false; _searchCtrl.clear(); }))
            : null,
        actions: _searchOpen
            ? null
            : [
                IconButton(icon: const Icon(Icons.search), onPressed: () => setState(() => _searchOpen = true)),
                IconButton(icon: const Icon(Icons.hub_outlined), tooltip: 'Workspaces', onPressed: () => context.push('/workspace')),
                PopupMenuButton<String>(
                  onSelected: (v) async {
                    switch (v) {
                      case 'new_cluster':
                        showCreateClusterSheet(context, onCreate: (name, color) => controller.createCluster(name: name, color: color, categoryId: _activeCategory));
                        break;
                      case 'sort':
                        controller.toggleSortMode();
                        break;
                      case 'workspaces':
                        context.push('/workspace');
                        break;
                      case 'categories':
                        _manageCategories(context, controller, data);
                        break;
                      case 'sign_out':
                        await ref.read(authProvider.notifier).signOut();
                        break;
                    }
                  },
                  itemBuilder: (ctx) => [
                    const PopupMenuItem(value: 'new_cluster', child: Text('New cluster')),
                    PopupMenuItem(value: 'sort', child: Text('Task sort: ${board.sortMode == SortMode.smart ? 'Smart' : 'Manual'}')),
                    const PopupMenuItem(value: 'categories', child: Text('Manage categories')),
                    const PopupMenuItem(value: 'workspaces', child: Text('Workspaces')),
                    const PopupMenuDivider(),
                    const PopupMenuItem(value: 'sign_out', child: Text('Sign out', style: TextStyle(color: AppColors.danger))),
                  ],
                ),
              ],
      ),
      body: RefreshIndicator(
        onRefresh: controller.refresh,
        child: ListView(
          padding: const EdgeInsets.all(14),
          children: [
            InkWell(
              onTap: () => showQuickCaptureSheet(context),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(color: AppColors.panel, border: Border.all(color: AppColors.lineStrong), borderRadius: BorderRadius.circular(999)),
                child: const Row(children: [
                  Icon(Icons.mic_none, size: 18, color: AppColors.ink3),
                  SizedBox(width: 10),
                  Icon(Icons.attach_file, size: 18, color: AppColors.ink3),
                  SizedBox(width: 10),
                  Expanded(child: Text('Add a task and press Enter...', style: TextStyle(color: AppColors.ink3, fontSize: 15))),
                ]),
              ),
            ),
            const SizedBox(height: 16),
            if (data != null && data.categories.isNotEmpty)
              SizedBox(
                height: 40,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    _filterChip('All', null, liveTasks.length, _activeCategory == null, () => setState(() => _activeCategory = null)),
                    for (final c in data.categories)
                      _filterChip(
                        c.name,
                        c.color,
                        liveTasks.where((t) => data.clusters.where((cl) => cl.categoryId == c.id).any((cl) => cl.id == t.clusterId)).length,
                        _activeCategory == c.id,
                        () => setState(() => _activeCategory = c.id),
                      ),
                  ],
                ),
              ),
            if (board.error != null) Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: Text(board.error!, style: const TextStyle(color: AppColors.danger, fontSize: 13))),
            const SizedBox(height: 8),
            _group(context, controller, id: null, name: 'Floating', color: '#787D8A', cluster: null, tasks: sortTasks(liveTasks.where((t) => t.clusterId == null).toList(), board.sortMode), data: data!),
            for (final c in activeClusters)
              _group(
                context,
                controller,
                id: c.id,
                name: c.name,
                color: c.color,
                cluster: c,
                tasks: sortTasks(liveTasks.where((t) => t.clusterId == c.id).toList(), board.sortMode),
                data: data,
              ),
            const SizedBox(height: 8),
            InkWell(
              onTap: () => showCreateClusterSheet(context, onCreate: (name, color) => controller.createCluster(name: name, color: color, categoryId: _activeCategory)),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 13),
                decoration: BoxDecoration(border: Border.all(color: AppColors.lineStrong, style: BorderStyle.solid), borderRadius: BorderRadius.circular(14)),
                alignment: Alignment.center,
                child: const Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(Icons.add, size: 17, color: AppColors.muted),
                  SizedBox(width: 6),
                  Text('New cluster', style: TextStyle(color: AppColors.muted, fontWeight: FontWeight.w600)),
                ]),
              ),
            ),
            const SizedBox(height: 88),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(onPressed: () => showQuickCaptureSheet(context), child: const Icon(Icons.add)),
    );
  }

  Widget _filterChip(String label, String? color, int count, bool active, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Row(mainAxisSize: MainAxisSize.min, children: [
          if (color != null) ...[
            Container(width: 8, height: 8, decoration: BoxDecoration(color: colorFromHex(color), shape: BoxShape.circle)),
            const SizedBox(width: 6),
          ],
          Text(label),
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
            decoration: BoxDecoration(color: AppColors.panel2, borderRadius: BorderRadius.circular(10)),
            child: Text('$count', style: const TextStyle(fontSize: 10)),
          ),
        ]),
        selected: active,
        onSelected: (_) => onTap(),
      ),
    );
  }

  Widget _group(
    BuildContext context,
    BoardController controller, {
    required int? id,
    required String name,
    required String color,
    required Cluster? cluster,
    required List<Task> tasks,
    required BoardPayload data,
  }) {
    final isCollapsed = _collapsed.contains(id);
    final progress = id != null ? clusterProgress(id, data.tasks) : null;
    final openCount = tasks.where((t) => !t.done).length;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (cluster == null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8, top: 4),
              child: Row(children: [
                const Icon(Icons.layers_outlined, size: 18, color: AppColors.ink),
                const SizedBox(width: 8),
                const Text('Floating', style: TextStyle(color: AppColors.ink, fontSize: 16, fontWeight: FontWeight.w700)),
                const SizedBox(width: 8),
                const Expanded(child: Text('Unsorted tasks', style: TextStyle(color: AppColors.ink3, fontSize: 12), overflow: TextOverflow.ellipsis)),
              ]),
            )
          else
            InkWell(
              onTap: () => setState(() => isCollapsed ? _collapsed.remove(id) : _collapsed.add(id)),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      Container(width: 10, height: 10, decoration: BoxDecoration(color: colorFromHex(cluster.color), shape: BoxShape.circle)),
                      const SizedBox(width: 10),
                      Expanded(child: Text(name, style: const TextStyle(color: AppColors.ink, fontSize: 17, fontWeight: FontWeight.w700), overflow: TextOverflow.ellipsis)),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(color: AppColors.panel2, borderRadius: BorderRadius.circular(999)),
                        child: Text('$openCount', style: const TextStyle(color: AppColors.muted, fontSize: 11, fontWeight: FontWeight.w600)),
                      ),
                      IconButton(icon: const Icon(Icons.more_horiz, size: 18, color: AppColors.ink3), onPressed: () => _clusterMenu(context, controller, cluster)),
                    ]),
                    if (progress != null && progress.total > 0)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(1.5),
                          child: LinearProgressIndicator(value: progress.pct / 100, minHeight: 3, backgroundColor: AppColors.panel2, color: colorFromHex(cluster.color)),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          if (!isCollapsed)
            if (tasks.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Text(_searchCtrl.text.isNotEmpty ? 'No matches here.' : 'Nothing here — tap + to add.', style: const TextStyle(color: AppColors.ink3, fontSize: 12.5, fontStyle: FontStyle.italic)),
              )
            else
              Column(
                children: tasks
                    .map((t) => Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: GestureDetector(
                            onLongPress: () => _taskMenu(context, controller, t, data),
                            child: TaskCard(
                              task: t,
                              noteCount: data.notes.where((n) => n.taskId == t.id && isTextNoteKind(n.kind)).length,
                              attachments: data.notes.where((n) => n.taskId == t.id && isAttachmentKind(n.kind)).toList(),
                              onToggle: () => controller.patchTask(t.id, {'done': !t.done}, (task) => task.copyWith(done: !task.done)),
                              onStar: () => controller.patchTask(t.id, {'starred': !t.starred}, (task) => task.copyWith(starred: !task.starred)),
                              onOpen: () => context.push('/task/${t.id}'),
                              onNotes: () => context.push('/task/${t.id}?tab=notes'),
                            ),
                          ),
                        ))
                    .toList(),
              ),
        ],
      ),
    );
  }

  void _taskMenu(BuildContext context, BoardController controller, Task t, BoardPayload data) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.panel2,
      builder: (ctx) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          ListTile(leading: const Icon(Icons.drive_file_move_outline), title: const Text('Move to…'), onTap: () {
            Navigator.pop(ctx);
            _moveTaskSheet(context, controller, t, data);
          }),
          ListTile(leading: const Icon(Icons.ac_unit), title: const Text('Freeze → Cold store'), onTap: () {
            Navigator.pop(ctx);
            controller.patchTask(t.id, {'cold': true}, (task) => task.copyWith(cold: true));
          }),
          ListTile(
            leading: const Icon(Icons.delete_outline, color: AppColors.danger),
            title: const Text('Move to bin', style: TextStyle(color: AppColors.danger)),
            onTap: () {
              Navigator.pop(ctx);
              final now = DateTime.now().toIso8601String();
              controller.patchTask(t.id, {'binned': true, 'cold': false, 'binned_at': now}, (task) => task.copyWith(binned: true, cold: false, binnedAt: now, binnedAtSet: true));
            },
          ),
        ]),
      ),
    );
  }

  void _moveTaskSheet(BuildContext context, BoardController controller, Task t, BoardPayload data) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.panel2,
      builder: (ctx) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            ListTile(title: const Text('Floating'), onTap: () { Navigator.pop(ctx); controller.moveTask(t.id, null); }),
            for (final c in data.clusters.where(isClusterActive))
              ListTile(
                leading: Container(width: 10, height: 10, decoration: BoxDecoration(color: colorFromHex(c.color), shape: BoxShape.circle)),
                title: Text(c.name),
                onTap: () { Navigator.pop(ctx); controller.moveTask(t.id, c.id); },
              ),
          ],
        ),
      ),
    );
  }

  void _clusterMenu(BuildContext context, BoardController controller, Cluster cluster) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.panel2,
      builder: (ctx) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          ListTile(leading: const Icon(Icons.edit_outlined), title: const Text('Edit name, colour, notes'), onTap: () {
            Navigator.pop(ctx);
            context.push('/cluster/${cluster.id}');
          }),
          ListTile(leading: const Icon(Icons.ac_unit), title: const Text('Pause → Cold store'), onTap: () {
            Navigator.pop(ctx);
            controller.patchCluster(cluster.id, {'status': 'cold'}, (c) => c.copyWith(status: ClusterStatus.cold));
          }),
          ListTile(
            leading: const Icon(Icons.delete_outline, color: AppColors.danger),
            title: const Text('Move to Dumping bin', style: TextStyle(color: AppColors.danger)),
            onTap: () {
              Navigator.pop(ctx);
              final now = DateTime.now().toIso8601String();
              controller.patchCluster(cluster.id, {'status': 'binned', 'binned_at': now}, (c) => c.copyWith(status: ClusterStatus.binned, binnedAt: now, binnedAtSet: true));
            },
          ),
        ]),
      ),
    );
  }

  void _manageCategories(BuildContext context, BoardController controller, BoardPayload? data) {
    final nameCtrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.panel,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setSheetState) {
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 20, right: 20, top: 16),
          child: SafeArea(
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Categories', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.ink)),
              const SizedBox(height: 12),
              for (final c in data?.categories ?? [])
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Container(width: 12, height: 12, decoration: BoxDecoration(color: colorFromHex(c.color), shape: BoxShape.circle)),
                  title: Text(c.name, style: const TextStyle(color: AppColors.ink)),
                  trailing: IconButton(
                    icon: const Icon(Icons.delete_outline, color: AppColors.danger, size: 18),
                    onPressed: () {
                      controller.deleteCategory(c.id);
                      setSheetState(() {});
                    },
                  ),
                ),
              Row(children: [
                Expanded(child: TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'New category'))),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.add_circle, color: AppColors.accent),
                  onPressed: () {
                    final v = nameCtrl.text.trim();
                    if (v.isEmpty) return;
                    controller.createCategory(name: v, color: clusterColors[(data?.categories.length ?? 0) % clusterColors.length]);
                    nameCtrl.clear();
                    setSheetState(() {});
                  },
                ),
              ]),
              const SizedBox(height: 16),
            ]),
          ),
        );
      }),
    );
  }
}
