import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api_client.dart';
import '../core/session_storage.dart';
import '../models/models.dart';

class BoardState {
  final BoardPayload? data;
  final bool loading;
  final bool refreshing;
  final String? error;
  final List<Workspace> workspaces;
  final bool workspacesLoading;

  const BoardState({
    this.data,
    this.loading = true,
    this.refreshing = false,
    this.error,
    this.workspaces = const [],
    this.workspacesLoading = false,
  });

  SortMode get sortMode => data?.sortMode ?? SortMode.smart;

  BoardState copyWith({
    BoardPayload? data,
    bool? loading,
    bool? refreshing,
    String? error,
    bool clearError = false,
    List<Workspace>? workspaces,
    bool? workspacesLoading,
  }) =>
      BoardState(
        data: data ?? this.data,
        loading: loading ?? this.loading,
        refreshing: refreshing ?? this.refreshing,
        error: clearError ? null : (error ?? this.error),
        workspaces: workspaces ?? this.workspaces,
        workspacesLoading: workspacesLoading ?? this.workspacesLoading,
      );
}

/// Board state + mutations. Mirrors apps/mobile/src/store/BoardContext.tsx: optimistic local
/// updates applied immediately, the real request fired in the background (errors surface via
/// `state.error` rather than blocking the UI) — matches this pass's "fetch-on-load / pull to
/// refresh is fine" scope (no offline outbox, no realtime).
class BoardController extends StateNotifier<BoardState> {
  BoardController() : super(const BoardState()) {
    reload();
    loadWorkspaces();
  }

  final _api = ApiClient.instance;

  void _fail(Object e) => state = state.copyWith(error: e.toString());

  Future<void> reload() async {
    try {
      final board = await _api.board();
      state = state.copyWith(data: board, clearError: true);
      // The server resolves the account's default workspace on first load; pin it locally
      // so switchWorkspace() means something afterward.
      await SessionStorage.instance.setActiveWorkspace(board.workspaceId);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    } finally {
      state = state.copyWith(loading: false, refreshing: false);
    }
  }

  Future<void> refresh() async {
    state = state.copyWith(refreshing: true);
    await reload();
  }

  // ---- Tasks ----

  Future<Task?> addTask(String title, int? clusterId) async {
    final data = state.data;
    if (title.trim().isEmpty || data == null) return null;
    final siblings = data.tasks.where((t) => t.clusterId == clusterId);
    final pos = siblings.fold<int>(0, (m, t) => t.pos > m ? t.pos : m) + 1;
    try {
      final row = await _api.createTask(title: title.trim(), clusterId: clusterId, pos: pos);
      state = state.copyWith(data: data.copyWith(tasks: [...data.tasks, row]));
      return row;
    } catch (e) {
      _fail(e);
      return null;
    }
  }

  void patchTask(int id, Map<String, dynamic> patch, Task Function(Task) apply) {
    final data = state.data;
    if (data == null) return;
    state = state.copyWith(
      data: data.copyWith(tasks: data.tasks.map((t) => t.id == id ? apply(t) : t).toList()),
    );
    _api.updateTask(id, patch).catchError((e) => _fail(e));
  }

  /// Drops a task into a cluster (or Floating), appending it at the end of that column.
  void moveTask(int taskId, int? clusterId) {
    final data = state.data;
    final siblings = (data?.tasks ?? []).where((t) => t.clusterId == clusterId && t.id != taskId);
    final pos = siblings.fold<int>(0, (m, t) => t.pos > m ? t.pos : m) + 1;
    patchTask(
      taskId,
      {'cluster_id': clusterId, 'pos': pos, 'cold': false, 'binned': false, 'binned_at': null},
      (t) => t.copyWith(clusterId: clusterId, clusterIdSet: true, pos: pos, cold: false, binned: false, binnedAt: null, binnedAtSet: true),
    );
  }

