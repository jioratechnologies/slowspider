import type { Cluster, Priority, Task } from "./types";

export const COLORS = [
  "#6b7a5e", "#4c9a8a", "#4f8f5a", "#8a9a4e", "#6f8fa6", "#3f8fb0", "#5b6bb0", "#8a6ea6",
  "#a05a86", "#b06f8a", "#c0563f", "#b0574f", "#c17f4a", "#c99a3f", "#b58a3f", "#9a7b53",
  "#7d8891", "#5f7d6a",
];

export const PRIO_RANK: Record<Priority, number> = { high: 3, med: 2, low: 1, none: 0 };
export const BIN_MS = 14 * 86400000; // 2 weeks
export const COLD_IDLE_MS = 120 * 86400000; // ~4 months untouched before a cluster freezes

export function idleDays(lastUsedAt: string | null | undefined): number {
  if (!lastUsedAt) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(lastUsedAt).getTime()) / 86400000));
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Cold storage compression factor: estimated 70% space savings for zipped cloud archive */
export function calculateColdCompression(sizeBytes: number): { original: number; zipped: number; saved: number } {
  const original = Math.max(0, sizeBytes);
  const zipped = Math.round(original * 0.3); // 70% compression
  const saved = original - zipped;
  return { original, zipped, saved };
}

export function isClusterStale(c: Cluster): boolean {
  return c.status === "active" && idleDays(c.last_used_at) * 86400000 >= COLD_IDLE_MS;
}

export function isTaskStale(t: Task): boolean {
  return !t.binned && !t.cold && !!t.deadline && idleDays(t.deadline) * 86400000 >= COLD_IDLE_MS;
}

export function isClusterActive(c: Cluster): boolean {
  return c.status === "active";
}

export function isTaskLive(t: Task, clusters: Cluster[]): boolean {
  if (t.binned || t.cold) return false;
  if (t.cluster_id == null) return true;
  const c = clusters.find((x) => x.id === t.cluster_id);
  return c ? isClusterActive(c) : true;
}

export function taskProgress(t: Task): { done: number; total: number; pct: number } {
  const ms = t.milestones || [];
  if (ms.length) {
    const done = ms.filter((m) => m.done).length;
    return { done, total: ms.length, pct: Math.round((done / ms.length) * 100) };
  }
  return { done: t.done ? 1 : 0, total: 0, pct: t.done ? 100 : 0 };
}

export function clusterProgress(clusterId: number, tasks: Task[]): { done: number; total: number; pct: number } {
  const arr = tasks.filter((t) => t.cluster_id === clusterId && !t.binned && !t.cold);
  const total = arr.length;
  const done = arr.filter((t) => t.done).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

function todayStr(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function dayDiff(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  return Math.round((d.getTime() - todayStr().getTime()) / 86400000);
}

export function fmtDate(dateStr: string | null | undefined): string {
  const diff = dayDiff(dateStr);
  if (diff === null) return "";
  const d = new Date(dateStr + "T00:00:00");
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  let label = d.toLocaleDateString(undefined, opts);
  if (diff === 0) label = "Today";
  else if (diff === 1) label = "Tomorrow";
  else if (diff === -1) label = "Yesterday";
  else if (diff < -1) label = -diff + "d overdue";
  else if (diff <= 7) label = "in " + diff + "d";
  return label;
}

export function dateClass(dateStr: string | null | undefined): "" | "overdue" | "soon" {
  const diff = dayDiff(dateStr);
  if (diff === null) return "";
  if (diff < 0) return "overdue";
  if (diff <= 2) return "soon";
  return "";
}

export function daysLeft(binnedAt: string | null): number {
  if (!binnedAt) return 14;
  try {
    return Math.max(0, Math.ceil((BIN_MS - (Date.now() - new Date(binnedAt).getTime())) / 86400000));
  } catch {
    return 14;
  }
}

export function rotStage(binnedAt: string | null): 0 | 1 | 2 {
  const dl = daysLeft(binnedAt);
  return dl <= 4 ? 2 : dl <= 9 ? 1 : 0;
}

export function tasksIn(
  tasks: Task[],
  clusterId: number | null,
  search: string,
  sortMode: "smart" | "manual"
): Task[] {
  let arr = tasks.filter((t) => t.cluster_id === clusterId && !t.binned && !t.cold);
  if (search) {
    const q = search.toLowerCase();
    arr = arr.filter(
      (t) => (t.title || "").toLowerCase().includes(q) || (t.notes || "").toLowerCase().includes(q)
    );
  }
  if (sortMode === "smart") {
    arr = arr.slice().sort((a, b) => {
      if (!!a.done !== !!b.done) return a.done ? 1 : -1;
      if (!!a.starred !== !!b.starred) return a.starred ? -1 : 1;
      const pr = PRIO_RANK[b.priority || "none"] - PRIO_RANK[a.priority || "none"];
      if (pr) return pr;
      const ad = a.deadline ? dayDiff(a.deadline)! : Infinity;
      const bd = b.deadline ? dayDiff(b.deadline)! : Infinity;
      if (ad !== bd) return ad - bd;
      return (a.pos || 0) - (b.pos || 0);
    });
  } else {
    arr = arr.slice().sort((a, b) => (a.pos || 0) - (b.pos || 0));
  }
  return arr;
}

/** Google Calendar only accepts a timed event, so a bare date isn't enough to sync. */
export function isCalendarSyncable(t: Task): boolean {
  return !!t.deadline && !!t.deadline_time;
}

export function tasksByDate(tasks: Task[], clusters: Cluster[]): Map<string, Task[]> {
  const map = new Map<string, Task[]>();
  tasks.forEach((t) => {
    if (!t.deadline || !isTaskLive(t, clusters)) return;
    const arr = map.get(t.deadline) || [];
    arr.push(t);
    map.set(t.deadline, arr);
  });
  map.forEach((arr) => arr.sort((a, b) => (a.deadline_time || "99:99").localeCompare(b.deadline_time || "99:99")));
  return map;
}

export function deadlineBuckets(tasks: Task[], clusters: Cluster[]): { overdue: Task[]; soon: Task[]; upcoming: Task[] } {
  const overdue: Task[] = [], soon: Task[] = [], upcoming: Task[] = [];
  tasks.forEach((t) => {
    if (t.done || !t.deadline || !isTaskLive(t, clusters)) return;
    const d = dayDiff(t.deadline)!;
    if (d < 0) overdue.push(t);
    else if (d <= 2) soon.push(t);
    else if (d <= 7) upcoming.push(t);
  });
  const by = (a: Task, b: Task) => dayDiff(a.deadline)! - dayDiff(b.deadline)!;
  overdue.sort(by);
  soon.sort(by);
  upcoming.sort(by);
  return { overdue, soon, upcoming };
}
