"use client";

import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Folder,
  Layers,
  NotebookPen,
  Paperclip,
  Pencil,
  Plus,
  Snowflake,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Cluster, Note, Priority, Task } from "@/lib/types";
import type { NewNote } from "@/components/notes/NotesPanel";
import { CustomDatePicker, CustomTimePicker } from "@/components/ui/custom-pickers";
import TaskAttachmentsSection from "@/components/board/TaskAttachmentsSection";
import NotesPanel from "@/components/notes/NotesPanel";
import MathRenderer from "@/components/research/MathRenderer";
import type { RealtimeDocChannel } from "@/hooks/useRealtimeBoard";

export interface TaskPatch {
  title: string;
  priority: Priority;
  starred: boolean;
  deadline: string | null;
  deadline_time: string | null;
  cluster_id: number | null;
}

const PRIORITY_OPTIONS: { v: Priority; label: string; dot: string; activeClass: string }[] = [
  { v: "high", label: "High", dot: "bg-rose-500", activeClass: "border-rose-500/50 bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold" },
  { v: "med", label: "Medium", dot: "bg-amber-500", activeClass: "border-amber-500/50 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold" },
  { v: "low", label: "Low", dot: "bg-blue-500", activeClass: "border-blue-500/50 bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold" },
  { v: "none", label: "None", dot: "bg-neutral-400", activeClass: "border-neutral-400 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-bold" },
];

