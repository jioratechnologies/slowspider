"use server";

import { cookies } from "next/headers";
import { createClient } from "./supabase/server";
import { getDefaultWorkspaceId } from "./services/workspace";
import * as board from "./services/board";
import { fetchLinkPreview, type LinkPreview } from "./services/link-preview";
import type { Category, Cluster, Milestone, Note, SortMode, Task } from "./types";

// Server Actions the Board client component calls directly — the web adapter over the
// portable service layer in ./services/board.ts. Resolves the caller's Supabase session
// (never trusts a client-supplied id) and their active workspace, then hands both to the
// matching service function, which does the actual RLS-scoped work. The REST API adapter
// (src/app/api/v1) calls the exact same service functions after verifying a bearer token
// and reading workspace_id from the request instead of a cookie.

const WORKSPACE_COOKIE = "active_workspace_id";

interface WorkspaceContext {
  userId: string;
  token: string;
  workspaceId: number;
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
  const workspaceId = fromCookie || (await getDefaultWorkspaceId(user.id));
  if (!workspaceId) throw new Error("No workspace found for this account.");

  return { userId: user.id, token: session.access_token, workspaceId };
}

// ---- tasks ----
export async function insertTask(input: { title: string; cluster_id: number | null; pos: number }): Promise<Task> {
  const { token, workspaceId } = await requireWorkspaceContext();
  return board.insertTask(token, workspaceId, input);
}
export async function updateTask(id: number, patch: Partial<Task>): Promise<void> {
  const { token, workspaceId } = await requireWorkspaceContext();
  return board.updateTask(token, workspaceId, id, patch);
}
export async function deleteTaskForever(id: number): Promise<void> {
  const { token, workspaceId } = await requireWorkspaceContext();
  return board.deleteTaskForever(token, workspaceId, id);
}

// ---- milestones ----
export async function insertMilestone(input: { task_id: number; title: string; pos: number }): Promise<Milestone> {
  const { token, workspaceId } = await requireWorkspaceContext();
  return board.insertMilestone(token, workspaceId, input);
}
export async function updateMilestone(id: number, patch: Partial<Milestone>): Promise<void> {
  const { token } = await requireWorkspaceContext();
  return board.updateMilestone(token, id, patch);
}
export async function deleteMilestone(id: number): Promise<void> {
  const { token } = await requireWorkspaceContext();
  return board.deleteMilestone(token, id);
}

// ---- clusters ----
export async function insertCluster(input: { name: string; color: string; category_id: number | null; pos: number }): Promise<Cluster> {
  const { token, workspaceId } = await requireWorkspaceContext();
  return board.insertCluster(token, workspaceId, input);
}
export async function updateCluster(id: number, patch: Partial<Cluster>): Promise<void> {
  const { token, workspaceId } = await requireWorkspaceContext();
  return board.updateCluster(token, workspaceId, id, patch);
}
export async function deleteClusterForever(id: number): Promise<void> {
  const { token, workspaceId } = await requireWorkspaceContext();
  return board.deleteClusterForever(token, workspaceId, id);
}
export async function batchUpdatePos(table: "clusters" | "categories", updates: { id: number; pos: number }[]): Promise<void> {
  const { token, workspaceId } = await requireWorkspaceContext();
  return board.batchUpdatePos(token, workspaceId, table, updates);
}

// ---- categories ----
export async function insertCategory(input: { name: string; color: string; pos: number }): Promise<Category> {
  const { token, workspaceId } = await requireWorkspaceContext();
  return board.insertCategory(token, workspaceId, input);
}
export async function updateCategory(id: number, patch: Partial<Category>): Promise<void> {
  const { token, workspaceId } = await requireWorkspaceContext();
  return board.updateCategory(token, workspaceId, id, patch);
}
export async function deleteCategory(id: number): Promise<void> {
  const { token, workspaceId } = await requireWorkspaceContext();
  return board.deleteCategory(token, workspaceId, id);
}

// ---- notes ----
export async function insertNote(input: Omit<Note, "id" | "workspace_id" | "created_by" | "created_at">): Promise<Note> {
  const { token, userId, workspaceId } = await requireWorkspaceContext();
  return board.insertNote(token, workspaceId, userId, input);
}
export async function updateNote(id: number, patch: Partial<Note>): Promise<void> {
  const { token, workspaceId } = await requireWorkspaceContext();
  return board.updateNote(token, workspaceId, id, patch);
}
export async function deleteNote(id: number): Promise<void> {
  const { token, workspaceId } = await requireWorkspaceContext();
  return board.deleteNote(token, workspaceId, id);
}
export async function createMediaUploadUrl(filename: string, sizeBytes: number) {
  const { token, userId } = await requireWorkspaceContext();
  return board.createMediaUploadUrl(token, userId, filename, sizeBytes);
}
export async function createMediaReadUrl(path: string): Promise<string> {
  const { token } = await requireWorkspaceContext();
  return board.createMediaReadUrl(token, path);
}
export async function getStorageUsed(): Promise<number> {
  const { token, userId } = await requireWorkspaceContext();
  return board.storageUsed(token, userId);
}
export async function previewLink(url: string): Promise<LinkPreview> {
  await requireWorkspaceContext(); // signed-in callers only — this fetches an arbitrary URL server-side
  return fetchLinkPreview(url);
}

// ---- settings ----
export async function saveSortMode(sortMode: SortMode): Promise<void> {
  const { token, userId, workspaceId } = await requireWorkspaceContext();
  return board.saveSortMode(token, workspaceId, userId, sortMode);
}

export type { ClusterStatus, Priority } from "./services/board";
