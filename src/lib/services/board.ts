import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Category, Cluster, ClusterStatus, Milestone, Note, Priority, SortMode, Task } from "../types";
import { STORAGE_QUOTA_BYTES } from "../types";

// Portable business logic — no Next.js imports. Every function takes the caller's Supabase
// access token (from a web cookie session or an API bearer header — the adapter's job to
// supply either way) plus a workspaceId. A per-call client scoped to that token is what
// makes Postgres RLS the real access boundary: a token for someone who isn't a member of
// workspaceId gets zero rows back at the database level, not just an app-code check.

function client(accessToken: string) {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

// ---- tasks ----
export async function insertTask(
  token: string,
  workspaceId: number,
  input: { title: string; cluster_id: number | null; pos: number }
): Promise<Task> {
  const row = unwrap<Task>(
    await client(token)
      .from("tasks")
      .insert({ workspace_id: workspaceId, title: input.title, cluster_id: input.cluster_id, pos: input.pos })
      .select()
      .single()
  );
  return { ...row, milestones: [] };
}

export async function updateTask(token: string, workspaceId: number, id: number, patch: Partial<Task>): Promise<void> {
  const rest: Record<string, unknown> = { ...patch };
  delete rest.milestones; // client-side join, not a real column
  const { error } = await client(token).from("tasks").update(rest).eq("id", id).eq("workspace_id", workspaceId);
  if (error) throw new Error(error.message);
}

export async function deleteTaskForever(token: string, workspaceId: number, id: number): Promise<void> {
  const { error } = await client(token).from("tasks").delete().eq("id", id).eq("workspace_id", workspaceId);
  if (error) throw new Error(error.message);
}

// ---- milestones ----
export async function insertMilestone(
  token: string,
  workspaceId: number,
  input: { task_id: number; title: string; pos: number }
): Promise<Milestone> {
  return unwrap<Milestone>(
    await client(token)
      .from("milestones")
      .insert({ workspace_id: workspaceId, task_id: input.task_id, title: input.title, pos: input.pos })
      .select()
      .single()
  );
}

export async function updateMilestone(token: string, id: number, patch: Partial<Milestone>): Promise<void> {
  const { error } = await client(token).from("milestones").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteMilestone(token: string, id: number): Promise<void> {
  const { error } = await client(token).from("milestones").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---- clusters ----
export async function insertCluster(
  token: string,
  workspaceId: number,
  input: { name: string; color: string; category_id: number | null; pos: number }
): Promise<Cluster> {
  return unwrap<Cluster>(
    await client(token)
      .from("clusters")
      .insert({ workspace_id: workspaceId, name: input.name, color: input.color, category_id: input.category_id, pos: input.pos })
      .select()
      .single()
  );
}

export async function updateCluster(token: string, workspaceId: number, id: number, patch: Partial<Cluster>): Promise<void> {
  const { error } = await client(token).from("clusters").update(patch).eq("id", id).eq("workspace_id", workspaceId);
  if (error) throw new Error(error.message);
}

export async function deleteClusterForever(token: string, workspaceId: number, id: number): Promise<void> {
  const { error } = await client(token).from("clusters").delete().eq("id", id).eq("workspace_id", workspaceId);
  if (error) throw new Error(error.message);
}

export async function batchUpdatePos(
  token: string,
  workspaceId: number,
  table: "clusters" | "categories",
  updates: { id: number; pos: number }[]
): Promise<void> {
  const c = client(token);
  const results = await Promise.all(updates.map((u) => c.from(table).update({ pos: u.pos }).eq("id", u.id).eq("workspace_id", workspaceId)));
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
}

// ---- categories ----
export async function insertCategory(
  token: string,
  workspaceId: number,
  input: { name: string; color: string; pos: number }
): Promise<Category> {
  return unwrap<Category>(
    await client(token)
      .from("categories")
      .insert({ workspace_id: workspaceId, name: input.name, color: input.color, pos: input.pos })
      .select()
      .single()
  );
}

export async function updateCategory(token: string, workspaceId: number, id: number, patch: Partial<Category>): Promise<void> {
  const { error } = await client(token).from("categories").update(patch).eq("id", id).eq("workspace_id", workspaceId);
  if (error) throw new Error(error.message);
}

export async function deleteCategory(token: string, workspaceId: number, id: number): Promise<void> {
  const { error } = await client(token).from("categories").delete().eq("id", id).eq("workspace_id", workspaceId);
  if (error) throw new Error(error.message);
}

// ---- daily maintenance cron ----
export async function runDailyColdStorageCron(): Promise<{
  archivedClusters: number;
  archivedTasks: number;
  purgedBinnedClusters: number;
  purgedBinnedTasks: number;
  timestamp: string;
}> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const supabase = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const fourMonthsAgo = new Date(Date.now() - 120 * 86400000).toISOString();
  const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();

  // 1. Auto-Archive Inactive Clusters (> 4 months untouched)
  const { data: coldClusters } = await supabase
    .from("clusters")
    .update({ status: "cold", binned_at: null })
    .eq("status", "active")
    .lt("last_used_at", fourMonthsAgo)
    .select("id");

  // 2. Auto-Archive Inactive Tasks (> 4 months untouched)
  const { data: coldTasks } = await supabase
    .from("tasks")
    .update({ cold: true })
    .eq("cold", false)
    .eq("binned", false)
    .lt("created_at", fourMonthsAgo)
    .select("id");

  // 3. Purge expired bin items (> 14 days in bin)
  const { data: purgedClusters } = await supabase
    .from("clusters")
    .delete()
    .eq("status", "binned")
    .lt("binned_at", twoWeeksAgo)
    .select("id");

  const { data: purgedTasks } = await supabase
    .from("tasks")
    .delete()
    .eq("binned", true)
    .lt("binned_at", twoWeeksAgo)
    .select("id");

  return {
    archivedClusters: coldClusters?.length ?? 0,
    archivedTasks: coldTasks?.length ?? 0,
    purgedBinnedClusters: purgedClusters?.length ?? 0,
    purgedBinnedTasks: purgedTasks?.length ?? 0,
    timestamp: new Date().toISOString(),
  };
}

// ---- notes ----
export const MEDIA_BUCKET = "note-media";

export async function storageUsed(token: string, userId: string): Promise<number> {
  const { data, error } = await client(token).rpc("user_storage_used", { p_user_id: userId });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export async function insertNote(
  token: string,
  workspaceId: number,
  userId: string,
  input: Omit<Note, "id" | "workspace_id" | "created_by" | "created_at">
): Promise<Note> {
  if (input.size_bytes > 0) {
    const used = await storageUsed(token, userId);
    if (used + input.size_bytes > STORAGE_QUOTA_BYTES) {
      throw new Error("Storage full — you've used your 10 GB. Delete some media notes to free space.");
    }
  }
  return unwrap<Note>(
    await client(token)
      .from("notes")
      .insert({ ...input, workspace_id: workspaceId, created_by: userId })
      .select()
      .single()
  );
}

export async function updateNote(token: string, workspaceId: number, id: number, patch: Partial<Note>): Promise<void> {
  const { error } = await client(token)
    .from("notes")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspaceId);
  if (error) throw new Error(error.message);
}

export async function deleteNote(token: string, workspaceId: number, id: number): Promise<void> {
  const c = client(token);
  // Drop the backing object first — orphaned bytes would otherwise keep counting toward
  // the user's quota with no row left to find them by.
  const { data: row } = await c.from("notes").select("url").eq("id", id).eq("workspace_id", workspaceId).maybeSingle();
  const path = (row as { url: string | null } | null)?.url;
  if (path) await c.storage.from(MEDIA_BUCKET).remove([path]);
  const { error } = await c.from("notes").delete().eq("id", id).eq("workspace_id", workspaceId);
  if (error) throw new Error(error.message);
}

export async function createMediaUploadUrl(
  token: string,
  userId: string,
  filename: string,
  sizeBytes: number
): Promise<{ path: string; signedUrl: string; token: string }> {
  const used = await storageUsed(token, userId);
  if (used + sizeBytes > STORAGE_QUOTA_BYTES) {
    throw new Error("Storage full — you've used your 10 GB. Delete some media notes to free space.");
  }
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const path = `${userId}/${Date.now()}-${safe}`;
  const { data, error } = await client(token).storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error) throw new Error(error.message);
  // supabase-js can hand back a storage-relative path here; native clients PUT to this
  // directly and have no base URL to resolve it against.
  const signedUrl = data.signedUrl.startsWith("http")
    ? data.signedUrl
    : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1${data.signedUrl.startsWith("/") ? "" : "/"}${data.signedUrl}`;
  return { path, signedUrl, token: data.token };
}

export async function createMediaReadUrl(token: string, path: string): Promise<string> {
  const { data, error } = await client(token).storage.from(MEDIA_BUCKET).createSignedUrl(path, 3600);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

// ---- settings ----
export async function saveSortMode(token: string, workspaceId: number, userId: string, sortMode: SortMode): Promise<void> {
  const { error } = await client(token)
    .from("user_settings")
    .upsert({ user_id: userId, workspace_id: workspaceId, sort_mode: sortMode }, { onConflict: "user_id,workspace_id" });
  if (error) throw new Error(error.message);
}

export type { ClusterStatus, Priority };
