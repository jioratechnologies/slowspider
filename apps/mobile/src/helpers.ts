import type { Priority, RemoteCluster, RemoteTask } from "./api";

export const PRIO_RANK: Record<Priority, number> = { high: 3, med: 2, low: 1, none: 0 };
export const BIN_MS = 14 * 86400000; // 2 weeks

export function isClusterActive(c: RemoteCluster): boolean {
  return c.status === "active";
}

export function isTaskLive(t: RemoteTask, clusters: RemoteCluster[]): boolean {
  if (t.binned || t.cold) return false;
  if (t.cluster_id == null) return true;
  const c = clusters.find((x) => x.id === t.cluster_id);
  return c ? isClusterActive(c) : true;
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
  let label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (diff === 0) label = "Today";
  else if (diff === 1) label = "Tomorrow";
  else if (diff === -1) label = "Yesterday";
  else if (diff < -1) label = -diff + "d overdue";
  else if (diff <= 7) label = "in " + diff + "d";
  return label;
}

/**
 * Web's quick-add stamps attachment markers into the title (`[File: name.ext]`) and strips
 * them at render time. Mobile shows the same tasks, so it strips them the same way.
 */
export function displayTitle(title: string): string {
  return title.replace(/\[File:\s*[^\]]+\]/g, "").trim();
}

export function dateClass(dateStr: string | null | undefined): "" | "overdue" | "soon" {
  const diff = dayDiff(dateStr);
  if (diff === null) return "";
  if (diff < 0) return "overdue";
  if (diff <= 2) return "soon";
  return "";
}

export function taskProgress(t: RemoteTask): { done: number; total: number; pct: number } {
  const ms = t.milestones || [];
  if (!ms.length) return { done: t.done ? 1 : 0, total: 0, pct: t.done ? 100 : 0 };
  const done = ms.filter((m) => m.done).length;
  return { done, total: ms.length, pct: Math.round((done / ms.length) * 100) };
}

export function sortTasks(tasks: RemoteTask[], mode: "smart" | "manual" = "smart"): RemoteTask[] {
  if (mode === "manual") return [...tasks].sort((a, b) => (a.pos || 0) - (b.pos || 0));
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.starred !== b.starred) return a.starred ? -1 : 1;
    const pr = PRIO_RANK[b.priority] - PRIO_RANK[a.priority];
    if (pr) return pr;
    const ad = a.deadline ? (dayDiff(a.deadline) ?? Infinity) : Infinity;
    const bd = b.deadline ? (dayDiff(b.deadline) ?? Infinity) : Infinity;
    if (ad !== bd) return ad - bd;
    return (a.pos || 0) - (b.pos || 0);
  });
}

export function clusterProgress(clusterId: number, tasks: RemoteTask[]): { done: number; total: number; pct: number } {
  const arr = tasks.filter((t) => t.cluster_id === clusterId && !t.binned && !t.cold);
  const total = arr.length;
  const done = arr.filter((t) => t.done).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

export function daysLeft(binnedAt: string | null): number {
  if (!binnedAt) return 14;
  try {
    return Math.max(0, Math.ceil((BIN_MS - (Date.now() - new Date(binnedAt).getTime())) / 86400000));
  } catch {
    return 14;
  }
}

export function isCalendarSyncable(t: RemoteTask): boolean {
  return !!t.deadline && !!t.deadline_time;
}

export function tasksByDate(tasks: RemoteTask[], clusters: RemoteCluster[]): Map<string, RemoteTask[]> {
  const map = new Map<string, RemoteTask[]>();
  tasks.forEach((t) => {
    if (!t.deadline || !isTaskLive(t, clusters)) return;
    const arr = map.get(t.deadline) || [];
    arr.push(t);
    map.set(t.deadline, arr);
  });
  map.forEach((arr) => arr.sort((a, b) => (a.deadline_time || "99:99").localeCompare(b.deadline_time || "99:99")));
  return map;
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Monday-first grid covering the whole month plus the padding days around it. */
export function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/**
 * Google Calendar's event-template URL. Only tasks with an explicit time get one — an
 * all-day placeholder for every dated task would flood the user's calendar.
 */
export function googleCalendarUrl(task: RemoteTask, clusterName: string | null): string {
  const [h, m] = (task.deadline_time || "09:00").split(":").map(Number);
  const start = new Date(`${task.deadline}T00:00:00`);
  start.setHours(h, m, 0, 0);
  const end = new Date(start.getTime() + 3600000);
  const stamp = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}T` +
    `${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}00`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: task.title || "Untitled task",
    dates: `${stamp(start)}/${stamp(end)}`,
    details: [task.notes, clusterName ? `Cluster: ${clusterName}` : ""].filter(Boolean).join("\n\n"),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
