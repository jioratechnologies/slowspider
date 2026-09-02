"use client";

import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, ExternalLink, X, CheckSquare, AlignLeft } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { isCalendarSyncable, tasksByDate } from "@/lib/board-helpers";
import type { Cluster, Task } from "@/lib/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Sunday-first grid covering the whole month plus the padding days around it. */
function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay()); // Sunday is 0
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/**
 * Google Calendar's event-template URL. Only tasks with an explicit time get one.
 */
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

export default function CalendarPanel({
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
  onOpenTask: (id: number, directEdit?: boolean) => void;
}) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string>(isoDate(today));

  const byDate = tasksByDate(tasks, clusters);
  const grid = monthGrid(cursor.getFullYear(), cursor.getMonth());
  const dayTasks = byDate.get(selected) || [];
  const clusterName = (id: number | null) => (id ? clusters.find((c) => c.id === id)?.name || null : null);

  function shiftMonth(dir: 1 | -1) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + dir, 1));
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent 
        showCloseButton={false} 
        className="max-w-[90vw] sm:max-w-200 gap-0 p-0 overflow-hidden rounded-2xl border border-(line) bg-(panel) shadow-xl"
      >
        <DialogTitle className="sr-only">Calendar</DialogTitle>
        <div className="relative flex items-center justify-between px-6 py-4 border-b border-(line)">
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-1.5 text-(ink3) hover:bg-(panel-2) hover:text-(ink) transition-colors" title="Previous month" onClick={() => shiftMonth(-1)}>
              <ChevronLeft className="size-4" />
            </button>
            
            <h2 className="text-[19px] font-semibold text-(ink) [font-family:var(--serif)] tracking-tight">
              {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </h2>

            <button className="rounded-lg p-1.5 text-(ink3) hover:bg-(panel-2) hover:text-(ink) transition-colors" title="Next month" onClick={() => shiftMonth(1)}>
              <ChevronRight className="size-4" />
            </button>
          </div>

          <button className="rounded-lg p-1.5 text-(muted) hover:bg-(accent-soft) hover:text-(ink) transition-colors" title="Close calendar" onClick={onClose}>
            <X className="size-4" />
          </button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.3fr)_1fr]">
          {/* Left: Calendar Grid */}
          <div className="bg-(line) grid grid-cols-7 gap-px rounded-2xl overflow-hidden border border-(line)">
            {WEEKDAYS.map((w) => (
              <div key={w} className="bg-(sunken) py-2.5 text-center text-[11px] font-medium text-(muted)">
                {w}
              </div>
            ))}
            {grid.map((d) => {
              const key = isoDate(d);
              const inMonth = d.getMonth() === cursor.getMonth();
              const count = (byDate.get(key) || []).length;
              const isSelected = key === selected;
              const isToday = key === isoDate(today);
              
              return (
                <button
                  key={key}
                  onClick={() => setSelected(key)}
                  className={cn(
                    "group relative flex h-12.5 sm:h-14 w-full flex-col items-center justify-center bg-(panel) transition-colors hover:bg-(panel-2)",
                    !inMonth && "opacity-35"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 sm:size-8.5 items-center justify-center rounded-xl text-[13px] transition-all",
                      isSelected 
                        ? "bg-(ink) text-(bg) font-bold shadow-sm" 
                        : isToday 
                          ? "border border-(line-strong) text-(ink) font-semibold"
                          : "text-(ink) group-hover:text-(ink)"
                    )}
                  >
                    {d.getDate()}
                  </span>
                  {count > 0 && !isSelected && (
                    <span className="absolute bottom-1.5 size-1 rounded-full bg-(star)" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: Selected Day Tasks */}
          <div className="flex flex-col min-w-0">
            <h3 className="mb-3 text-[15px] font-semibold text-(ink) tracking-tight">
              {new Date(selected + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
            </h3>
            
            {!dayTasks.length && (
              <div className="rounded-xl border border-dashed border-(line) p-4 text-center text-[12.5px] text-(muted) italic mt-1">
                No tasks scheduled for this day.
              </div>
            )}
            
            <div className="flex flex-col gap-2 overflow-y-auto max-h-75 pr-0.5">
              {dayTasks.map((t) => (
                <div key={t.id} className="group flex items-center justify-between gap-3 rounded-xl border border-(line) bg-(panel-2) px-3.5 py-3 transition-colors hover:bg-(sunken) hover:border-(line-strong)">
                  <button className="flex min-w-0 flex-1 items-start gap-2.5 text-left" onClick={() => { onClose(); onOpenTask(t.id); }}>
                    <div className="mt-0.5 shrink-0 text-(muted)">
                      {t.deadline_time ? <Clock className="size-3.5" /> : <AlignLeft className="size-3.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] text-(ink) leading-tight">
                        {t.deadline_time ? (
                          <span className="font-medium mr-1.5 font-mono text-(muted)">{t.deadline_time} ·</span>
                        ) : null}
                        <span className={cn(t.done && "line-through text-(muted)")}>
                          {t.title || "Untitled"}
                        </span>
                      </div>
                      {clusterName(t.cluster_id) && (
                        <div className="mt-1 text-[11px] text-(muted) truncate font-mono">
                          {clusterName(t.cluster_id)}
                        </div>
                      )}
                    </div>
                  </button>
                  
                  {isCalendarSyncable(t) && (
                    <a
                      className="shrink-0 rounded-lg p-1 text-(ink3) opacity-0 group-hover:opacity-100 transition-all hover:bg-(panel-2) hover:text-(ink)"
                      href={googleCalendarUrl(t, clusterName(t.cluster_id))}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Add to Google Calendar"
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