export default function TaskDetailDrawer({
  task,
  clusters,
  notes,
  currentUserId,
  storageUsed,
  docChannel,
  onClose,
  onSave,
  onToggleDone,
  onDelete,
  onFreeze,
  onAddMilestone,
  onToggleMilestone,
  onRenameMilestone,
  onDeleteMilestone,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}: {
  task: Task | null;
  clusters: Cluster[];
  notes: Note[];
  currentUserId: string;
  storageUsed: number;
  docChannel?: RealtimeDocChannel | null;
  onClose: () => void;
  onSave: (patch: TaskPatch) => void;
  onToggleDone: (id: number) => void;
  onDelete: () => void;
  onFreeze: (id: number) => void;
  onAddMilestone: (title: string) => void;
  onToggleMilestone: (id: number) => void;
  onRenameMilestone: (id: number, title: string) => void;
  onDeleteMilestone: (id: number) => void;
  onAddNote: (note: NewNote) => Promise<void>;
  onUpdateNote?: (id: number, patch: Partial<Note>) => void;
  onDeleteNote: (id: number) => void;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("none");
  const [starred, setStarred] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("");
  const [clusterId, setClusterId] = useState<number | null>(null);
  const [msInput, setMsInput] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "notes" | "attachments">("details");

  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setPriority(task.priority || "none");
      setStarred(!!task.starred);
      setDeadline(task.deadline || "");
      setDeadlineTime(task.deadline_time || "");
      setClusterId(task.cluster_id);
    }
  }, [task]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && task) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [task, onClose]);

  if (!task) return null;

  function handleBlurSave() {
    onSave({
      title: title.trim() || task?.title || "Untitled",
      priority,
      starred,
      deadline: deadline || null,
      deadline_time: deadline ? deadlineTime || null : null,
      cluster_id: clusterId,
    });
  }

  function handlePrioritySelect(p: Priority) {
    setPriority(p);
    onSave({
      title: title.trim() || task?.title || "Untitled",
      priority: p,
      starred,
      deadline: deadline || null,
      deadline_time: deadline ? deadlineTime || null : null,
      cluster_id: clusterId,
    });
  }

  function handleClusterSelect(cId: number | null) {
    setClusterId(cId);
    onSave({
      title: title.trim() || task?.title || "Untitled",
      priority,
      starred,
      deadline: deadline || null,
      deadline_time: deadline ? deadlineTime || null : null,
      cluster_id: cId,
    });
  }

  function handleAddMilestone(e: React.FormEvent) {
    e.preventDefault();
    if (!msInput.trim()) return;
    onAddMilestone(msInput.trim());
    setMsInput("");
  }

  const completedMs = task.milestones?.filter((m) => m.done).length || 0;
  const totalMs = task.milestones?.length || 0;
  const msProgressPct = totalMs > 0 ? Math.round((completedMs / totalMs) * 100) : 0;
  const activeClusters = clusters.filter((c) => c.status === "active");

  return (
    <AnimatePresence>
      {task && (
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
            className="fixed right-0 top-0 z-[100] flex h-dvh w-full max-w-[560px] flex-col border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#141417] shadow-2xl text-neutral-900 dark:text-neutral-100"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 bg-neutral-50/50 dark:bg-neutral-900/30">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => onToggleDone(task.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                    task.done
                      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold"
                      : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  )}
                >
                  <CheckCircle2 className="size-4" />
                  <span>{task.done ? "Completed" : "Mark Done"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const next = !starred;
                    setStarred(next);
                    onSave({
                      title: title.trim() || task.title,
                      priority,
                      starred: next,
                      deadline: deadline || null,
                      deadline_time: deadline ? deadlineTime || null : null,
                      cluster_id: clusterId,
                    });
                  }}
                  className={cn(
                    "rounded-xl p-2 transition-colors cursor-pointer",
                    starred ? "text-amber-500 bg-amber-500/15" : "text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  )}
                  title={starred ? "Starred" : "Star"}
                >
                  <Star className={cn("size-4.5", starred && "fill-current text-amber-500")} />
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onFreeze(task.id);
                    onClose();
                  }}
                  className="rounded-xl p-2 text-neutral-400 hover:text-blue-500 hover:bg-blue-500/10 transition-colors cursor-pointer"
                  title="Pause → Cold Store"
                >
                  <Snowflake className="size-4.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDelete();
                    onClose();
                  }}
                  className="rounded-xl p-2 text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Move to Bin"
                >
                  <Trash2 className="size-4.5" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* Task Title Input */}
              <div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleBlurSave}
                  placeholder="Task title..."
                  className="w-full border-0 bg-transparent text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 outline-none placeholder:text-neutral-400 tracking-tight"
                />
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 p-4 text-xs font-medium">
                {/* Priority */}
                <div>
                  <label className="mb-1.5 block font-mono text-xs uppercase font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
                    Priority
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {PRIORITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => handlePrioritySelect(opt.v)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-xl border px-2.5 py-1 transition-all cursor-pointer text-xs font-medium",
                          priority === opt.v
                            ? opt.activeClass
                            : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                        )}
                      >
                        <span className={cn("size-2 rounded-full", opt.dot)} />
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cluster Assignment */}
                <div>
                  <label className="mb-1.5 block font-mono text-xs uppercase font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
                    Cluster
                  </label>
                  <select
                    value={clusterId ?? ""}
                    onChange={(e) => handleClusterSelect(e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-900 dark:text-neutral-100 outline-none"
                  >
                    <option value="">Unassigned (Inbox)</option>
                    {activeClusters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Deadline Date */}
                <div>
                  <label className="mb-1.5 block font-mono text-xs uppercase font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
                    Deadline Date
                  </label>
                  <CustomDatePicker
                    value={deadline}
                    onChange={(val) => {
                      setDeadline(val);
                      onSave({
                        title: title.trim() || task.title,
                        priority,
                        starred,
                        deadline: val || null,
                        deadline_time: val ? deadlineTime || null : null,
                        cluster_id: clusterId,
                      });
                    }}
                  />
                </div>

                {/* Deadline Time */}
                <div>
                  <label className="mb-1.5 block font-mono text-xs uppercase font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
                    Deadline Time
                  </label>
                  <CustomTimePicker
                    value={deadlineTime}
                    onChange={(val) => {
                      setDeadlineTime(val);
                      onSave({
                        title: title.trim() || task.title,
                        priority,
                        starred,
                        deadline: deadline || null,
                        deadline_time: deadline ? val || null : null,
                        cluster_id: clusterId,
                      });
                    }}
                  />
                </div>
              </div>

              {/* Sub-Tabs: Details & Milestones, Notes & Docs, Attachments */}
              <div className="flex border-b border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setActiveTab("details")}
                  className={cn(
                    "flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer",
                    activeTab === "details"
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                  )}
                >
                  <CheckCircle2 className="size-4" />
                  <span>Milestones ({totalMs})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("notes")}
                  className={cn(
                    "flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer",
                    activeTab === "notes"
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                  )}
                >
                  <NotebookPen className="size-4" />
                  <span>Notes & Docs ({notes.filter((n) => n.task_id === task.id).length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("attachments")}
                  className={cn(
                    "flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer",
                    activeTab === "attachments"
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                  )}
                >
                  <Paperclip className="size-4" />
                  <span>Media</span>
                </button>
              </div>

              {/* Tab 1: Milestones Checklist */}
              {activeTab === "details" && (
                <div className="space-y-4">
                  {totalMs > 0 && (
                    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 p-3">
                      <div className="flex items-center justify-between text-xs font-mono font-bold mb-2">
                        <span className="text-neutral-500">Progress</span>
                        <span className="text-neutral-900 dark:text-neutral-100">{completedMs}/{totalMs} ({msProgressPct}%)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${msProgressPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Milestone List */}
                  <div className="space-y-2">
                    {task.milestones?.map((m) => (
                      <div
                        key={m.id}
                        className="group flex items-center gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/80 p-3 transition-colors shadow-2xs"
                      >
                        <button
                          type="button"
                          onClick={() => onToggleMilestone(m.id)}
                          className={cn(
                            "flex size-4.5 shrink-0 items-center justify-center rounded-full border transition-all cursor-pointer",
                            m.done
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-neutral-400 bg-transparent text-transparent hover:border-neutral-600"
                          )}
                        >
                          <CheckCircle2 className="size-3.5 stroke-[2.5]" />
                        </button>
                        <input
                          type="text"
                          defaultValue={m.title}
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            if (val && val !== m.title) onRenameMilestone(m.id, val);
                          }}
                          className={cn(
                            "min-w-0 flex-1 border-0 bg-transparent text-sm font-medium text-neutral-900 dark:text-neutral-100 outline-none",
                            m.done && "line-through text-neutral-400 dark:text-neutral-500"
                          )}
                        />
                        <button
                          type="button"
                          onClick={() => onDeleteMilestone(m.id)}
                          className="rounded-lg p-1.5 text-neutral-400 opacity-0 group-hover:opacity-100 hover:text-rose-500 transition-all cursor-pointer"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Milestone Form */}
                  <form onSubmit={handleAddMilestone} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a milestone step..."
                      value={msInput}
                      onChange={(e) => setMsInput(e.target.value)}
                      className="min-w-0 flex-1 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/80 px-3.5 py-2 text-sm font-medium text-neutral-900 dark:text-neutral-100 outline-none placeholder:text-neutral-400"
                    />
                    <button
                      type="submit"
                      disabled={!msInput.trim()}
                      className="flex size-9 items-center justify-center rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 disabled:opacity-40 cursor-pointer shadow-xs"
                    >
                      <Plus className="size-4.5" />
                    </button>
                  </form>
                </div>
              )}

              {/* Tab 2: Notes & Docs */}
              {activeTab === "notes" && docChannel && (
                <div>
                  <NotesPanel
                    notes={notes.filter((n) => n.task_id === task.id)}
                    currentUserId={currentUserId}
                    storageUsed={storageUsed}
                    parentLabel="task"
                    docChannel={docChannel}
                    onAdd={(n) => onAddNote({ ...n, task_id: task.id, cluster_id: null })}
                    onUpdate={onUpdateNote}
                    onDelete={onDeleteNote}
                  />
                </div>
              )}

              {/* Tab 3: Media & Attachments */}
              {activeTab === "attachments" && (
                <div>
                  <TaskAttachmentsSection
                    taskId={task.id}
                    attachments={notes.filter((n) => n.task_id === task.id)}
                    currentUserId={currentUserId}
                    storageUsed={storageUsed}
                    onAdd={(n) => onAddNote({ ...n, task_id: task.id, cluster_id: null })}
                    onDelete={onDeleteNote}
                  />
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
