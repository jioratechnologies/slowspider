import { Injectable } from "@nestjs/common";
import { createClient } from "@supabase/supabase-js";
import { SupabaseService } from "../common/services/supabase.service";
import { StorageService } from "../common/services/storage.service";
import { BIN_MS } from "./board-helpers";
import { STORAGE_QUOTA_BYTES } from "../common/types";
import type { BoardData, Category, Cluster, Milestone, Note, SortMode, Task } from "../common/types";

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

// 1:1 port of apps/web's src/lib/queries.ts + the board/notes/categories/clusters/tasks
// functions in src/lib/services/board.ts. Storage-touching pieces (upload/read URLs, the
// object delete in deleteNote) now go through StorageService instead of calling the
// Supabase Storage SDK directly — see storage.service.ts's header comment.
@Injectable()
export class BoardService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly storage: StorageService
  ) {}

  private client(token: string) {
    return this.supabase.forToken(token);
  }

  // ---- board read (queries.ts) ----

  /** Permanently removes clusters/tasks that have sat in the Dumping bin past the 2-week
   * retention window (a global sweep, not user-scoped). */
  async purgeBin(): Promise<void> {
    const cutoff = new Date(Date.now() - BIN_MS).toISOString();
    await this.supabase.admin().from("clusters").delete().eq("status", "binned").lt("binned_at", cutoff);
    await this.supabase.admin().from("tasks").delete().eq("binned", true).lt("binned_at", cutoff);
  }

  async fetchBoardData(workspaceId: number, userId: string): Promise<BoardData> {
    const db = this.supabase.admin();
    const [{ data: categories }, { data: clusters }, { data: tasks }, { data: milestones }, { data: notes }, { data: used }] = await Promise.all([
      db.from("categories").select("*").eq("workspace_id", workspaceId).order("pos", { ascending: true }),
      db.from("clusters").select("*").eq("workspace_id", workspaceId).order("pos", { ascending: true }),
      db.from("tasks").select("*").eq("workspace_id", workspaceId).order("pos", { ascending: true }),
      db.from("milestones").select("*").eq("workspace_id", workspaceId).order("pos", { ascending: true }),
      // db (service_role) bypasses RLS, so the private-note rule the notes policy enforces
      // for every other code path has to be re-stated by hand here.
      db.from("notes").select("*").eq("workspace_id", workspaceId).or(`visibility.eq.workspace,created_by.eq.${userId}`).order("pos", { ascending: true }),
      db.rpc("user_storage_used", { p_user_id: userId }),
    ]);

    const msByTask = new Map<number, Milestone[]>();
    (milestones || []).forEach((m: Milestone) => {
      const arr = msByTask.get(m.task_id) || [];
      arr.push(m);
      msByTask.set(m.task_id, arr);
    });

    const tasksWithMilestones: Task[] = (tasks || []).map((t: Task) => ({
      ...t,
      milestones: msByTask.get(t.id) || [],
    }));

    return {
      categories: (categories || []) as Category[],
      clusters: (clusters || []) as Cluster[],
      tasks: tasksWithMilestones,
      notes: (notes || []) as Note[],
      storageUsed: Number(used ?? 0),
    };
  }

  async fetchSortMode(userId: string, workspaceId: number): Promise<SortMode> {
    const { data } = await this.supabase.admin().from("user_settings").select("sort_mode").eq("user_id", userId).eq("workspace_id", workspaceId).maybeSingle();
    return (data?.sort_mode as SortMode) || "smart";
  }

  // ---- tasks ----
  async insertTask(token: string, workspaceId: number, input: { title: string; cluster_id: number | null; pos: number }): Promise<Task> {
    const row = unwrap<Task>(
      await this.client(token).from("tasks").insert({ workspace_id: workspaceId, title: input.title, cluster_id: input.cluster_id, pos: input.pos }).select().single()
    );
    return { ...row, milestones: [] };
  }

  async updateTask(token: string, workspaceId: number, id: number, patch: Partial<Task>): Promise<void> {
    const rest: Record<string, unknown> = { ...patch };
    delete rest.milestones; // client-side join, not a real column
    const { error } = await this.client(token).from("tasks").update(rest).eq("id", id).eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
  }

  async deleteTaskForever(token: string, workspaceId: number, id: number): Promise<void> {
    const { error } = await this.client(token).from("tasks").delete().eq("id", id).eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
  }

  // ---- milestones ----
  async insertMilestone(token: string, workspaceId: number, input: { task_id: number; title: string; pos: number }): Promise<Milestone> {
    return unwrap<Milestone>(
      await this.client(token).from("milestones").insert({ workspace_id: workspaceId, task_id: input.task_id, title: input.title, pos: input.pos }).select().single()
    );
  }

  async updateMilestone(token: string, id: number, patch: Partial<Milestone>): Promise<void> {
    const { error } = await this.client(token).from("milestones").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
  }

  async deleteMilestone(token: string, id: number): Promise<void> {
    const { error } = await this.client(token).from("milestones").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  // ---- clusters ----
  async insertCluster(token: string, workspaceId: number, input: { name: string; color: string; category_id: number | null; pos: number }): Promise<Cluster> {
    return unwrap<Cluster>(
      await this.client(token)
        .from("clusters")
        .insert({ workspace_id: workspaceId, name: input.name, color: input.color, category_id: input.category_id, pos: input.pos })
        .select()
        .single()
    );
  }

  async updateCluster(token: string, workspaceId: number, id: number, patch: Partial<Cluster>): Promise<void> {
    const { error } = await this.client(token).from("clusters").update(patch).eq("id", id).eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
  }

  async deleteClusterForever(token: string, workspaceId: number, id: number): Promise<void> {
    const { error } = await this.client(token).from("clusters").delete().eq("id", id).eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
  }

  async batchUpdatePos(token: string, workspaceId: number, table: "clusters" | "categories", updates: { id: number; pos: number }[]): Promise<void> {
    const c = this.client(token);
    const results = await Promise.all(updates.map((u) => c.from(table).update({ pos: u.pos }).eq("id", u.id).eq("workspace_id", workspaceId)));
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(failed.error.message);
  }

  // ---- categories ----
  async insertCategory(token: string, workspaceId: number, input: { name: string; color: string; pos: number }): Promise<Category> {
    return unwrap<Category>(await this.client(token).from("categories").insert({ workspace_id: workspaceId, name: input.name, color: input.color, pos: input.pos }).select().single());
  }

  async updateCategory(token: string, workspaceId: number, id: number, patch: Partial<Category>): Promise<void> {
    const { error } = await this.client(token).from("categories").update(patch).eq("id", id).eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
  }

  async deleteCategory(token: string, workspaceId: number, id: number): Promise<void> {
    const { error } = await this.client(token).from("categories").delete().eq("id", id).eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
  }

  // ---- daily maintenance cron ----
  async runDailyColdStorageCron(): Promise<{
    archivedClusters: number;
    archivedTasks: number;
    purgedBinnedClusters: number;
    purgedBinnedTasks: number;
    timestamp: string;
  }> {
    // Matches board.ts's original fallback exactly: falls back to the publishable key if
    // the service-role key isn't configured, rather than SupabaseService.admin()'s hard
    // requirement on SUPABASE_SERVICE_ROLE_KEY.
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY!;
    const supabase = createClient(process.env.SUPABASE_URL!, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const fourMonthsAgo = new Date(Date.now() - 120 * 86400000).toISOString();
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();

    // 1. Auto-Archive Inactive Clusters (> 4 months untouched)
    const { data: coldClusters } = await supabase.from("clusters").update({ status: "cold", binned_at: null }).eq("status", "active").lt("last_used_at", fourMonthsAgo).select("id");

    // 2. Auto-Archive Inactive Tasks (> 4 months untouched)
    const { data: coldTasks } = await supabase.from("tasks").update({ cold: true }).eq("cold", false).eq("binned", false).lt("created_at", fourMonthsAgo).select("id");

    // 3. Purge expired bin items (> 14 days in bin)
    const { data: purgedClusters } = await supabase.from("clusters").delete().eq("status", "binned").lt("binned_at", twoWeeksAgo).select("id");

    const { data: purgedTasks } = await supabase.from("tasks").delete().eq("binned", true).lt("binned_at", twoWeeksAgo).select("id");

    return {
      archivedClusters: coldClusters?.length ?? 0,
      archivedTasks: coldTasks?.length ?? 0,
      purgedBinnedClusters: purgedClusters?.length ?? 0,
      purgedBinnedTasks: purgedTasks?.length ?? 0,
      timestamp: new Date().toISOString(),
    };
  }

  // ---- notes ----
  async insertNote(token: string, workspaceId: number, userId: string, input: Omit<Note, "id" | "workspace_id" | "created_by" | "created_at">): Promise<Note> {
    if (input.size_bytes > 0) {
      const used = await this.storage.storageUsed(token, userId);
      if (used + input.size_bytes > STORAGE_QUOTA_BYTES) {
        throw new Error("Storage full — you've used your 10 GB. Delete some media notes to free space.");
      }
    }
    return unwrap<Note>(await this.client(token).from("notes").insert({ ...input, workspace_id: workspaceId, created_by: userId }).select().single());
  }

  async updateNote(token: string, workspaceId: number, id: number, patch: Partial<Note>): Promise<void> {
    const { error } = await this.client(token)
      .from("notes")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
  }

  async deleteNote(token: string, workspaceId: number, id: number): Promise<void> {
    const c = this.client(token);
    // Drop the backing object first — orphaned bytes would otherwise keep counting toward
    // the user's quota with no row left to find them by.
    const { data: row } = await c.from("notes").select("url").eq("id", id).eq("workspace_id", workspaceId).maybeSingle();
    const path = (row as { url: string | null } | null)?.url;
    if (path) await this.storage.deleteFile(token, path);
    const { error } = await c.from("notes").delete().eq("id", id).eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
  }

  // ---- settings ----
  async saveSortMode(token: string, workspaceId: number, userId: string, sortMode: SortMode): Promise<void> {
    const { error } = await this.client(token).from("user_settings").upsert({ user_id: userId, workspace_id: workspaceId, sort_mode: sortMode }, { onConflict: "user_id,workspace_id" });
    if (error) throw new Error(error.message);
  }
}
