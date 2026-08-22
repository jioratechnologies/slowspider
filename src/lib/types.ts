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
}

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
