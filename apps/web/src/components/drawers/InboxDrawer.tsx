"use client";

import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { 
  CheckCircle2, 
  FolderInput, 
  GripVertical,
  Inbox, 
  Plus, 
  Sparkles,
  Star, 
  Tag,
  Trash2, 
  X 
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Cluster, Priority, Task } from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function InboxDrawer({
  open,
  tasks,
  clusters,
  noteCount,
  onClose,
  onOpenTask,
  onToggleDone,
  onToggleStar,
  onDeleteTask,
  onMoveToCluster,
  onQuickAddInbox,
  onQuickSetPriority,
}: {
  open: boolean;
  tasks: Task[];
  clusters: Cluster[];
  noteCount: (id: number) => number;
  onClose: () => void;
  onOpenTask: (id: number) => void;
  onToggleDone: (id: number) => void;
  onToggleStar: (id: number) => void;
  onDeleteTask: (id: number) => void;
  onMoveToCluster: (taskId: number, clusterId: number | null) => void;
  onQuickAddInbox: (title: string) => void;
  onQuickSetPriority?: (taskId: number, priority: Priority) => void;
}) {
  const [quickText, setQuickText] = useState("");
  const [isDraggingTask, setIsDraggingTask] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    function onDragFinish() {
      setIsDraggingTask(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("dragend", onDragFinish);
    window.addEventListener("drop", onDragFinish);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("dragend", onDragFinish);
      window.removeEventListener("drop", onDragFinish);
    };
  }, [open, onClose]);

  const inboxTasks = tasks.filter((t) => t.cluster_id === null && !t.cold && !t.binned);
  const activeClusters = clusters.filter((c) => c.status === "active");

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quickText.trim()) return;
    onQuickAddInbox(quickText.trim());
    setQuickText("");
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Non-blocking on desktop / Interactive backdrop on mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isDraggingTask ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs transition-opacity duration-150 lg:hidden",
              isDraggingTask && "pointer-events-none opacity-0"
            )}
            onClick={onClose}
          />

          {/* Drawer Panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "fixed right-0 top-0 z-[100] flex h-dvh w-full max-w-[460px] flex-col border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#141417] shadow-2xl text-neutral-900 dark:text-neutral-100 transition-all",
              isDraggingTask && "opacity-75 shadow-2xl ring-2 ring-purple-500/50"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 bg-neutral-50/70 dark:bg-neutral-900/40">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/25 shadow-2xs">
                  <Inbox className="size-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                    Inbox Triage
                    <span className="rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 px-2 py-0.2 text-xs font-mono font-bold">
                      {inboxTasks.length}
                    </span>
                  </h2>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Drag items to board or 1-tap assign to organize
                  </p>
                </div>
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

            {/* Quick Capture Form */}
            <div className="border-b border-neutral-200 dark:border-neutral-800 p-4 bg-neutral-50 dark:bg-neutral-900/50">
              <form onSubmit={handleAdd} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Capture a raw thought into inbox (e.g. Test auth tomorrow #backend !high)..."
                  value={quickText}
                  onChange={(e) => setQuickText(e.target.value)}
                  className="min-w-0 flex-1 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3.5 py-2 text-xs sm:text-sm font-medium text-neutral-900 dark:text-neutral-100 outline-none placeholder:text-neutral-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
                <button
                  type="submit"
                  disabled={!quickText.trim()}
                  className="flex size-9 items-center justify-center rounded-xl bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-40 cursor-pointer shadow-xs transition-colors shrink-0 font-bold"
                >
                  <Plus className="size-4.5" />
                </button>
              </form>
            </div>

            {/* Scrollable Inbox Task List */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {inboxTasks.length > 0 ? (
                inboxTasks.map((t) => {
                  const nNotes = noteCount(t.id);
                  return (
                    <div
                      key={t.id}
                      draggable={true}
                      data-id={t.id}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", String(t.id));
                        e.dataTransfer.setData("application/slowspider-task", String(t.id));
                        document.body.setAttribute("data-dnd", "task");
                        setIsDraggingTask(true);
                      }}
                      onDragEnd={() => {
                        document.body.removeAttribute("data-dnd");
                        setIsDraggingTask(false);
                      }}
                      className="card group flex flex-col gap-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-[#18181c] p-3.5 transition-all shadow-2xs hover:border-purple-500/50 hover:shadow-md cursor-grab active:cursor-grabbing select-none"
                    >
                      {/* Card Header & Title */}
                      <div className="flex items-start gap-2.5">
                        <div
                          className="mt-1 text-neutral-400 group-hover:text-purple-500 transition-colors cursor-grab"
                          title="Drag this card and drop it onto any cluster or workflow column on the board"
                        >
                          <GripVertical className="size-4" />
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleDone(t.id);
                          }}
                          className={cn(
                            "mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full border transition-all cursor-pointer",
                            t.done
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-neutral-400 bg-transparent text-transparent hover:border-neutral-600"
                          )}
                        >
                          <CheckCircle2 className="size-3.5 stroke-[2.5]" />
                        </button>

                        <div
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => onOpenTask(t.id)}
                        >
                          <p className={cn("text-sm font-semibold text-neutral-900 dark:text-neutral-100 leading-snug", t.done && "line-through text-neutral-400")}>
                            {t.title || "Untitled task"}
                          </p>
                          {t.notes && (
                            <p className="mt-1 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
                              {t.notes}
                            </p>
                          )}
                        </div>

                        {/* Top Actions: Star, Delete */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onToggleStar(t.id)}
                            className={cn(
                              "rounded-lg p-1.5 transition-colors cursor-pointer",
                              t.starred ? "text-amber-500 bg-amber-500/10" : "text-neutral-400 hover:text-amber-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            )}
                            title={t.starred ? "Unstar" : "Star"}
                          >
                            <Star className={cn("size-3.5", t.starred && "fill-current")} />
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteTask(t.id)}
                            className="rounded-lg p-1.5 text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Move to Bin"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Triage Action Ribbon */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                        {/* 1-Click Cluster Assign Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-600 dark:text-purple-300 hover:bg-purple-500/20 outline-none transition-colors cursor-pointer shadow-2xs">
                            <FolderInput className="size-3.5" />
                            <span>Assign Cluster</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="min-w-56 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#18181c] p-1.5 text-neutral-900 dark:text-neutral-100 shadow-2xl">
                            <div className="px-2.5 py-1 text-[10.5px] font-mono uppercase font-bold text-neutral-400">
                              Choose Destination Cluster
                            </div>
                            {activeClusters.map((c) => (
                              <DropdownMenuItem
                                key={c.id}
                                onClick={() => onMoveToCluster(t.id, c.id)}
                                className="px-2.5 py-2 text-xs font-medium cursor-pointer rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800"
                              >
                                <span
                                  className="mr-2.5 size-2.5 rounded-full shrink-0 shadow-xs"
                                  style={{ background: c.color }}
                                />
                                <span className="truncate font-semibold">{c.name}</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Quick Priority Selector Chips */}
                        {onQuickSetPriority && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onQuickSetPriority(t.id, t.priority === "high" ? "none" : "high")}
                              className={cn(
                                "rounded-lg px-2 py-0.5 text-[11px] font-bold font-mono transition-colors cursor-pointer border",
                                t.priority === "high"
                                  ? "bg-rose-500 text-white border-rose-600"
                                  : "text-neutral-400 hover:text-rose-500 border-neutral-200 dark:border-neutral-800"
                              )}
                              title="Set High Priority"
                            >
                              ! High
                            </button>
                            <button
                              type="button"
                              onClick={() => onQuickSetPriority(t.id, t.priority === "med" ? "none" : "med")}
                              className={cn(
                                "rounded-lg px-2 py-0.5 text-[11px] font-bold font-mono transition-colors cursor-pointer border",
                                t.priority === "med"
                                  ? "bg-amber-500 text-white border-amber-600"
                                  : "text-neutral-400 hover:text-amber-500 border-neutral-200 dark:border-neutral-800"
                              )}
                              title="Set Medium Priority"
                            >
                              ! Med
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex h-56 flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 text-center text-neutral-400 p-6">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 text-purple-500">
                    <Sparkles className="size-6" />
                  </div>
                  <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">All thoughts triaged!</p>
                  <p className="text-xs text-neutral-400 max-w-64">
                    Capture raw notes using the input above or leave cluster blank in QuickAdd.
                  </p>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
