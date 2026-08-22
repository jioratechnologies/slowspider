import { Injectable } from "@nestjs/common";
import { createClient } from "@supabase/supabase-js";
import { SupabaseService } from "../common/services/supabase.service";
import { StorageService } from "../common/services/storage.service";
import { NatsService } from "../common/services/nats.service";
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
// Supabase Storage SDK directly — see storage.service.ts's header comment. Every
// insert/update/delete below also publishes a NATS change event (Phase 5 live sync) right
// after the DB call succeeds — this is what replaced Supabase Realtime's `postgres_changes`
// firing automatically on every row change; since we're no longer relying on Postgres to
// notice the write, each mutation has to say so itself. update/delete calls chain `.select()`
// onto the same statement (PostgREST's `Prefer: return=representation`) to get the row back
// for the event payload — this is NOT an extra round trip, just a wider response on the
// same query.
@Injectable()
export class BoardService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly storage: StorageService,
    private readonly nats: NatsService
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
    const task = { ...row, milestones: [] };
    this.nats.publishChange(workspaceId, "tasks", "INSERT", task);
    return task;
  }

  async updateTask(token: string, workspaceId: number, id: number, patch: Partial<Task>): Promise<Task> {
    const rest: Record<string, unknown> = { ...patch };
    delete rest.milestones; // client-side join, not a real column
    const row = unwrap<Task>(await this.client(token).from("tasks").update(rest).eq("id", id).eq("workspace_id", workspaceId).select().single());
    this.nats.publishChange(workspaceId, "tasks", "UPDATE", row);
    return row;
  }

  async deleteTaskForever(token: string, workspaceId: number, id: number): Promise<void> {
    const row = unwrap<{ id: number }>(
      await this.client(token).from("tasks").delete().eq("id", id).eq("workspace_id", workspaceId).select("id").single()
    );
    this.nats.publishChange(workspaceId, "tasks", "DELETE", row);
  }

  // ---- milestones ----
  async insertMilestone(token: string, workspaceId: number, input: { task_id: number; title: string; pos: number }): Promise<Milestone> {
    const row = unwrap<Milestone>(
      await this.client(token).from("milestones").insert({ workspace_id: workspaceId, task_id: input.task_id, title: input.title, pos: input.pos }).select().single()
    );
    this.nats.publishChange(workspaceId, "milestones", "INSERT", row);
    return row;
  }

  async updateMilestone(token: string, workspaceId: number, id: number, patch: Partial<Milestone>): Promise<Milestone> {
    const row = unwrap<Milestone>(await this.client(token).from("milestones").update(patch).eq("id", id).select().single());
    this.nats.publishChange(workspaceId, "milestones", "UPDATE", row);
    return row;
  }

  async deleteMilestone(token: string, workspaceId: number, id: number): Promise<void> {
    const row = unwrap<{ id: number; task_id: number }>(
      await this.client(token).from("milestones").delete().eq("id", id).select("id, task_id").single()
    );
    this.nats.publishChange(workspaceId, "milestones", "DELETE", row);
  }

  // ---- clusters ----
  async insertCluster(token: string, workspaceId: number, input: { name: string; color: string; category_id: number | null; pos: number }): Promise<Cluster> {
    const row = unwrap<Cluster>(
      await this.client(token)
        .from("clusters")
        .insert({ workspace_id: workspaceId, name: input.name, color: input.color, category_id: input.category_id, pos: input.pos })
        .select()
        .single()
    );
    this.nats.publishChange(workspaceId, "clusters", "INSERT", row);
    return row;
  }

  async updateCluster(token: string, workspaceId: number, id: number, patch: Partial<Cluster>): Promise<Cluster> {
    const row = unwrap<Cluster>(await this.client(token).from("clusters").update(patch).eq("id", id).eq("workspace_id", workspaceId).select().single());
    this.nats.publishChange(workspaceId, "clusters", "UPDATE", row);
    return row;
  }

  async deleteClusterForever(token: string, workspaceId: number, id: number): Promise<void> {
    const row = unwrap<{ id: number }>(
      await this.client(token).from("clusters").delete().eq("id", id).eq("workspace_id", workspaceId).select("id").single()
    );
    this.nats.publishChange(workspaceId, "clusters", "DELETE", row);
  }

  // batchUpdatePos powers cluster reordering (and category reordering, though that path
  // isn't currently exercised by the UI) — each row-level update also fires its own live-sync
  // event, same as if it'd gone through updateCluster/updateCategory one at a time; this used
  // to happen for free via Postgres Realtime firing per row regardless of how the app issued
  // the write, so this keeps that parity now that publishing is explicit.
  async batchUpdatePos(token: string, workspaceId: number, table: "clusters" | "categories", updates: { id: number; pos: number }[]): Promise<void> {
    const c = this.client(token);
    const results = await Promise.all(
      updates.map((u) => c.from(table).update({ pos: u.pos }).eq("id", u.id).eq("workspace_id", workspaceId).select().single())
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(failed.error.message);
    for (const r of results) {
      if (r.data) this.nats.publishChange(workspaceId, table, "UPDATE", r.data);
    }
  }

  // ---- categories ----
  async insertCategory(token: string, workspaceId: number, input: { name: string; color: string; pos: number }): Promise<Category> {
    const row = unwrap<Category>(
      await this.client(token).from("categories").insert({ workspace_id: workspaceId, name: input.name, color: input.color, pos: input.pos }).select().single()
    );
    this.nats.publishChange(workspaceId, "categories", "INSERT", row);
    return row;
  }

  async updateCategory(token: string, workspaceId: number, id: number, patch: Partial<Category>): Promise<Category> {
    const row = unwrap<Category>(await this.client(token).from("categories").update(patch).eq("id", id).eq("workspace_id", workspaceId).select().single());
    this.nats.publishChange(workspaceId, "categories", "UPDATE", row);
    return row;
  }

  async deleteCategory(token: string, workspaceId: number, id: number): Promise<void> {
    const row = unwrap<{ id: number }>(
      await this.client(token).from("categories").delete().eq("id", id).eq("workspace_id", workspaceId).select("id").single()
    );
    this.nats.publishChange(workspaceId, "categories", "DELETE", row);
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

    // This sweep runs across every workspace, unlike the token-scoped mutations above, so
    // each affected row is published individually keyed off its own workspace_id (selected
    // back as part of the same update/delete call, same no-extra-query approach as
    // elsewhere in this file) rather than one call per workspace.

    // 1. Auto-Archive Inactive Clusters (> 4 months untouched)
    const { data: coldClusters } = await supabase.from("clusters").update({ status: "cold", binned_at: null }).eq("status", "active").lt("last_used_at", fourMonthsAgo).select("*");
    (coldClusters || []).forEach((row: Cluster) => this.nats.publishChange(row.workspace_id, "clusters", "UPDATE", row));

    // 2. Auto-Archive Inactive Tasks (> 4 months untouched)
    const { data: coldTasks } = await supabase.from("tasks").update({ cold: true }).eq("cold", false).eq("binned", false).lt("created_at", fourMonthsAgo).select("*");
    // "milestones" isn't a real column (client-side join), so these rows are Task minus that
    // field — fine, the frontend's onTaskChange handler always re-attaches milestones from
    // its own existing local state rather than trusting whatever's on the incoming row.
    (coldTasks || []).forEach((row: Omit<Task, "milestones">) => this.nats.publishChange(row.workspace_id, "tasks", "UPDATE", row));

    // 3. Purge expired bin items (> 14 days in bin)
    const { data: purgedClusters } = await supabase.from("clusters").delete().eq("status", "binned").lt("binned_at", twoWeeksAgo).select("id, workspace_id");
    (purgedClusters || []).forEach((row: { id: number; workspace_id: number }) => this.nats.publishChange(row.workspace_id, "clusters", "DELETE", { id: row.id }));

    const { data: purgedTasks } = await supabase.from("tasks").delete().eq("binned", true).lt("binned_at", twoWeeksAgo).select("id, workspace_id");
    (purgedTasks || []).forEach((row: { id: number; workspace_id: number }) => this.nats.publishChange(row.workspace_id, "tasks", "DELETE", { id: row.id }));

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
    const row = unwrap<Note>(await this.client(token).from("notes").insert({ ...input, workspace_id: workspaceId, created_by: userId }).select().single());
    this.nats.publishChange(workspaceId, "notes", "INSERT", row);
    return row;
  }

  async updateNote(token: string, workspaceId: number, id: number, patch: Partial<Note>): Promise<Note> {
    const row = unwrap<Note>(
      await this.client(token)
        .from("notes")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .select()
        .single()
    );
    this.nats.publishChange(workspaceId, "notes", "UPDATE", row);
    return row;
  }

  async deleteNote(token: string, workspaceId: number, id: number): Promise<void> {
    const c = this.client(token);
    // Drop the backing object first — orphaned bytes would otherwise keep counting toward
    // the user's quota with no row left to find them by. Selecting "id, url" here (rather
    // than just "url") isn't an extra round trip beyond what this lookup already needed —
    // it just widens the one query that was always here for the storage cleanup.
    const { data: row } = await c.from("notes").select("id, url").eq("id", id).eq("workspace_id", workspaceId).maybeSingle();
    const found = row as { id: number; url: string | null } | null;
    if (found?.url) await this.storage.deleteFile(token, found.url);
    const { error } = await c.from("notes").delete().eq("id", id).eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
    if (found) this.nats.publishChange(workspaceId, "notes", "DELETE", { id: found.id });
  }

  // ---- settings ----
  async saveSortMode(token: string, workspaceId: number, userId: string, sortMode: SortMode): Promise<void> {
    const { error } = await this.client(token).from("user_settings").upsert({ user_id: userId, workspace_id: workspaceId, sort_mode: sortMode }, { onConflict: "user_id,workspace_id" });
    if (error) throw new Error(error.message);
  }
}
