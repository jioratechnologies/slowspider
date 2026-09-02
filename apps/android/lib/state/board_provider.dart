import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api_client.dart';
import '../core/realtime_client.dart';
import '../core/session_storage.dart';
import '../models/models.dart';
import 'auth_provider.dart';

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
  }) => BoardState(
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
/// refresh is fine" scope (no offline outbox). Realtime whole-record sync (see
/// core/realtime_client.dart, the Android mirror of apps/web/src/hooks/useRealtimeBoard.ts) is
/// now wired in below: a collaborator's task/cluster/category/milestone/note change lands
/// here and gets merged the same way an equivalent local mutation would, so the UI reflects it
/// without a manual pull-to-refresh. Offline-first SQLite is still a separate, not-yet-started
/// phase (see HANDOVER.md).
class BoardController extends StateNotifier<BoardState> {
  BoardController(this._ref) : super(const BoardState()) {
    final auth = _ref.read(authProvider);
    if (auth.status == AuthStatus.signedIn) {
      reload();
      loadWorkspaces();
    }
    // Connect/reconnect realtime as auth state changes: drop the socket immediately on
    // sign-out, and refetch the board (which reconnects with the new session's token/
    // workspace, see reload() below) on a fresh sign-in.
    _ref.listen<AuthState>(authProvider, (previous, next) {
      if (next.status == AuthStatus.signedOut) {
        _disconnectRealtime();
        state = const BoardState(); // Clear all data and stale errors immediately on sign out
      } else if (next.status == AuthStatus.signedIn) {
        state = const BoardState(loading: true);
        reload();
        loadWorkspaces();
      }
    });
  }

  final Ref _ref;
  final _api = ApiClient.instance;
  RealtimeClient? _realtime;

  void _fail(Object e) => state = state.copyWith(error: e.toString());

  Future<void> reload() async {
    final auth = _ref.read(authProvider);
    if (auth.status != AuthStatus.signedIn) {
      state = state.copyWith(loading: false, refreshing: false);
      return;
    }

    state = state.copyWith(
      loading: state.data == null,
      refreshing: state.data != null,
      clearError: true,
    );
    try {
      final board = await _api.board();
      state = state.copyWith(
        data: board,
        clearError: true,
        loading: false,
        refreshing: false,
      );
      // The server resolves the account's default workspace on first load; pin it locally
      // so switchWorkspace() means something afterward.
      await SessionStorage.instance.setActiveWorkspace(board.workspaceId);
      _connectRealtime(board.workspaceId);
      loadWorkspaces();
    } catch (e) {
      state = state.copyWith(
        error: e.toString(),
        loading: false,
        refreshing: false,
      );
      final err = e.toString().toLowerCase();
      if (err.contains('token') ||
          err.contains('expired') ||
          err.contains('not signed in') ||
          err.contains('401')) {
        _ref.read(authProvider.notifier).signOut();
      }
    }
  }

  // ---- Realtime (whole-record broadcast sync — see core/realtime_client.dart) ----

  void _connectRealtime(int workspaceId) {
    if (_realtime != null && _realtime!.workspaceId == workspaceId) {
      return; // already on it
    }
    _realtime?.dispose();
    _realtime = RealtimeClient(
      workspaceId: workspaceId,
      onEvent: _applyRealtimeChange,
    )..connect();
  }

  void _disconnectRealtime() {
    _realtime?.dispose();
    _realtime = null;
  }

  @override
  void dispose() {
    _disconnectRealtime();
    super.dispose();
  }

  /// Applies one `{table,type,row}` event to local state — the same merge-by-id logic
  /// apps/web/src/components/board/Board.tsx's `on*Change` handlers use (see that file's
  /// `useRealtimeBoard` call site): DELETE removes the matching row, INSERT/UPDATE replaces
  /// it if present or appends it. Silently ignored if the board hasn't loaded yet (a stray
  /// event arriving before the first `reload()` resolves shouldn't happen in practice, since
  /// the socket only connects after a board fetch succeeds, but is a harmless no-op either
  /// way).
  void _applyRealtimeChange(
    String table,
    String type,
    Map<String, dynamic> row,
  ) {
    final data = state.data;
    if (data == null) return;
    switch (table) {
      case 'tasks':
        _applyRealtimeTaskChange(data, type, row);
        break;
      case 'clusters':
        _applyRealtimeClusterChange(data, type, row);
        break;
      case 'categories':
        _applyRealtimeCategoryChange(data, type, row);
        break;
      case 'milestones':
        _applyRealtimeMilestoneChange(data, type, row);
        break;
      case 'notes':
        _applyRealtimeNoteChange(data, type, row);
        break;
    }
  }

  void _applyRealtimeTaskChange(
    BoardPayload data,
    String type,
    Map<String, dynamic> row,
  ) {
    final incoming = Task.fromJson(row);
    if (type == 'DELETE') {
      state = state.copyWith(
        data: data.copyWith(
          tasks: data.tasks.where((t) => t.id != incoming.id).toList(),
        ),
      );
      return;
    }
    final idx = data.tasks.indexWhere((t) => t.id == incoming.id);
    // The realtime payload for a task row doesn't carry its milestones (that's a separate
    // table/event) — preserve whatever this client already has locally, same as Board.tsx's
    // `{ ...row, milestones: existing?.milestones || [] }`.
    final merged = idx >= 0
        ? incoming.copyWith(milestones: data.tasks[idx].milestones)
        : incoming;
    final tasks = idx >= 0
        ? [for (final t in data.tasks) t.id == incoming.id ? merged : t]
        : [...data.tasks, merged];
    state = state.copyWith(data: data.copyWith(tasks: tasks));
  }

  void _applyRealtimeClusterChange(
    BoardPayload data,
    String type,
    Map<String, dynamic> row,
  ) {
    final incoming = Cluster.fromJson(row);
    if (type == 'DELETE') {
      state = state.copyWith(
        data: data.copyWith(
          clusters: data.clusters.where((c) => c.id != incoming.id).toList(),
        ),
      );
      return;
    }
    final exists = data.clusters.any((c) => c.id == incoming.id);
    final clusters = exists
        ? [for (final c in data.clusters) c.id == incoming.id ? incoming : c]
        : [...data.clusters, incoming];
    state = state.copyWith(data: data.copyWith(clusters: clusters));
  }

  void _applyRealtimeCategoryChange(
    BoardPayload data,
    String type,
    Map<String, dynamic> row,
  ) {
    final incoming = Category.fromJson(row);
    if (type == 'DELETE') {
      state = state.copyWith(
        data: data.copyWith(
          categories: data.categories
              .where((c) => c.id != incoming.id)
              .toList(),
        ),
      );
      return;
    }
    final exists = data.categories.any((c) => c.id == incoming.id);
    final categories = exists
        ? [for (final c in data.categories) c.id == incoming.id ? incoming : c]
        : [...data.categories, incoming];
    state = state.copyWith(data: data.copyWith(categories: categories));
  }

  void _applyRealtimeNoteChange(
    BoardPayload data,
    String type,
    Map<String, dynamic> row,
  ) {
    final incoming = Note.fromJson(row);
    if (type == 'DELETE') {
      state = state.copyWith(
        data: data.copyWith(
          notes: data.notes.where((n) => n.id != incoming.id).toList(),
        ),
      );
      return;
    }
    final exists = data.notes.any((n) => n.id == incoming.id);
    final notes = exists
        ? [for (final n in data.notes) n.id == incoming.id ? incoming : n]
        : [...data.notes, incoming];
    state = state.copyWith(data: data.copyWith(notes: notes));
  }

  void _applyRealtimeMilestoneChange(
    BoardPayload data,
    String type,
    Map<String, dynamic> row,
  ) {
    final incoming = Milestone.fromJson(row);
    final tasks = data.tasks.map((t) {
      if (t.id != incoming.taskId) return t;
      if (type == 'DELETE') {
        return t.copyWith(
          milestones: t.milestones.where((m) => m.id != incoming.id).toList(),
        );
      }
      final exists = t.milestones.any((m) => m.id == incoming.id);
      final milestones = exists
          ? [for (final m in t.milestones) m.id == incoming.id ? incoming : m]
          : [...t.milestones, incoming];
      return t.copyWith(milestones: milestones);
    }).toList();
    state = state.copyWith(data: data.copyWith(tasks: tasks));
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
    final pos =
        siblings.fold<double>(0.0, (m, t) => t.pos > m ? t.pos : m) + 1.0;
    try {
      final row = await _api.createTask(
        title: title.trim(),
        clusterId: clusterId,
        pos: pos,
      );
      state = state.copyWith(data: data.copyWith(tasks: [...data.tasks, row]));
      return row;
    } catch (e) {
      _fail(e);
      return null;
    }
  }

  void patchTask(
    int id,
    Map<String, dynamic> patch,
    Task Function(Task) apply,
  ) {
    final data = state.data;
    if (data == null) return;
    state = state.copyWith(
      data: data.copyWith(
        tasks: data.tasks.map((t) => t.id == id ? apply(t) : t).toList(),
      ),
    );
    _api.updateTask(id, patch).catchError((e) => _fail(e));
  }

  /// Drops a task into a cluster (or Floating), appending it at the end of that column.
  void moveTask(int taskId, int? clusterId) {
    final data = state.data;
    final siblings = (data?.tasks ?? []).where(
      (t) => t.clusterId == clusterId && t.id != taskId,
    );
    final pos =
        siblings.fold<double>(0.0, (m, t) => t.pos > m ? t.pos : m) + 1.0;
    patchTask(
      taskId,
      {
        'cluster_id': clusterId,
        'pos': pos,
        'cold': false,
        'binned': false,
        'binned_at': null,
      },
      (t) => t.copyWith(
        clusterId: clusterId,
        clusterIdSet: true,
        pos: pos,
        cold: false,
        binned: false,
        binnedAt: null,
        binnedAtSet: true,
      ),
    );
  }

  void deleteTaskForever(int id) {
    final data = state.data;
    if (data == null) return;
    state = state.copyWith(
      data: data.copyWith(tasks: data.tasks.where((t) => t.id != id).toList()),
    );
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
      final gone = data.notes
          .where((n) => n.id == removedId)
          .cast<Note?>()
          .firstWhere((_) => true, orElse: () => null);
      state = state.copyWith(
        data: data.copyWith(
          notes: data.notes.where((n) => n.id != removedId).toList(),
          storageUsed: (data.storageUsed - (gone?.sizeBytes ?? 0)).clamp(
            0,
            1 << 62,
          ),
        ),
      );
      return;
    }
    if (note == null) return;
    state = state.copyWith(
      data: data.copyWith(
        notes: [...data.notes, note],
        storageUsed: data.storageUsed + note.sizeBytes,
      ),
    );
  }

  // ---- Sort mode ----

  void toggleSortMode() {
    final data = state.data;
    if (data == null) return;
    final next = data.sortMode == SortMode.smart
        ? SortMode.manual
        : SortMode.smart;
    state = state.copyWith(data: data.copyWith(sortMode: next));
    _api.saveSortMode(next).catchError((e) => _fail(e));
  }

  // ---- Clusters ----

  Future<void> createCluster({
    required String name,
    required String color,
    required int? categoryId,
  }) async {
    final data = state.data;
    if (data == null) return;
    try {
      final row = await _api.createCluster(
        name: name,
        color: color,
        categoryId: categoryId,
        pos: data.clusters.length.toDouble(),
      );
      state = state.copyWith(
        data: data.copyWith(clusters: [...data.clusters, row]),
      );
    } catch (e) {
      _fail(e);
    }
  }

  void patchCluster(
    int id,
    Map<String, dynamic> patch,
    Cluster Function(Cluster) apply,
  ) {
    final data = state.data;
    if (data == null) return;
    state = state.copyWith(
      data: data.copyWith(
        clusters: data.clusters.map((c) => c.id == id ? apply(c) : c).toList(),
      ),
    );
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
    final updates = <Map<String, dynamic>>[];
    final byId = {for (final c in data.clusters) c.id: c};
    final reindexed = <Cluster>[];
    for (var i = 0; i < newOrder.length; i++) {
      final c = newOrder[i];
      final pos = i.toDouble();
      updates.add({'id': c.id, 'pos': pos});
      reindexed.add(c.copyWith(pos: pos));
    }
    final untouched = data.clusters.where(
      (c) => !byId.containsKey(c.id) || !newOrder.any((n) => n.id == c.id),
    );
    state = state.copyWith(
      data: data.copyWith(clusters: [...reindexed, ...untouched]),
    );
    try {
      await _api.reorderClusters(updates);
    } catch (e) {
      _fail(e);
    }
  }

  // ---- Categories ----

  Future<void> createCategory({
    required String name,
    required String color,
  }) async {
    final data = state.data;
    if (data == null) return;
    try {
      final row = await _api.createCategory(
        name: name,
        color: color,
        pos: data.categories.length.toDouble(),
      );
      state = state.copyWith(
        data: data.copyWith(categories: [...data.categories, row]),
      );
    } catch (e) {
      _fail(e);
    }
  }

  void deleteCategory(int id) {
    final data = state.data;
    if (data == null) return;
    state = state.copyWith(
      data: data.copyWith(
        categories: data.categories.where((c) => c.id != id).toList(),
      ),
    );
    _api.deleteCategory(id).catchError((e) => _fail(e));
  }

  // ---- Milestones ----

  Future<void> addMilestone(int taskId, String title) async {
    final data = state.data;
    final v = title.trim();
    if (v.isEmpty || data == null) return;
    final t = data.tasks
        .where((x) => x.id == taskId)
        .cast<Task?>()
        .firstWhere((_) => true, orElse: () => null);
    final pos =
        (t?.milestones ?? []).fold<double>(
          0.0,
          (m, ms) => ms.pos > m ? ms.pos : m,
        ) +
        1.0;
    try {
      final row = await _api.addMilestone(taskId, v, pos);
      state = state.copyWith(
        data: data.copyWith(
          tasks: data.tasks
              .map(
                (x) => x.id == taskId
                    ? x.copyWith(milestones: [...x.milestones, row])
                    : x,
              )
              .toList(),
        ),
      );
    } catch (e) {
      _fail(e);
    }
  }

  void _patchMilestone(
    int taskId,
    int msId,
    Map<String, dynamic> patch,
    Milestone Function(Milestone) apply,
  ) {
    final data = state.data;
    if (data == null) return;
    state = state.copyWith(
      data: data.copyWith(
        tasks: data.tasks.map((x) {
          if (x.id != taskId) return x;
          return x.copyWith(
            milestones: x.milestones
                .map((m) => m.id == msId ? apply(m) : m)
                .toList(),
          );
        }).toList(),
      ),
    );
    _api.updateMilestone(taskId, msId, patch).catchError((e) => _fail(e));
  }

  void toggleMilestone(int taskId, int msId) {
    final data = state.data;
    final t = data?.tasks
        .where((x) => x.id == taskId)
        .cast<Task?>()
        .firstWhere((_) => true, orElse: () => null);
    final m = t?.milestones
        .where((mm) => mm.id == msId)
        .cast<Milestone?>()
        .firstWhere((_) => true, orElse: () => null);
    if (m == null) return;
    _patchMilestone(taskId, msId, {
      'done': !m.done,
    }, (mm) => mm.copyWith(done: !mm.done));
  }

  void renameMilestone(int taskId, int msId, String title) {
    _patchMilestone(taskId, msId, {
      'title': title,
    }, (m) => m.copyWith(title: title));
  }

  void deleteMilestone(int taskId, int msId) {
    final data = state.data;
    if (data == null) return;
    state = state.copyWith(
      data: data.copyWith(
        tasks: data.tasks
            .map(
              (x) => x.id != taskId
                  ? x
                  : x.copyWith(
                      milestones: x.milestones
                          .where((m) => m.id != msId)
                          .toList(),
                    ),
            )
            .toList(),
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
    state = state.copyWith(
      workspaces: state.workspaces
          .map(
            (w) => w.id == id
                ? Workspace(
                    id: w.id,
                    name: name,
                    ownerId: w.ownerId,
                    createdAt: w.createdAt,
                    role: w.role,
                  )
                : w,
          )
          .toList(),
    );
    try {
      await _api.renameWorkspace(id, name);
    } catch (e) {
      _fail(e);
    }
  }
}

final boardProvider = StateNotifierProvider<BoardController, BoardState>(
  (ref) => BoardController(ref),
);
