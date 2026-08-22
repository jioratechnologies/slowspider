// Re-exports the canonical DTO/row types from packages/shared-types — see that package's
// header comment for the full reconciliation history. Kept as its own module (rather than
// switching every import site to "@slowspider/shared-types" directly) so the existing
// `from "../common/types"` imports across apps/backend don't need to change.
export type {
  Priority,
  ClusterStatus,
  SortMode,
  NoteKind,
  AttachmentKind,
  TextNoteKind,
  NoteVisibility,
  Category,
  Cluster,
  Note,
  Milestone,
  Task,
  BoardData,
  BoardPayload,
  Workspace,
  WorkspaceRef,
  MemberRow,
  InviteRow,
  PendingInviteForUser,
  ApiEnvelope,
} from "@slowspider/shared-types";
export { ATTACHMENT_KINDS, TEXT_NOTE_KINDS, isAttachment, isTextNote, STORAGE_QUOTA_BYTES } from "@slowspider/shared-types";
