// Re-exports the canonical DTO/row types from packages/shared-types — see that package's
// header comment for the full reconciliation history. Kept as its own module (rather than
// switching every import site to "@slowspider/shared-types" directly) so the ~25 files across
// apps/web that already `import ... from "@/lib/types"` (or "./types") don't need to change.
//
// Named re-exports rather than `export *`: packages/shared-types compiles to CommonJS (so a
// plain Node/tsc-built apps/backend can `require()` it without a TS-aware runtime), and
// Turbopack warns on `export *` from a CommonJS module ("exports only available at runtime") —
// listing the names explicitly avoids that extra runtime indirection.
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