  void deleteTaskForever(int id) {
    final data = state.data;
    if (data == null) return;
    state = state.copyWith(data: data.copyWith(tasks: data.tasks.where((t) => t.id != id).toList()));
    _api.deleteTaskForever(id).catchError((e) => _fail(e));
  }

  // ---- Notes ----

  Future<Note> addNote(Map<String, dynamic> input) async {
    final row = await _api.createNote(input);
    applyNoteChange(row, null);
    return row;
  }

  void deleteNote(int id) {
    applyNoteChange(null, id);
    _api.deleteNote(id).catchError((e) => _fail(e));
  }

  void applyNoteChange(Note? note, int? removedId) {
    final data = state.data;
    if (data == null) return;
    if (removedId != null) {
      final gone = data.notes.where((n) => n.id == removedId).cast<Note?>().firstWhere((_) => true, orElse: () => null);
      state = state.copyWith(
        data: data.copyWith(
          notes: data.notes.where((n) => n.id != removedId).toList(),
          storageUsed: (data.storageUsed - (gone?.sizeBytes ?? 0)).clamp(0, 1 << 62),
        ),
      );
      return;
    }
    if (note == null) return;
    state = state.copyWith(data: data.copyWith(notes: [...data.notes, note], storageUsed: data.storageUsed + note.sizeBytes));
  }

  // ---- Sort mode ----

  void toggleSortMode() {
    final data = state.data;
    if (data == null) return;
    final next = data.sortMode == SortMode.smart ? SortMode.manual : SortMode.smart;
    state = state.copyWith(data: data.copyWith(sortMode: next));
    _api.saveSortMode(next).catchError((e) => _fail(e));
  }

  // ---- Clusters ----

  Future<void> createCluster({required String name, required String color, required int? categoryId}) async {
    final data = state.data;
    if (data == null) return;
    try {
      final row = await _api.createCluster(name: name, color: color, categoryId: categoryId, pos: data.clusters.length);
      state = state.copyWith(data: data.copyWith(clusters: [...data.clusters, row]));
    } catch (e) {
      _fail(e);
    }
  }

  void patchCluster(int id, Map<String, dynamic> patch, Cluster Function(Cluster) apply) {
    final data = state.data;
    if (data == null) return;
    state = state.copyWith(data: data.copyWith(clusters: data.clusters.map((c) => c.id == id ? apply(c) : c).toList()));
    _api.updateCluster(id, patch).catchError((e) => _fail(e));
  }

  void deleteClusterForever(int id) {
    final data = state.data;
    if (data == null) return;
    state = state.copyWith(
      data: data.copyWith(
        clusters: data.clusters.where((c) => c.id != id).toList(),
        tasks: data.tasks.where((t) => t.clusterId != id).toList(),
      ),
    );
    _api.deleteClusterForever(id).catchError((e) => _fail(e));
  }

  Future<void> reorderClusters(List<Cluster> newOrder) async {
    final data = state.data;
    if (data == null) return;
    final updates = <Map<String, int>>[];
    final byId = {for (final c in data.clusters) c.id: c};
    final reindexed = <Cluster>[];
    for (var i = 0; i < newOrder.length; i++) {
      final c = newOrder[i];
      updates.add({'id': c.id, 'pos': i});
      reindexed.add(c.copyWith(pos: i));
    }
    final untouched = data.clusters.where((c) => !byId.containsKey(c.id) || !newOrder.any((n) => n.id == c.id));
    state = state.copyWith(data: data.copyWith(clusters: [...reindexed, ...untouched]));
    try {
      await _api.reorderClusters(updates);
    } catch (e) {
      _fail(e);
    }
  }

  // ---- Categories ----

  Future<void> createCategory({required String name, required String color}) async {
    final data = state.data;
    if (data == null) return;
    try {
      final row = await _api.createCategory(name: name, color: color, pos: data.categories.length);
      state = state.copyWith(data: data.copyWith(categories: [...data.categories, row]));
    } catch (e) {
      _fail(e);
    }
  }

