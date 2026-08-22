"use server";

import { cookies } from "next/headers";
import { createClient } from "./supabase/server";
import { backend } from "./backend-client";
import type { Category, Cluster, Milestone, Note, SortMode, Task } from "./types";

// Server Actions the Board client component calls directly. Used to call
// ./services/board.ts in-process; now calls apps/backend's /v1/** routes through Kong
// instead — the exact same endpoints apps/mobile/src/api.ts already talks to. Resolves the
// caller's Supabase session (never trusts a client-supplied id) the same way it always did;
// the only thing that changed is what happens with the resulting token — it's sent as a
// bearer header to the backend instead of being handed to an in-process service function.

const WORKSPACE_COOKIE = "active_workspace_id";

interface WorkspaceContext {
  userId: string;
  token: string;
  /** May be omitted when no workspace cookie is set yet — the backend falls back to the
   * account's default workspace itself (SupabaseAuthGuard), so there's no need to resolve
   * it here first. */
  workspaceId?: number;
}

async function requireWorkspaceContext(): Promise<WorkspaceContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in.");

  const cookieStore = await cookies();
  const fromCookie = Number(cookieStore.get(WORKSPACE_COOKIE)?.value);

  return { userId: user.id, token: session.access_token, workspaceId: fromCookie || undefined };
}

// ---- tasks ----
export async function insertTask(input: { title: string; cluster_id: number | null; pos: number }): Promise<Task> {
  const { token, workspaceId } = await requireWorkspaceContext();
  return backend.auth<Task>("/v1/tasks", { token, workspaceId }, { method: "POST", body: input });
}
export async function updateTask(id: number, patch: Partial<Task>): Promise<void> {
  const { token, workspaceId } = await requireWorkspaceContext();
  await backend.auth(`/v1/tasks/${id}`, { token, workspaceId }, { method: "PATCH", body: patch });
}
export async function deleteTaskForever(id: number): Promise<void> {
  const { token, workspaceId } = await requireWorkspaceContext();
  await backend.auth(`/v1/tasks/${id}`, { token, workspaceId }, { method: "DELETE" });
}

// ---- milestones ----
export async function insertMilestone(input: { task_id: number; title: string; pos: number }): Promise<Milestone> {
  const { token, workspaceId } = await requireWorkspaceContext();
  return backend.auth<Milestone>(
    `/v1/tasks/${input.task_id}/milestones`,
    { token, workspaceId },
    { method: "POST", body: { title: input.title, pos: input.pos } }
  );
}
export async function updateMilestone(id: number, patch: Partial<Milestone>): Promise<void> {
  const { token, workspaceId } = await requireWorkspaceContext();
  // The route shape requires a task-id path segment, but the backend handler only reads
  // :msId (same as the original Next.js route it was ported from) — the leading segment is
  // unused server-side, so any value satisfies routing.
  await backend.auth(`/v1/tasks/_/milestones/${id}`, { token, workspaceId }, { method: "PATCH", body: patch });
}
export async function deleteMilestone(id: number): Promise<void> {
  const { token, workspaceId } = await requireWorkspaceContext();
  await backend.auth(`/v1/tasks/_/milestones/${id}`, { token, workspaceId }, { method: "DELETE" });
}

// ---- clusters ----
export async function insertCluster(input: { name: string; color: string; category_id: number | null; pos: number }): Promise<Cluster> {
  const { token, workspaceId } = await requireWorkspaceContext();
  return backend.auth<Cluster>("/v1/clusters", { token, workspaceId }, { method: "POST", body: input });
}
export async function updateCluster(id: number, patch: Partial<Cluster>): Promise<void> {
  const { token, workspaceId } = await requireWorkspaceContext();
  await backend.auth(`/v1/clusters/${id}`, { token, workspaceId }, { method: "PATCH", body: patch });
}
export async function deleteClusterForever(id: number): Promise<void> {
  const { token, workspaceId } = await requireWorkspaceContext();
  await backend.auth(`/v1/clusters/${id}`, { token, workspaceId }, { method: "DELETE" });
}
export async function batchUpdatePos(table: "clusters" | "categories", updates: { id: number; pos: number }[]): Promise<void> {
  const { token, workspaceId } = await requireWorkspaceContext();
  if (table !== "clusters") {
    // apps/backend only exposes a reorder route for clusters (POST /v1/clusters/reorder) —
    // the original /api/v1 REST surface never had a categories/reorder route either, and no
    // UI code calls this with "categories" today (Board.tsx only ever passes "clusters").
    throw new Error("Reordering categories isn't available through the API yet.");
  }
  await backend.auth("/v1/clusters/reorder", { token, workspaceId }, { method: "POST", body: { updates } });
}

