"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarDays, Clock, Inbox, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, Cluster } from "@/lib/types";
import { deadlineBuckets } from "@/lib/board-helpers";

export default function WorkSummaryPulse({
  tasks,
  clusters,
  onOpenDeadlines,
  onOpenCalendar,
  onOpenInbox,
}: {
  tasks: Task[];
  clusters: Cluster[];
  onOpenDeadlines: () => void;
  onOpenCalendar: () => void;
  onOpenInbox: () => void;
}) {
  const { overdue, soon, upcoming } = deadlineBuckets(tasks, clusters);
  const inboxCount = tasks.filter((t) => t.cluster_id === null && !t.done && !t.binned && !t.cold).length;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const todayStr = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(new Date());
    } catch {
      return "";
    }
  }, []);

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#18181c] px-4 py-3 shadow-xs transition-all">
      {/* Left: 3-Second Work Pulse Badges */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1.5 pr-2 font-mono text-xs uppercase font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
          <Sparkles className="size-4 text-amber-500" />
          <span className="text-neutral-900 dark:text-neutral-100 font-bold">PULSE</span>
        </div>

        {/* Overdue Badge */}
        {overdue.length > 0 ? (
          <button
            type="button"
            onClick={onOpenDeadlines}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-xs font-mono font-bold text-rose-600 dark:text-rose-400 transition-all hover:bg-rose-500/25 cursor-pointer shadow-2xs"
            title={`${overdue.length} overdue task${overdue.length > 1 ? "s" : ""} — click to inspect`}
          >
            <AlertCircle className="size-4 shrink-0" />
            <span>{overdue.length} Overdue</span>
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800/60 px-3 py-1 text-xs font-mono font-medium text-neutral-400 dark:text-neutral-500">
            0 overdue
          </span>
        )}

        {/* Due Soon / Today Badge */}
        {soon.length > 0 ? (
          <button
            type="button"
            onClick={onOpenDeadlines}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 transition-all hover:bg-amber-500/25 cursor-pointer shadow-2xs"
            title={`${soon.length} task${soon.length > 1 ? "s" : ""} due today / soon — click to inspect`}
          >
            <Clock className="size-4 shrink-0" />
            <span>{soon.length} Due Soon</span>
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800/60 px-3 py-1 text-xs font-mono font-medium text-neutral-400 dark:text-neutral-500">
            0 due today
          </span>
        )}

        {/* Upcoming Badge */}
        {upcoming.length > 0 && (
          <button
            type="button"
            onClick={onOpenDeadlines}
            className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-blue-500/40 bg-blue-500/15 px-3 py-1.5 text-xs font-mono font-bold text-blue-600 dark:text-blue-400 transition-all hover:bg-blue-500/25 cursor-pointer shadow-2xs"
            title={`${upcoming.length} upcoming task${upcoming.length > 1 ? "s" : ""}`}
          >
            <span>{upcoming.length} Upcoming</span>
          </button>
        )}
      </div>

      {/* Right: Date & Quick Drawer Triggers */}
      <div className="flex items-center gap-2.5">
        {/* Inbox Quick Trigger */}
        <button
          type="button"
          onClick={onOpenInbox}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-mono font-bold transition-all cursor-pointer shadow-2xs",
            inboxCount > 0
              ? "border-purple-500/40 bg-purple-500/15 text-purple-600 dark:text-purple-300 hover:bg-purple-500/25"
              : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          )}
          title={`Inbox: ${inboxCount} unsorted tasks`}
        >
          <Inbox className="size-4 text-purple-500" />
          <span>Inbox</span>
          {inboxCount > 0 && (
            <span className="rounded-full bg-purple-600 text-white px-2 py-0.5 text-[10.5px] font-bold">
              {inboxCount}
            </span>
          )}
        </button>

        {/* Calendar Quick Trigger */}
        <button
          type="button"
          onClick={onOpenCalendar}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800/80 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-all hover:text-neutral-900 dark:hover:text-neutral-100 hover:border-neutral-400 dark:hover:border-neutral-600 cursor-pointer shadow-2xs"
          title="Open Calendar Schedule"
        >
          <CalendarDays className="size-4 text-emerald-500" />
          <span className="hidden md:inline font-mono" suppressHydrationWarning>
            {mounted ? todayStr : "Calendar"}
          </span>
          <span className="md:hidden">Cal</span>
        </button>
      </div>
    </div>
  );
}