  void deleteCategory(int id) {
    final data = state.data;
    if (data == null) return;
    state = state.copyWith(data: data.copyWith(categories: data.categories.where((c) => c.id != id).toList()));
    _api.deleteCategory(id).catchError((e) => _fail(e));
  }

  // ---- Milestones ----

  Future<void> addMilestone(int taskId, String title) async {
    final data = state.data;
    final v = title.trim();
    if (v.isEmpty || data == null) return;
    final t = data.tasks.where((x) => x.id == taskId).cast<Task?>().firstWhere((_) => true, orElse: () => null);
    final pos = (t?.milestones ?? []).fold<int>(0, (m, ms) => ms.pos > m ? ms.pos : m) + 1;
    try {
      final row = await _api.addMilestone(taskId, v, pos);
      state = state.copyWith(
        data: data.copyWith(
          tasks: data.tasks.map((x) => x.id == taskId ? x.copyWith(milestones: [...x.milestones, row]) : x).toList(),
        ),
      );
    } catch (e) {
      _fail(e);
    }
  }

  void _patchMilestone(int taskId, int msId, Map<String, dynamic> patch, Milestone Function(Milestone) apply) {
    final data = state.data;
    if (data == null) return;
    state = state.copyWith(
      data: data.copyWith(
        tasks: data.tasks.map((x) {
          if (x.id != taskId) return x;
          return x.copyWith(milestones: x.milestones.map((m) => m.id == msId ? apply(m) : m).toList());
        }).toList(),
      ),
    );
    _api.updateMilestone(taskId, msId, patch).catchError((e) => _fail(e));
  }

  void toggleMilestone(int taskId, int msId) {
    final data = state.data;
    final t = data?.tasks.where((x) => x.id == taskId).cast<Task?>().firstWhere((_) => true, orElse: () => null);
    final m = t?.milestones.where((mm) => mm.id == msId).cast<Milestone?>().firstWhere((_) => true, orElse: () => null);
    if (m == null) return;
    _patchMilestone(taskId, msId, {'done': !m.done}, (mm) => mm.copyWith(done: !mm.done));
  }

  void renameMilestone(int taskId, int msId, String title) {
    _patchMilestone(taskId, msId, {'title': title}, (m) => m.copyWith(title: title));
  }

  void deleteMilestone(int taskId, int msId) {
    final data = state.data;
    if (data == null) return;
    state = state.copyWith(
      data: data.copyWith(
        tasks: data.tasks.map((x) => x.id != taskId ? x : x.copyWith(milestones: x.milestones.where((m) => m.id != msId).toList())).toList(),
      ),
    );
    _api.deleteMilestone(taskId, msId).catchError((e) => _fail(e));
  }

  // ---- Workspaces ----

  Future<void> loadWorkspaces() async {
    state = state.copyWith(workspacesLoading: true);
    try {
      final ws = await _api.workspaces();
      state = state.copyWith(workspaces: ws);
    } catch (e) {
      _fail(e);
    } finally {
      state = state.copyWith(workspacesLoading: false);
    }
  }

  Future<void> switchWorkspace(int id) async {
    await SessionStorage.instance.setActiveWorkspace(id);
    state = state.copyWith(loading: true);
    await reload();
  }

  Future<void> createWorkspace(String name) async {
    try {
      final ws = await _api.createWorkspace(name);
      state = state.copyWith(workspaces: [...state.workspaces, ws]);
      await switchWorkspace(ws.id);
    } catch (e) {
      _fail(e);
    }
  }

  Future<void> renameWorkspace(int id, String name) async {
    state = state.copyWith(workspaces: state.workspaces.map((w) => w.id == id ? Workspace(id: w.id, name: name, ownerId: w.ownerId, createdAt: w.createdAt, role: w.role) : w).toList());
    try {
      await _api.renameWorkspace(id, name);
    } catch (e) {
      _fail(e);
    }
  }
}

final boardProvider = StateNotifierProvider<BoardController, BoardState>((ref) => BoardController());
