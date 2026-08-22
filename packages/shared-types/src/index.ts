// Canonical DTO / API contract types shared by apps/web, apps/backend, and apps/mobile — the
// single source of truth for the shapes each app's REST client and server code work with.
// See docs/MIGRATION-PLAN-bff-kong-split.md ("packages/shared-types" note) for the history:
// extracted from apps/mobile/src/api.ts in Phase 0 but never actually wired up — apps/web,
// apps/backend, and apps/mobile each kept independently drifting copies (apps/web even had a
// *second*, one-off copy of the board response shape inline in src/app/page.tsx) that were
// reconciled here against the real ground truth: apps/backend's board.service.ts and its
// controllers, which mostly do `.select("*")` / `.select().single()` against Postgres and hand
// the *full* DB row back over the wire (workspace_id, created_by, etc included) — not the
// slimmer subset apps/mobile's original RemoteTask/RemoteCluster/etc had assumed. Those
// Remote*/BoardPayload names are kept as aliases below so apps/mobile's existing call sites
// don't need a rename — same underlying shape as the canonical interfaces, not a separate
// structural definition.

export type Priority = "high" | "med" | "low" | "none";
export type ClusterStatus = "active" | "cold" | "binned";
export type SortMode = "smart" | "manual";
export type NoteKind = "text" | "rich" | "code" | "link" | "image" | "video" | "voice" | "table" | "file";
export type AttachmentKind = "image" | "video" | "voice" | "file";
export type TextNoteKind = "text" | "rich" | "code" | "link" | "table";
export type NoteVisibility = "workspace" | "private";

export const ATTACHMENT_KINDS: AttachmentKind[] = ["image", "video", "voice", "file"];
export const TEXT_NOTE_KINDS: TextNoteKind[] = ["text", "rich", "code", "link", "table"];
export function isAttachment(kind: NoteKind): kind is AttachmentKind {
  return (ATTACHMENT_KINDS as string[]).includes(kind);
}
export function isTextNote(kind: NoteKind): kind is TextNoteKind {
  return (TEXT_NOTE_KINDS as string[]).includes(kind);
}

export const STORAGE_QUOTA_BYTES = 10 * 1024 * 1024 * 1024;

export interface Category {
  id: number;
  workspace_id: number;
  created_by: string | null;
  name: string;
  color: string;
  pos: number;
}

export interface Cluster {
  id: number;
  workspace_id: number;
  created_by: string | null;
  name: string;
  color: string;
  category_id: number | null;
  status: ClusterStatus;
  binned_at: string | null;
  last_used_at: string;
  pos: number;
}

export interface Note {
  id: number;
  workspace_id: number;
  task_id: number | null;
  cluster_id: number | null;
  created_by: string;
  kind: NoteKind;
  visibility: NoteVisibility;
  body: string;
  url: string | null;
  mime: string | null;
  size_bytes: number;
  duration_ms: number | null;
  pos: number;
  created_at: string;
  /** CRDT co-editing (Realtime section of docs/MIGRATION-PLAN-bff-kong-split.md) — base64
   * Y.encodeStateAsUpdate(doc) snapshot for text/rich notes, written by
   * apps/backend/src/realtime/yjs-doc.service.ts. `body` stays the plain-text mirror kept in
   * sync on every snapshot, so this field is purely additive — null/undefined until a note
   * has been opened in the collaborative editor at least once. Optional (not just nullable)
   * so existing Note literals across apps/web/apps/mobile that predate this field (including
   * apps/mobile, deliberately untouched by this change) don't need updating to keep
   * typechecking. */
  yjs_state?: string | null;
}

