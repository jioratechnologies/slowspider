"use client";

import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, ExternalLink, X, AlignLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { isCalendarSyncable, tasksByDate } from "@/lib/board-helpers";
import type { Cluster, Task } from "@/lib/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function googleCalendarUrl(task: Task, clusterName: string | null): string {
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

export default function CalendarDrawer({
  open,
  tasks,
  clusters,
  onClose,
  onOpenTask,
}: {
  open: boolean;
  tasks: Task[];
  clusters: Cluster[];
  onClose: () => void;
  onOpenTask: (id: number) => void;
}) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string>(isoDate(today));

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const byDate = tasksByDate(tasks, clusters);
  const grid = monthGrid(cursor.getFullYear(), cursor.getMonth());
  const dayTasks = byDate.get(selected) || [];
  const clusterName = (id: number | null) => (id ? clusters.find((c) => c.id === id)?.name || null : null);

  function shiftMonth(dir: 1 | -1) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + dir, 1));
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

          {/* Drawer Panel */}
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
                <CalendarDays className="size-5 text-emerald-500" />
                <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  Calendar Schedule
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

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Month Navigator Header */}
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  {cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => shiftMonth(-1)}
                    className="flex size-8 items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    title="Previous month"
                  >
                    <ChevronLeft className="size-4.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
                      setSelected(isoDate(today));
                    }}
                    className="rounded-xl border border-neutral-200 dark:border-neutral-700 px-2.5 py-1 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => shiftMonth(1)}
                    className="flex size-8 items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    title="Next month"
                  >
                    <ChevronRight className="size-4.5" />
                  </button>
                </div>
              </div>

              {/* Month Grid Matrix */}
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 p-3.5">
                <div className="grid grid-cols-7 gap-1 text-center font-mono text-xs uppercase font-bold text-neutral-400 dark:text-neutral-500 mb-2">
                  {WEEKDAYS.map((w) => (
                    <div key={w} className="py-1">
                      {w}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {grid.map((d, i) => {
                    const iso = isoDate(d);
                    const isCurMonth = d.getMonth() === cursor.getMonth();
                    const isToday = iso === isoDate(today);
                    const isSel = iso === selected;
                    const items = byDate.get(iso) || [];
                    const hasItems = items.length > 0;

                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelected(iso)}
                        className={cn(
                          "relative flex h-10 flex-col items-center justify-center rounded-xl text-xs font-semibold transition-all cursor-pointer",
                          !isCurMonth && "opacity-25",
                          isSel
                            ? "bg-blue-600 text-white font-bold shadow-sm"
                            : isToday
                            ? "border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                            : "hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                        )}
                      >
                        <span>{d.getDate()}</span>
                        {hasItems && (
                          <span
                            className={cn(
                              "mt-0.5 size-1.5 rounded-full",
                              isSel ? "bg-white" : "bg-emerald-500"
                            )}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Day Agenda */}
              <div>
                <div className="mb-3 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Agenda · {selected}
                  </span>
                  <span className="text-xs font-mono font-bold text-neutral-500">
                    {dayTasks.length} item{dayTasks.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {dayTasks.length > 0 ? (
                    dayTasks.map((t) => (
                      <div
                        key={t.id}
                        className="group flex items-center justify-between gap-3 rounded-xl border border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-neutral-800/80 p-3.5 transition-all shadow-2xs hover:border-neutral-400"
                      >
                        <div
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => onOpenTask(t.id)}
                        >
                          <p className={cn("text-sm font-semibold text-neutral-900 dark:text-neutral-100", t.done && "line-through text-neutral-400")}>
                            {t.title || "Untitled task"}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-xs font-mono text-neutral-500 dark:text-neutral-400">
                            {t.deadline_time && (
                              <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                                <Clock className="size-3.5" />
                                {t.deadline_time}
                              </span>
                            )}
                            <span>{clusterName(t.cluster_id) || "Floating"}</span>
                          </div>
                        </div>

                        {/* Google Calendar Sync link */}
                        {isCalendarSyncable(t) && (
                          <a
                            href={googleCalendarUrl(t, clusterName(t.cluster_id))}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg p-2 text-neutral-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                            title="Add to Google Calendar"
                          >
                            <ExternalLink className="size-4" />
                          </a>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="flex h-28 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 text-neutral-400">
                      <p className="text-xs font-medium">No tasks scheduled for this day</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
