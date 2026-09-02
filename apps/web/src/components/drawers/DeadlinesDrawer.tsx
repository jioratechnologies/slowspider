"use client";

import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CalendarDays, CheckCircle2, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { deadlineBuckets, fmtDate } from "@/lib/board-helpers";
import type { Cluster, Task } from "@/lib/types";

export default function DeadlinesDrawer({
  open,
  tasks,
  clusters,
  onClose,
  onOpenTask,
  onToggleDone,
}: {
  open: boolean;
  tasks: Task[];
  clusters: Cluster[];
  onClose: () => void;
  onOpenTask: (id: number) => void;
  onToggleDone: (id: number) => void;
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const { overdue, soon, upcoming } = deadlineBuckets(tasks, clusters);
  const clusterName = (id: number | null) => clusters.find((c) => c.id === id)?.name || "Floating";
  const clusterColor = (id: number | null) => clusters.find((c) => c.id === id)?.color || "#94A3B8";

  function renderTaskRow(t: Task, kind: "overdue" | "soon" | "up") {
    return (
      <div
        key={t.id}
        className={cn(
          "group flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-all shadow-2xs",
          kind === "overdue" && "border-l-4 border-l-rose-500 border-neutral-200 dark:border-neutral-700 bg-rose-500/5 dark:bg-rose-500/10",
          kind === "soon" && "border-l-4 border-l-amber-500 border-neutral-200 dark:border-neutral-700 bg-amber-500/5 dark:bg-amber-500/10",
          kind === "up" && "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/80 hover:border-neutral-400"
        )}
      >
        <div
          className="flex min-w-0 flex-1 cursor-pointer items-start gap-3"
          onClick={() => onOpenTask(t.id)}
        >
          <span
            className="mt-1.5 size-2.5 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/20"
            style={{ background: clusterColor(t.cluster_id) }}
          />
          <div className="min-w-0 flex-1">
            <p className={cn("text-sm font-semibold text-neutral-900 dark:text-neutral-100 leading-snug", t.done && "line-through text-neutral-400 dark:text-neutral-500")}>
              {t.title || "Untitled task"}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-mono font-medium text-neutral-500 dark:text-neutral-400">
              <span
                className={cn(
                  "font-bold",
                  kind === "overdue" && "text-rose-600 dark:text-rose-400",
                  kind === "soon" && "text-amber-600 dark:text-amber-400",
                  kind === "up" && "text-blue-600 dark:text-blue-400"
                )}
              >
                {fmtDate(t.deadline)} {t.deadline_time ? `@ ${t.deadline_time}` : ""}
              </span>
              <span>· {clusterName(t.cluster_id)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleDone(t.id);
            }}
            className={cn(
              "rounded-lg p-2 transition-colors cursor-pointer text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700",
              t.done && "text-emerald-500"
            )}
            title={t.done ? "Mark incomplete" : "Mark complete"}
          >
            <CheckCircle2 className="size-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-0 top-0 z-[100] flex h-dvh w-full max-w-[480px] flex-col border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#141417] shadow-2xl text-neutral-900 dark:text-neutral-100"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 bg-neutral-50/50 dark:bg-neutral-900/30">
              <div className="flex items-center gap-2.5">
                <CalendarDays className="size-5 text-rose-500" />
                <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  Deadlines & Timeline
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Overdue Section */}
              {overdue.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    <AlertCircle className="size-4" />
                    <span>Overdue ({overdue.length})</span>
                  </div>
                  <div className="space-y-2.5">
                    {overdue.map((t) => renderTaskRow(t, "overdue"))}
                  </div>
                </div>
              )}

              {/* Due Today / Soon Section */}
              {soon.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    <Clock className="size-4" />
                    <span>Due Soon ({soon.length})</span>
                  </div>
                  <div className="space-y-2.5">
                    {soon.map((t) => renderTaskRow(t, "soon"))}
                  </div>
                </div>
              )}

              {/* Upcoming Section */}
              {upcoming.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    <CalendarDays className="size-4" />
                    <span>Upcoming ({upcoming.length})</span>
                  </div>
                  <div className="space-y-2.5">
                    {upcoming.map((t) => renderTaskRow(t, "up"))}
                  </div>
                </div>
              )}

              {overdue.length === 0 && soon.length === 0 && upcoming.length === 0 && (
                <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 text-center text-neutral-400">
                  <CalendarDays className="size-8 stroke-[1.5]" />
                  <p className="text-sm font-medium">No deadlines scheduled</p>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