// ---- CRDT co-editing over the existing /v1/realtime WebSocket (additive message envelope,
// see docs/MIGRATION-PLAN-bff-kong-split.md's Realtime section) — shared so apps/web and
// apps/backend agree on the wire shape instead of hand-duplicating it on each side. These
// ride the *same* connection as the existing `{table,type,row}` change events; a client tells
// them apart by the `type` discriminant below vs. the change event's `table` field.
export interface NoteDocSubscribeMsg {
  type: "doc-subscribe";
  noteId: number;
}
export interface NoteDocUnsubscribeMsg {
  type: "doc-unsubscribe";
  noteId: number;
}
export interface NoteDocUpdateMsg {
  type: "doc-update";
  noteId: number;
  /** base64 Y.encodeUpdate(doc) delta. */
  update: string;
}
export interface NoteDocSyncMsg {
  type: "doc-sync";
  noteId: number;
  /** base64 Y.encodeStateAsUpdate(doc) — full state, sent once right after doc-subscribe so
   * the client can bootstrap/catch up instead of needing full history replay. */
  state: string;
}
export interface NoteDocErrorMsg {
  type: "doc-error";
  noteId: number;
  error: string;
}
export interface NoteAwarenessUpdateMsg {
  type: "awareness-update";
  noteId: number;
  /** base64 awarenessProtocol.encodeAwarenessUpdate(...) payload. */
  update: string;
}
/** Client -> server messages on the /v1/realtime socket, for the note currently open in the
 * collaborative editor. */
export type NoteDocClientMsg = NoteDocSubscribeMsg | NoteDocUnsubscribeMsg | NoteDocUpdateMsg | NoteAwarenessUpdateMsg;
/** Server -> client messages on the same socket. */
export type NoteDocServerMsg = NoteDocSyncMsg | NoteDocUpdateMsg | NoteDocErrorMsg | NoteAwarenessUpdateMsg;

export interface Milestone {
  id: number;
  workspace_id: number;
  task_id: number;
  title: string;
  done: boolean;
  pos: number;
}

export interface Task {
  id: number;
  workspace_id: number;
  created_by: string | null;
  cluster_id: number | null;
  title: string;
  priority: Priority;
  starred: boolean;
  deadline: string | null; // yyyy-mm-dd
  deadline_time: string | null; // "HH:MM" — required for calendar sync
  notes: string;
  done: boolean;
  cold: boolean;
  binned: boolean;
  binned_at: string | null;
  pos: number;
  milestones: Milestone[];
}

export interface BoardData {
  categories: Category[];
  clusters: Cluster[];
  tasks: Task[];
  notes: Note[];
  storageUsed: number;
}

/** The actual GET /v1/board response shape — BoardData plus the two fields
 * apps/backend's board.controller.ts spreads on: `{ ...board, sortMode, workspaceId }`. */
export interface BoardPayload extends BoardData {
  sortMode: SortMode;
  workspaceId: number;
}

export interface Workspace {
  id: number;
  name: string;
  owner_id: string;
  created_at: string;
}
export interface WorkspaceRef extends Workspace {
  role: "owner" | "editor";
}
export interface MemberRow {
  userId: string;
  email: string | null;
  role: "owner" | "editor";
  joinedAt: string;
}
export interface InviteRow {
  id: number;
  workspace_id: number;
  email: string;
  status: string;
  created_at: string;
  expires_at: string;
}
export interface PendingInviteForUser {
  id: number;
  workspaceId: number;
  workspaceName: string;
  invitedByEmail: string | null;
  token: string;
  createdAt: string;
}

// ---- apps/mobile alias names ----
// apps/mobile/src/api.ts originally defined its own (slimmer, now-stale) versions of these
// under these names; ~13 files there import them this way. Kept as aliases onto the same
// canonical interfaces above rather than a rename across apps/mobile's whole src tree.
export type RemoteTask = Task;
export type RemoteCluster = Cluster;
export type RemoteCategory = Category;
export type RemoteNote = Note;
export type RemoteMilestone = Milestone;
export type RemoteWorkspace = WorkspaceRef;

// Generic API envelope every /v1 response uses — { ok: true, data } or { ok: false, error }.
// See apps/web's (deleted) src/lib/api/handler.ts / apps/backend's ResponseInterceptor +
// AllExceptionsFilter.
export type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: string };
