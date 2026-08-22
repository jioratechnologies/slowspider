// Data models mirroring apps/mobile/src/api.ts (RemoteTask, RemoteCluster, RemoteCategory,
// RemoteNote, RemoteMilestone, RemoteWorkspace, BoardPayload) and apps/web/src/lib/types.ts.
// Kept as plain classes with manual fromJson/toJson (no codegen) to keep the build simple.

enum Priority { high, med, low, none }

Priority priorityFromString(String? v) {
  switch (v) {
    case 'high':
      return Priority.high;
    case 'med':
      return Priority.med;
    case 'low':
      return Priority.low;
    default:
      return Priority.none;
  }
}

String priorityToString(Priority p) => p.name;

enum ClusterStatus { active, cold, binned }

ClusterStatus clusterStatusFromString(String? v) {
  switch (v) {
    case 'cold':
      return ClusterStatus.cold;
    case 'binned':
      return ClusterStatus.binned;
    default:
      return ClusterStatus.active;
  }
}

String clusterStatusToString(ClusterStatus s) => s.name;

enum SortMode { smart, manual }

SortMode sortModeFromString(String? v) => v == 'manual' ? SortMode.manual : SortMode.smart;

/// Mirrors NoteKind in api.ts: text/rich/code/link/image/video/voice/table/file.
enum NoteKind { text, rich, code, link, image, video, voice, table, file }

NoteKind noteKindFromString(String? v) {
  return NoteKind.values.firstWhere(
    (k) => k.name == v,
    orElse: () => NoteKind.text,
  );
}

String noteKindToString(NoteKind k) => k.name;

const List<NoteKind> attachmentKinds = [NoteKind.image, NoteKind.video, NoteKind.voice, NoteKind.file];
const List<NoteKind> textNoteKinds = [NoteKind.text, NoteKind.rich, NoteKind.code, NoteKind.link, NoteKind.table];

bool isAttachmentKind(NoteKind k) => attachmentKinds.contains(k);
bool isTextNoteKind(NoteKind k) => textNoteKinds.contains(k);

enum NoteVisibility { workspace, private_ }

NoteVisibility noteVisibilityFromString(String? v) => v == 'private' ? NoteVisibility.private_ : NoteVisibility.workspace;

String noteVisibilityToString(NoteVisibility v) => v == NoteVisibility.private_ ? 'private' : 'workspace';

class Milestone {
  final int id;
  final int taskId;
  final String title;
  final bool done;
  final int pos;

  Milestone({required this.id, required this.taskId, required this.title, required this.done, required this.pos});

  factory Milestone.fromJson(Map<String, dynamic> j) => Milestone(
        id: j['id'] as int,
        taskId: (j['task_id'] ?? 0) as int,
        title: (j['title'] ?? '') as String,
        done: (j['done'] ?? false) as bool,
        pos: (j['pos'] ?? 0) as int,
      );

  Milestone copyWith({String? title, bool? done, int? pos}) => Milestone(
        id: id,
        taskId: taskId,
        title: title ?? this.title,
        done: done ?? this.done,
        pos: pos ?? this.pos,
      );
}

class Task {
  final int id;
  final int? clusterId;
  final String title;
  final Priority priority;
  final bool starred;
  final String? deadline; // yyyy-mm-dd
  final String? deadlineTime; // HH:MM
  final String notes;
  final bool done;
  final bool cold;
  final bool binned;
  final String? binnedAt;
  final int pos;
  final List<Milestone> milestones;

  Task({
    required this.id,
    required this.clusterId,
    required this.title,
    required this.priority,
    required this.starred,
    required this.deadline,
    required this.deadlineTime,
    required this.notes,
    required this.done,
    required this.cold,
    required this.binned,
    required this.binnedAt,
    required this.pos,
    required this.milestones,
  });

  factory Task.fromJson(Map<String, dynamic> j) => Task(
        id: j['id'] as int,
        clusterId: j['cluster_id'] as int?,
        title: (j['title'] ?? '') as String,
        priority: priorityFromString(j['priority'] as String?),
        starred: (j['starred'] ?? false) as bool,
        deadline: j['deadline'] as String?,
        deadlineTime: j['deadline_time'] as String?,
        notes: (j['notes'] ?? '') as String,
        done: (j['done'] ?? false) as bool,
        cold: (j['cold'] ?? false) as bool,
        binned: (j['binned'] ?? false) as bool,
        binnedAt: j['binned_at'] as String?,
        pos: (j['pos'] ?? 0) as int,
        milestones: ((j['milestones'] as List?) ?? [])
            .map((m) => Milestone.fromJson(m as Map<String, dynamic>))
            .toList(),
      );

