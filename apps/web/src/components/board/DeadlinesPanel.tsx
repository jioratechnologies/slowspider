"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlarmClock, ChevronDown, ChevronUp } from "lucide-react";
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
  const [expanded, setExpanded] = useState(false);
  const { overdue, soon, upcoming } = deadlineBuckets(tasks, clusters);
  if (!overdue.length && !soon.length && !upcoming.length) return null;

  const clusterName = (id: number | null) => clusters.find((c) => c.id === id)?.name || "Floating";
  const clusterColor = (id: number | null) => clusters.find((c) => c.id === id)?.color || "var(--none)";

  function row(t: Task, kind: "overdue" | "soon" | "up") {
    return (
      <div
        className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 hover:bg-(accent-soft) transition-colors"
        key={t.id}
        onClick={() => onOpenTask(t.id)}
      >
        <span className="size-1.5 shrink-0 rounded-full" style={{ background: clusterColor(t.cluster_id) }} />
        <span className="min-w-0 flex-1 truncate text-[13px] text-(ink)">{t.title}</span>
        <span
          className={cn(
            "shrink-0 text-[11px] font-mono",
            kind === "overdue" && "text-rose-500 font-medium",
            kind === "soon" && "text-amber-500",
            kind === "up" && "text-(muted)"
          )}
        >
          {fmtDate(t.deadline)}
        </span>
        <span className="hidden shrink-0 truncate text-[11px] font-mono text-(muted) sm:inline">
          · {clusterName(t.cluster_id)}
        </span>
      </div>
    );
  }

  return (
    <div
      id="deadlines-panel"
      className={cn(
        "mb-4 scroll-mt-20 rounded-xl border border-(line) bg-(panel) px-3.5 py-2.5 shadow-xs transition-all",
        overdue.length && "border-l-4 border-l-rose-500"
      )}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-(ink)">
          <AlarmClock className="size-3.5 text-(muted)" />
          Deadlines
        </span>

        <div className="flex flex-wrap items-center gap-1.5">
          {overdue.length > 0 && (
            <span className="rounded-md px-2 py-0.5 text-[10.5px] font-mono font-medium text-rose-500 bg-rose-500/10 border border-rose-500/20">
              {overdue.length} overdue
            </span>
          )}
          {soon.length > 0 && (
            <span className="rounded-md px-2 py-0.5 text-[10.5px] font-mono font-medium text-amber-500 bg-amber-500/10 border border-amber-500/20">
              {soon.length} soon
            </span>
          )}
          {upcoming.length > 0 && (
            <span className="rounded-md px-2 py-0.5 text-[10.5px] font-mono text-(muted) bg-(panel-2) border border-(line)">
              {upcoming.length} this week
            </span>
          )}
        </div>

        <button
          type="button"
          className="ml-auto flex items-center gap-1 cursor-pointer border-0 bg-transparent text-[11.5px] text-(muted) hover:text-(ink) transition-colors"
          onClick={() => setExpanded((v) => !v)}
        >
          <span>{expanded ? "Collapse" : "View"}</span>
          {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2.5 flex flex-col gap-0.5 border-t border-(line) pt-2">
              {overdue.length > 0 && (
                <>
                  <div className="mt-1 mb-0.5 px-1 text-[10px] font-mono uppercase tracking-wider text-rose-500">Overdue / missed</div>
                  {overdue.map((t) => row(t, "overdue"))}
                </>
              )}
              {soon.length > 0 && (
                <>
                  <div className="mt-2 mb-0.5 px-1 text-[10px] font-mono uppercase tracking-wider text-amber-500">Due soon (next 2 days)</div>
                  {soon.map((t) => row(t, "soon"))}
                </>
              )}
              {upcoming.length > 0 && (
                <>
                  <div className="mt-2 mb-0.5 px-1 text-[10px] font-mono uppercase tracking-wider text-(muted)">Upcoming this week</div>
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
