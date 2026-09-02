"use client";

import React, { useState } from "react";
import { 
  CheckCircle2, 
  Filter, 
  Maximize2, 
  Minimize2, 
  Plus, 
  Search, 
  Sparkles, 
  X 
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import TaskCard from "../board/TaskCard";
import type { Task, Note, Priority } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ExpandedColumnModal({
  open,
  onClose,
  title,
  subtitle,
  color,
  categoryName,
  tasks,
  onToggleTask,
  onEditTask,
  onEditNotesTask,
  onDeleteTask,
  onToggleTaskStar,
  onQuickSetPriority,
  onAddTask,
  noteCount,
  mediaNotes,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  color?: string;
  categoryName?: string;
  tasks: Task[];
  onToggleTask: (id: number) => void;
  onEditTask: (id: number, directEdit?: boolean) => void;
  onEditNotesTask: (id: number) => void;
  onDeleteTask: (id: number) => void;
  onToggleTaskStar: (id: number) => void;
  onQuickSetPriority?: (id: number, priority: Priority) => void;
  onAddTask?: (title: string) => void;
  noteCount: (taskId: number) => number;
  mediaNotes: (taskId: number) => Note[];
}) {
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState<"all" | "active" | "completed">("all");
  const [quickTitle, setQuickTitle] = useState("");

  if (!open) return null;

  const filteredTasks = tasks.filter((t) => {
    if (filterState === "active" && t.done) return false;
    if (filterState === "completed" && !t.done) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = (t.title || "").toLowerCase().includes(q);
      const matchNotes = (t.notes || "").toLowerCase().includes(q);
      return matchTitle || matchNotes;
    }
    return true;
  });

  const completedCount = tasks.filter((t) => t.done).length;
  const progressPct = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quickTitle.trim() || !onAddTask) return;
    onAddTask(quickTitle.trim());
    setQuickTitle("");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[94vw] sm:max-w-4xl lg:max-w-5xl gap-0 p-0 overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141417] shadow-2xl text-neutral-900 dark:text-neutral-100 max-h-[90vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 gap-3">
          <div className="flex items-center gap-3">
            {color && (
              <span
                className="size-4 rounded-full shrink-0 ring-2 ring-black/10 dark:ring-white/20 shadow-xs"
                style={{ backgroundColor: color }}
              />
            )}
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                  {title}
                </DialogTitle>
                {categoryName && (
                  <span className="px-2 py-0.5 text-xs font-mono font-bold uppercase tracking-wider rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                    {categoryName}
                  </span>
                )}
                <span className="rounded-full border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 text-xs font-mono font-bold text-neutral-700 dark:text-neutral-300">
                  {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
                </span>
              </div>
              {subtitle && (
                <DialogDescription className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {subtitle}
                </DialogDescription>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Progress bar */}
            {tasks.length > 0 && (
              <div className="hidden sm:flex items-center gap-2 mr-3">
                <div className="w-28 h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-bold text-neutral-500">
                  {progressPct}%
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer"
              title="Close expanded view (Esc)"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Search & Quick Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 px-6 py-3 bg-neutral-50/40 dark:bg-neutral-900/20">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/80 pl-9 pr-3.5 py-1.5 text-xs font-medium text-neutral-900 dark:text-neutral-100 outline-none placeholder:text-neutral-400 focus:border-neutral-400"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            {/* Filter pills */}
            <div className="flex rounded-xl bg-neutral-200 dark:bg-neutral-800 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterState("all")}
                className={cn(
                  "rounded-lg px-2.5 py-1 transition-all cursor-pointer",
                  filterState === "all"
                    ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                )}
              >
                All ({tasks.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterState("active")}
                className={cn(
                  "rounded-lg px-2.5 py-1 transition-all cursor-pointer",
                  filterState === "active"
                    ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                )}
              >
                Active ({tasks.length - completedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterState("completed")}
                className={cn(
                  "rounded-lg px-2.5 py-1 transition-all cursor-pointer",
                  filterState === "completed"
                    ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                )}
              >
                Done ({completedCount})
              </button>
            </div>
          </div>
        </div>

        {/* Quick Add Bar */}
        {onAddTask && (
          <div className="border-b border-neutral-200 dark:border-neutral-800 px-6 py-3 bg-neutral-50/30 dark:bg-neutral-900/10">
            <form onSubmit={handleQuickAdd} className="flex gap-2">
              <input
                type="text"
                placeholder={`Quick add task to ${title}...`}
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                className="flex-1 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3.5 py-2 text-sm font-medium text-neutral-900 dark:text-neutral-100 outline-none placeholder:text-neutral-400 focus:border-neutral-500"
              />
              <button
                type="submit"
                disabled={!quickTitle.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-neutral-900 dark:bg-white px-4 py-2 text-xs font-bold text-white dark:text-neutral-900 disabled:opacity-40 cursor-pointer shadow-xs"
              >
                <Plus className="size-4" />
                <span>Add</span>
              </button>
            </form>
          </div>
        )}

        {/* Expanded Tasks Grid / List */}
        <div className="flex-1 overflow-y-auto p-6 max-h-[calc(90vh-230px)]">
          {filteredTasks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 items-start">
              {filteredTasks.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  noteCount={noteCount(t.id)}
                  mediaNotes={mediaNotes(t.id)}
                  onToggle={onToggleTask}
                  onEdit={onEditTask}
                  onEditNotes={onEditNotesTask}
                  onDelete={onDeleteTask}
                  onToggleStar={onToggleTaskStar}
                  onQuickSetPriority={onQuickSetPriority}
                  showPriorityTriage={!t.priority || t.priority === "none"}
                />
              ))}
            </div>
          ) : (
            <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 text-center text-neutral-400">
              <Sparkles className="size-8 stroke-[1.5]" />
              <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                {search ? "No tasks matching your search" : "No tasks in this category"}
              </p>
              <p className="text-xs text-neutral-400">
                {search ? "Try clearing your search term" : "Add a task using the input above"}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