  Task copyWith({
    int? clusterId,
    bool clusterIdSet = false,
    String? title,
    Priority? priority,
    bool? starred,
    String? deadline,
    bool deadlineSet = false,
    String? deadlineTime,
    bool deadlineTimeSet = false,
    String? notes,
    bool? done,
    bool? cold,
    bool? binned,
    String? binnedAt,
    bool binnedAtSet = false,
    int? pos,
    List<Milestone>? milestones,
  }) =>
      Task(
        id: id,
        clusterId: clusterIdSet ? clusterId : (clusterId ?? this.clusterId),
        title: title ?? this.title,
        priority: priority ?? this.priority,
        starred: starred ?? this.starred,
        deadline: deadlineSet ? deadline : (deadline ?? this.deadline),
        deadlineTime: deadlineTimeSet ? deadlineTime : (deadlineTime ?? this.deadlineTime),
        notes: notes ?? this.notes,
        done: done ?? this.done,
        cold: cold ?? this.cold,
        binned: binned ?? this.binned,
        binnedAt: binnedAtSet ? binnedAt : (binnedAt ?? this.binnedAt),
        pos: pos ?? this.pos,
        milestones: milestones ?? this.milestones,
      );
}

class Cluster {
  final int id;
  final String name;
  final String color;
  final int? categoryId;
  final ClusterStatus status;
  final String? binnedAt;
  final int pos;

  Cluster({
    required this.id,
    required this.name,
    required this.color,
    required this.categoryId,
    required this.status,
    required this.binnedAt,
    required this.pos,
  });

  factory Cluster.fromJson(Map<String, dynamic> j) => Cluster(
        id: j['id'] as int,
        name: (j['name'] ?? '') as String,
        color: (j['color'] ?? '#888888') as String,
        categoryId: j['category_id'] as int?,
        status: clusterStatusFromString(j['status'] as String?),
        binnedAt: j['binned_at'] as String?,
        pos: (j['pos'] ?? 0) as int,
      );

  Cluster copyWith({
    String? name,
    String? color,
    int? categoryId,
    bool categoryIdSet = false,
    ClusterStatus? status,
    String? binnedAt,
    bool binnedAtSet = false,
    int? pos,
  }) =>
      Cluster(
        id: id,
        name: name ?? this.name,
        color: color ?? this.color,
        categoryId: categoryIdSet ? categoryId : (categoryId ?? this.categoryId),
        status: status ?? this.status,
        binnedAt: binnedAtSet ? binnedAt : (binnedAt ?? this.binnedAt),
        pos: pos ?? this.pos,
      );
}

class Category {
  final int id;
  final String name;
  final String color;
  final int pos;

  Category({required this.id, required this.name, required this.color, required this.pos});

  factory Category.fromJson(Map<String, dynamic> j) => Category(
        id: j['id'] as int,
        name: (j['name'] ?? '') as String,
        color: (j['color'] ?? '#888888') as String,
        pos: (j['pos'] ?? 0) as int,
      );
}

class Note {
  final int id;
  final int? taskId;
  final int? clusterId;
  final String createdBy;
  final NoteKind kind;
  final NoteVisibility visibility;
  final String body;
  final String? url;
  final String? mime;
  final int sizeBytes;
  final int? durationMs;
  final String createdAt;

  Note({
    required this.id,
    required this.taskId,
    required this.clusterId,
    required this.createdBy,
    required this.kind,
    required this.visibility,
    required this.body,
    required this.url,
    required this.mime,
    required this.sizeBytes,
    required this.durationMs,
    required this.createdAt,
  });

  factory Note.fromJson(Map<String, dynamic> j) => Note(
        id: j['id'] as int,
        taskId: j['task_id'] as int?,
        clusterId: j['cluster_id'] as int?,
        createdBy: (j['created_by'] ?? '') as String,
        kind: noteKindFromString(j['kind'] as String?),
        visibility: noteVisibilityFromString(j['visibility'] as String?),
        body: (j['body'] ?? '') as String,
        url: j['url'] as String?,
        mime: j['mime'] as String?,
        sizeBytes: (j['size_bytes'] ?? 0) as int,
        durationMs: j['duration_ms'] as int?,
        createdAt: (j['created_at'] ?? '') as String,
      );
}

