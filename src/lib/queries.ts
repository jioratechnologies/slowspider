import "server-only";
import { db } from "./db";
import type { BoardData, Category, Cluster, Milestone, Note, SortMode, Task } from "./types";
import { BIN_MS } from "./board-helpers";

// Permanently removes clusters/tasks that have sat in the Dumping bin past the 2-week
// retention window (a global sweep, not user-scoped). Cluster deletion cascades to its
// tasks via the FK, so only two deletes are needed.
export async function purgeBin(): Promise<void> {
  const cutoff = new Date(Date.now() - BIN_MS).toISOString();
  await db().from("clusters").delete().eq("status", "binned").lt("binned_at", cutoff);
  await db().from("tasks").delete().eq("binned", true).lt("binned_at", cutoff);
}

export async function fetchBoardData(workspaceId: number, userId: string): Promise<BoardData> {
  const [{ data: categories }, { data: clusters }, { data: tasks }, { data: milestones }, { data: notes }, { data: used }] =
    await Promise.all([
      db().from("categories").select("*").eq("workspace_id", workspaceId).order("pos", { ascending: true }),
      db().from("clusters").select("*").eq("workspace_id", workspaceId).order("pos", { ascending: true }),
      db().from("tasks").select("*").eq("workspace_id", workspaceId).order("pos", { ascending: true }),
      db().from("milestones").select("*").eq("workspace_id", workspaceId).order("pos", { ascending: true }),
      // db() is the service_role client and bypasses RLS, so the private-note rule that the
      // notes policy enforces for every other code path has to be re-stated by hand here.
      db()
        .from("notes")
        .select("*")
        .eq("workspace_id", workspaceId)
        .or(`visibility.eq.workspace,created_by.eq.${userId}`)
        .order("pos", { ascending: true }),
      db().rpc("user_storage_used", { p_user_id: userId }),
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

export async function fetchSortMode(userId: string, workspaceId: number): Promise<SortMode> {
  const { data } = await db()
    .from("user_settings")
    .select("sort_mode")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return (data?.sort_mode as SortMode) || "smart";
}