// ---- categories ----
export async function insertCategory(input: { name: string; color: string; pos: number }): Promise<Category> {
  const { token, workspaceId } = await requireWorkspaceContext();
  return backend.auth<Category>("/v1/categories", { token, workspaceId }, { method: "POST", body: input });
}
export async function updateCategory(id: number, patch: Partial<Category>): Promise<void> {
  const { token, workspaceId } = await requireWorkspaceContext();
  await backend.auth(`/v1/categories/${id}`, { token, workspaceId }, { method: "PATCH", body: patch });
}
export async function deleteCategory(id: number): Promise<void> {
  const { token, workspaceId } = await requireWorkspaceContext();
  await backend.auth(`/v1/categories/${id}`, { token, workspaceId }, { method: "DELETE" });
}

// ---- notes ----
export async function insertNote(input: Omit<Note, "id" | "workspace_id" | "created_by" | "created_at" | "yjs_state">): Promise<Note> {
  const { token, workspaceId } = await requireWorkspaceContext();
  return backend.auth<Note>("/v1/notes", { token, workspaceId }, { method: "POST", body: input });
}
export async function updateNote(id: number, patch: Partial<Note>): Promise<void> {
  const { token, workspaceId } = await requireWorkspaceContext();
  await backend.auth(`/v1/notes/${id}`, { token, workspaceId }, { method: "PATCH", body: patch });
}
export async function deleteNote(id: number): Promise<void> {
  const { token, workspaceId } = await requireWorkspaceContext();
  await backend.auth(`/v1/notes/${id}`, { token, workspaceId }, { method: "DELETE" });
}
export async function createMediaUploadUrl(filename: string, sizeBytes: number) {
  const { token, workspaceId } = await requireWorkspaceContext();
  return backend.auth<{ path: string; signedUrl: string; token: string }>(
    "/v1/notes/media",
    { token, workspaceId },
    { method: "POST", body: { filename, sizeBytes } }
  );
}
export async function createMediaReadUrl(path: string): Promise<string> {
  const { token, workspaceId } = await requireWorkspaceContext();
  const data = await backend.auth<{ url: string }>(`/v1/notes/media?path=${encodeURIComponent(path)}`, { token, workspaceId });
  return data.url;
}
export async function getStorageUsed(): Promise<number> {
  const { token, workspaceId } = await requireWorkspaceContext();
  const data = await backend.auth<{ used: number; quota: number }>("/v1/notes/media", { token, workspaceId });
  return data.used;
}
export async function previewLink(url: string): Promise<LinkPreview> {
  try {
    const { token, workspaceId } = await requireWorkspaceContext();
    return await backend.auth<LinkPreview>("/v1/notes/preview", { token, workspaceId }, { method: "POST", body: { url } });
  } catch {
    let hostname = url;
    try {
      hostname = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    } catch (_) {}
    return { url, title: hostname, description: "", image: null, siteName: hostname };
  }
}

// ---- settings ----
export async function saveSortMode(sortMode: SortMode): Promise<void> {
  const { token, workspaceId } = await requireWorkspaceContext();
  await backend.auth("/v1/settings/sort-mode", { token, workspaceId }, { method: "PATCH", body: { sortMode } });
}

export interface LinkPreview {
  url: string;
  title: string;
  description: string;
  image: string | null;
  siteName: string | null;
}

export type { ClusterStatus, Priority } from "./types";