class Workspace {
  final int id;
  final String name;
  final String ownerId;
  final String createdAt;
  final String role; // "owner" | "editor"

  Workspace({required this.id, required this.name, required this.ownerId, required this.createdAt, required this.role});

  factory Workspace.fromJson(Map<String, dynamic> j) => Workspace(
        id: j['id'] as int,
        name: (j['name'] ?? '') as String,
        ownerId: (j['owner_id'] ?? '') as String,
        createdAt: (j['created_at'] ?? '') as String,
        role: (j['role'] ?? 'editor') as String,
      );
}

class MemberRow {
  final String userId;
  final String? email;
  final String role;
  final String joinedAt;

  MemberRow({required this.userId, required this.email, required this.role, required this.joinedAt});

  factory MemberRow.fromJson(Map<String, dynamic> j) => MemberRow(
        userId: (j['userId'] ?? '') as String,
        email: j['email'] as String?,
        role: (j['role'] ?? 'editor') as String,
        joinedAt: (j['joinedAt'] ?? '') as String,
      );
}

class InviteRow {
  final int id;
  final int workspaceId;
  final String email;
  final String status;
  final String createdAt;
  final String expiresAt;

  InviteRow({
    required this.id,
    required this.workspaceId,
    required this.email,
    required this.status,
    required this.createdAt,
    required this.expiresAt,
  });

  factory InviteRow.fromJson(Map<String, dynamic> j) => InviteRow(
        id: j['id'] as int,
        workspaceId: (j['workspace_id'] ?? 0) as int,
        email: (j['email'] ?? '') as String,
        status: (j['status'] ?? '') as String,
        createdAt: (j['created_at'] ?? '') as String,
        expiresAt: (j['expires_at'] ?? '') as String,
      );
}

class PendingInviteForUser {
  final int id;
  final int workspaceId;
  final String workspaceName;
  final String? invitedByEmail;
  final String token;
  final String createdAt;

  PendingInviteForUser({
    required this.id,
    required this.workspaceId,
    required this.workspaceName,
    required this.invitedByEmail,
    required this.token,
    required this.createdAt,
  });

  factory PendingInviteForUser.fromJson(Map<String, dynamic> j) => PendingInviteForUser(
        id: j['id'] as int,
        workspaceId: (j['workspaceId'] ?? 0) as int,
        workspaceName: (j['workspaceName'] ?? '') as String,
        invitedByEmail: j['invitedByEmail'] as String?,
        token: (j['token'] ?? '') as String,
        createdAt: (j['createdAt'] ?? '') as String,
      );
}

class BoardPayload {
  final List<Category> categories;
  final List<Cluster> clusters;
  final List<Task> tasks;
  final List<Note> notes;
  final int storageUsed;
  final int workspaceId;
  final SortMode sortMode;

  BoardPayload({
    required this.categories,
    required this.clusters,
    required this.tasks,
    required this.notes,
    required this.storageUsed,
    required this.workspaceId,
    required this.sortMode,
  });

  factory BoardPayload.fromJson(Map<String, dynamic> j) => BoardPayload(
        categories: ((j['categories'] as List?) ?? []).map((c) => Category.fromJson(c as Map<String, dynamic>)).toList(),
        clusters: ((j['clusters'] as List?) ?? []).map((c) => Cluster.fromJson(c as Map<String, dynamic>)).toList(),
        tasks: ((j['tasks'] as List?) ?? []).map((t) => Task.fromJson(t as Map<String, dynamic>)).toList(),
        notes: ((j['notes'] as List?) ?? []).map((n) => Note.fromJson(n as Map<String, dynamic>)).toList(),
        storageUsed: (j['storageUsed'] ?? 0) as int,
        workspaceId: (j['workspaceId'] ?? 0) as int,
        sortMode: sortModeFromString(j['sortMode'] as String?),
      );

  BoardPayload copyWith({
    List<Category>? categories,
    List<Cluster>? clusters,
    List<Task>? tasks,
    List<Note>? notes,
    int? storageUsed,
    int? workspaceId,
    SortMode? sortMode,
  }) =>
      BoardPayload(
        categories: categories ?? this.categories,
        clusters: clusters ?? this.clusters,
        tasks: tasks ?? this.tasks,
        notes: notes ?? this.notes,
        storageUsed: storageUsed ?? this.storageUsed,
        workspaceId: workspaceId ?? this.workspaceId,
        sortMode: sortMode ?? this.sortMode,
      );
}
