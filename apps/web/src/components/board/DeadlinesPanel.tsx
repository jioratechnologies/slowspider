"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlarmClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { deadlineBuckets, fmtDate } from "@/lib/board-helpers";
import type { Cluster, Task } from "@/lib/types";

export default function DeadlinesPanel({
  tasks,
  clusters,
  onOpenTask,
}: {
  tasks: Task[];
  clusters: Cluster[];
  onOpenTask: (id: number, directEdit?: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const { overdue, soon, upcoming } = deadlineBuckets(tasks, clusters);
  if (!overdue.length && !soon.length && !upcoming.length) return null;

  const clusterName = (id: number | null) => clusters.find((c) => c.id === id)?.name || "Floating";
  const clusterColor = (id: number | null) => clusters.find((c) => c.id === id)?.color || "var(--none)";

  function row(t: Task, kind: "overdue" | "soon" | "up") {
    return (
      <div
        className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-accent"
        key={t.id}
        onClick={() => onOpenTask(t.id)}
      >
        <span className="size-2 shrink-0 rounded-full" style={{ background: clusterColor(t.cluster_id) }} />
        <span className="min-w-0 flex-1 truncate text-[13.5px]">{t.title}</span>
        <span
          className={cn(
            "shrink-0 text-xs font-semibold whitespace-nowrap",
            kind === "overdue" && "text-(--overdue)",
            kind === "soon" && "text-(--soon)"
          )}
        >
          {fmtDate(t.deadline)}
        </span>
        <span className="hidden shrink-0 truncate text-[11.5px] whitespace-nowrap text-muted-foreground sm:inline">
          · {clusterName(t.cluster_id)}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mb-4.5 rounded-(--radius) border border-border border-l-4 bg-card px-3.75 py-3 shadow-(--shadow)",
        overdue.length ? "border-l-(--overdue)" : "border-l-(--soon)"
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex shrink-0 items-center gap-1.5 text-[16.5px] font-semibold [font-family:var(--serif)]">
          <AlarmClock className="size-4.25 text-(--clay)" />
          Deadlines
        </span>
        <span className="flex flex-wrap gap-1.5">
          {overdue.length > 0 && (
            <span className="rounded-full px-2.5 py-0.5 text-xs text-white" style={{ background: "var(--overdue)" }}>
              {overdue.length} overdue
            </span>
          )}
          {soon.length > 0 && (
            <span className="rounded-full px-2.5 py-0.5 text-xs text-white" style={{ background: "var(--soon)" }}>
              {soon.length} due soon
            </span>
          )}
          {upcoming.length > 0 && (
            <span className="rounded-full border border-primary px-2.5 py-0.5 text-xs text-foreground">{upcoming.length} this week</span>
          )}
        </span>
        <button className="ml-auto cursor-pointer border-0 bg-transparent text-[12.5px] text-muted-foreground hover:text-primary" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Hide" : "Show"}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2.5 flex flex-col gap-0.5 pt-0.5">
              {overdue.length > 0 && (
                <>
                  <div className="mt-2 mb-0.5 px-0.5 text-[11px] font-bold tracking-wide text-(--overdue) uppercase">Overdue / missed</div>
                  {overdue.map((t) => row(t, "overdue"))}
                </>
              )}
              {soon.length > 0 && (
                <>
                  <div className="mt-2 mb-0.5 px-0.5 text-[11px] font-bold tracking-wide text-(--soon) uppercase">Due soon (next 2 days)</div>
                  {soon.map((t) => row(t, "soon"))}
                </>
              )}
              {upcoming.length > 0 && (
                <>
                  <div className="mt-2 mb-0.5 px-0.5 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Upcoming this week</div>
                  {upcoming.map((t) => row(t, "up"))}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
