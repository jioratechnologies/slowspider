// DTOs for the /v1 REST surface (apps/backend, formerly apps/web's /api/v1/**), lifted from
// apps/mobile/src/api.ts — the cleanest existing versions of these shapes (per
// docs/MIGRATION-PLAN-bff-kong-split.md, Phase 0). Not wired into apps/web or apps/backend
// yet; that's follow-up work once the split is otherwise stable, not part of this pass.
//
// apps/web's src/lib/types.ts has its own near-identical copies (full DB row shapes, e.g.
// Task includes workspace_id/created_by that the wire format below omits) — those stay as
// apps/web's internal representation for now. This package is the contract clients see over
// the wire, not the DB row shape.

export type Priority = "high" | "med" | "low" | "none";
export type ClusterStatus = "active" | "cold" | "binned";
export type SortMode = "smart" | "manual";
export type NoteKind = "text" | "rich" | "code" | "link" | "image" | "video" | "voice" | "table" | "file";
export type AttachmentKind = "image" | "video" | "voice" | "file";
export type TextNoteKind = "text" | "rich" | "code" | "link" | "table";

const ATTACHMENT_KINDS: string[] = ["image", "video", "voice", "file"];
export function isAttachment(kind: string): kind is AttachmentKind {
  return ATTACHMENT_KINDS.includes(kind);
}
export function isTextNote(kind: string): kind is TextNoteKind {
  return !ATTACHMENT_KINDS.includes(kind);
}

export interface RemoteMilestone {
  id: number;
  task_id: number;
  title: string;
  done: boolean;
  pos: number;
}

export interface RemoteTask {
  id: number;
  cluster_id: number | null;
  title: string;
  priority: Priority;
  starred: boolean;
  deadline: string | null;
  deadline_time: string | null;
  notes: string;
  done: boolean;
  cold: boolean;
  binned: boolean;
  binned_at: string | null;
  pos: number;
  milestones?: RemoteMilestone[];
}

export interface RemoteWorkspace {
  id: number;
  name: string;
  owner_id: string;
  created_at: string;
  role: "owner" | "editor";
}

export interface RemoteCluster {
  id: number;
  name: string;
  color: string;
  category_id: number | null;
  status: "active" | "cold" | "binned";
  binned_at: string | null;
  pos: number;
}

export interface RemoteCategory {
  id: number;
  name: string;
  color: string;
  pos: number;
}

export interface RemoteNote {
  id: number;
  task_id: number | null;
  cluster_id: number | null;
  created_by: string;
  kind: NoteKind;
  visibility: "workspace" | "private";
  body: string;
  url: string | null;
  mime: string | null;
  size_bytes: number;
  duration_ms: number | null;
  created_at: string;
}

export interface BoardPayload {
  categories: RemoteCategory[];
  clusters: RemoteCluster[];
  tasks: RemoteTask[];
  notes: RemoteNote[];
  storageUsed: number;
  workspaceId: number;
  sortMode: SortMode;
}

// Generic API envelope every /v1 response uses — { ok: true, data } or { ok: false, error }.
// See apps/web's src/lib/api/handler.ts / apps/backend's ResponseInterceptor + AllExceptionsFilter.
export type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: string };
