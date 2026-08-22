"use client";

import { useState } from "react";
import { 
  Plus, 
  Star, 
  Trash2, 
  X, 
  Calendar, 
  Clock, 
  Folder, 
  CheckSquare, 
  Pencil, 
  Check, 
  Sparkles, 
  ArrowLeft,
  ExternalLink,
  BookOpen,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TaskAttachmentsSection from "@/components/board/TaskAttachmentsSection";
import type { NewNote } from "@/components/notes/NotesPanel";
import type { Cluster, Note, Priority, Task } from "@/lib/types";
import { CustomDatePicker, CustomTimePicker } from "@/components/ui/custom-pickers";
import LinkPreviewCard from "@/components/notes/LinkPreviewCard";
import MathRenderer from "@/components/research/MathRenderer";

const PRIOS: { v: Priority; label: string; activeClass: string; dotClass: string }[] = [
  { 
    v: "high", 
    label: "High", 
    activeClass: "bg-rose-500/15 text-rose-300 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.15)] font-medium",
    dotClass: "bg-rose-500" 
  },
  { 
    v: "med", 
    label: "Medium", 
    activeClass: "bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)] font-medium",
    dotClass: "bg-amber-500" 
  },
  { 
    v: "low", 
    label: "Low", 
    activeClass: "bg-blue-500/15 text-blue-300 border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.15)] font-medium",
    dotClass: "bg-blue-500" 
  },
  { 
    v: "none", 
    label: "None", 
    activeClass: "bg-white/10 text-zinc-200 border-white/20 font-medium",
    dotClass: "bg-zinc-500" 
  },
];

export interface TaskPatch {
  title: string;
  priority: Priority;
  starred: boolean;
  deadline: string | null;
  deadline_time: string | null;
  cluster_id: number | null;
}

export default function TaskModal({
  task,
  clusters,
  notes: taskNotes,
  currentUserId,
  storageUsed,
  onClose,
  onSave,
  onDelete,
  onAddMilestone,
  onToggleMilestone,
  onRenameMilestone,
  onDeleteMilestone,
  onAddNote,
  onDeleteNote,
  initialEditMode,
}: {
  task: Task | null;
  clusters: Cluster[];
  notes: Note[];
  currentUserId: string;
  storageUsed: number;
  storageLimit?: number;
  onClose: () => void;
  onSave: (patch: TaskPatch) => void;
  onDelete: () => void;
  onAddMilestone: (title: string) => void;
  onToggleMilestone: (id: number) => void;
  onRenameMilestone: (id: number, title: string) => void;
  onDeleteMilestone: (id: number) => void;
  onAddNote: (note: NewNote) => Promise<void>;
  onDeleteNote: (id: number) => void;
  initialEditMode?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(!!initialEditMode);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("none");
  const [starred, setStarred] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("");
  const [clusterId, setClusterId] = useState("");
  const [msInput, setMsInput] = useState("");

  const [loadedTaskId, setLoadedTaskId] = useState<number | null>(null);
  if (task && task.id !== loadedTaskId) {
    setLoadedTaskId(task.id);
    setTitle(task.title || "");
    setPriority(task.priority || "none");
    setStarred(!!task.starred);
    setDeadline(task.deadline || "");
    setDeadlineTime(task.deadline_time || "");
    setClusterId(task.cluster_id != null ? String(task.cluster_id) : "");
    setMsInput("");
    setIsEditing(!!initialEditMode);
  }

  if (!task) {
    if (loadedTaskId !== null) setLoadedTaskId(null);
    return null;
  }

  function save() {
    onSave({
      title: title.trim() || task!.title,
      priority,
      starred,
      deadline: deadline || null,
      deadline_time: deadline && deadlineTime ? deadlineTime : null,
      cluster_id: clusterId ? Number(clusterId) : null,
    });
    setIsEditing(false);
  }

  function addMilestone() {
    const v = msInput.trim();
    if (!v) return;
    onAddMilestone(v);
    setMsInput("");
  }

  const assignedCluster = clusters.find((c) => c.id === (task.cluster_id || Number(clusterId))) || null;
  const urlInTask = (title.match(/https?:\/\/[^\s]+/)?.[0] || (title.trim().startsWith("www.") ? `https://${title.trim()}` : null)) || task.notes?.match(/https?:\/\/[^\s]+/)?.[0];
  
  const completedMilestones = task.milestones?.filter((m) => m.done).length || 0;
  const totalMilestones = task.milestones?.length || 0;
  const milestonePct = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className="max-h-[92vh] sm:max-w-160 flex flex-col gap-0 p-0 overflow-hidden rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#16161c] shadow-2xl backdrop-blur-2xl text-zinc-900 dark:text-zinc-100">
        {/* Top Navigation Header */}
        <DialogHeader className="px-6 py-4 border-b border-zinc-100 dark:border-white/[0.08] flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2.5">
            {assignedCluster ? (
              <span
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold border"
                style={{
                  color: assignedCluster.color,
                  borderColor: `${assignedCluster.color}40`,
                  backgroundColor: `${assignedCluster.color}15`,
                }}
              >
                <span className="size-2 rounded-full" style={{ backgroundColor: assignedCluster.color }} />
                <span>{assignedCluster.name}</span>
              </span>
            ) : (
              <span className="rounded-full bg-zinc-100 dark:bg-white/[0.06] px-2.5 py-1 text-[11.5px] font-medium text-zinc-500">
                Floating Task
              </span>
            )}

            <button
              type="button"
              className={cn(
                "rounded-lg p-1.5 transition-all duration-150 cursor-pointer",
                starred 
                  ? "text-amber-500 bg-amber-500/10 shadow-[0_0_8px_rgba(251,191,36,0.2)]" 
                  : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-white/[0.06]"
              )}
              title={starred ? "Starred" : "Star task"}
              onClick={() => setStarred((v) => !v)}
            >
              <Star className="size-4" fill={starred ? "currentColor" : "none"} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-8 rounded-xl border-zinc-200 dark:border-white/10 text-[12.5px] text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10 cursor-pointer"
              >
                <Pencil className="size-3.5 mr-1.5 text-purple-500" />
                Edit Task
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="h-8 rounded-xl text-[12.5px] text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              >
                <ArrowLeft className="size-3.5 mr-1.5" />
                Back to Details
              </Button>
            )}

            <button
              type="button"
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100 transition-colors"
              onClick={onClose}
            >
              <X className="size-4" />
            </button>
          </div>
        </DialogHeader>

        {/* Scrollable Content with generous bottom padding for calendar/clock popovers */}
        <div className="flex-1 overflow-y-auto min-h-0 p-6 pb-44 space-y-6">
          {!isEditing ? (
            /* ──────────────── DETAIL VIEW MODE (DEFAULT) ──────────────── */
            <div className="space-y-6 animate-in fade-in">
              {/* Task Title with KaTeX rendering */}
              <div className="space-y-2">
                <div className="text-[19px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-snug">
                  <MathRenderer text={task.title || "Untitled Task"} />
                </div>

                {/* Metadata Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {/* Priority */}
                  {task.priority && task.priority !== "none" && (
                    <span className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11.5px] font-semibold border",
                      task.priority === "high" && "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
                      task.priority === "med" && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                      task.priority === "low" && "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                    )}>
                      <span className={cn(
                        "size-1.5 rounded-full",
                        task.priority === "high" && "bg-rose-500",
                        task.priority === "med" && "bg-amber-500",
                        task.priority === "low" && "bg-blue-500"
                      )} />
                      <span className="capitalize">{task.priority} Priority</span>
                    </span>
                  )}

                  {/* Deadline & Time */}
                  {task.deadline && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11.5px] font-medium border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] text-zinc-700 dark:text-zinc-300 font-mono">
                      <Calendar className="size-3 text-purple-500" />
                      <span>{task.deadline}</span>
                      {task.deadline_time && <span>at {task.deadline_time}</span>}
                    </span>
                  )}

                  {/* Status */}
                  <span className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11.5px] font-medium border",
                    task.done
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/10"
                  )}>
                    <Check className="size-3" />
                    <span>{task.done ? "Completed" : "In Progress"}</span>
                  </span>
                </div>
              </div>

              {/* Uncollapsed Link Preview Card */}
              {urlInTask && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono uppercase text-zinc-400 dark:text-zinc-500 font-semibold">
                    Linked Resource
                  </span>
                  <LinkPreviewCard url={urlInTask} fallbackTitle={task.title} allowToggle={false} defaultExpanded={true} />
                </div>
              )}

              {/* Milestones Section */}
              <div className="space-y-3 rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50/60 dark:bg-white/[0.02] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="size-4 text-emerald-500" />
                    <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
                      Milestones ({completedMilestones}/{totalMilestones})
                    </span>
                  </div>
                  {totalMilestones > 0 && (
                    <span className="text-[11.5px] font-mono text-zinc-500 font-medium">
                      {milestonePct}% Complete
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                {totalMilestones > 0 && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
                      style={{ width: `${milestonePct}%` }}
                    />
                  </div>
                )}

                {/* Interactive Milestones Checklist */}
                <div className="space-y-1.5 pt-1">
                  {task.milestones?.length ? (
                    task.milestones.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => onToggleMilestone(m.id)}
                        className="flex items-center gap-2.5 rounded-xl border border-zinc-200/60 dark:border-white/[0.04] bg-white dark:bg-[#1a1a22] p-2.5 transition-all hover:bg-zinc-100/70 dark:hover:bg-white/[0.05] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={m.done}
                          onChange={() => {}}
                          className="size-4 shrink-0 cursor-pointer rounded-md border-zinc-300 dark:border-white/20 text-emerald-500 focus:ring-0"
                        />
                        <span className={cn(
                          "text-[13px] text-zinc-800 dark:text-zinc-200 flex-1",
                          m.done && "line-through text-zinc-400 dark:text-zinc-500"
                        )}>
                          {m.title}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-[12.5px] text-zinc-400 dark:text-zinc-500 italic py-1">
                      No milestones created yet.
                    </div>
                  )}
                </div>

                {/* Inline Milestone Adder */}
                <div className="flex gap-2 pt-1">
                  <Input
                    placeholder="Add a new milestone..."
                    value={msInput}
                    onChange={(e) => setMsInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addMilestone();
                      }
                    }}
                    className="h-9 rounded-xl border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-[13px]"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={addMilestone}
                    className="h-9 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-3 cursor-pointer"
                  >
                    <Plus className="size-3.5 mr-1" /> Add
                  </Button>
                </div>
              </div>

              {/* Research Notes Section */}
              {task.notes && (
                <div className="space-y-2 rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50/60 dark:bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                    <BookOpen className="size-4 text-purple-500" />
                    <span className="text-[13px] font-semibold">Research Notes</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-[#1a1a22] border border-zinc-200/60 dark:border-white/[0.04] text-[13px] text-zinc-800 dark:text-zinc-200">
                    <MathRenderer text={task.notes} />
                  </div>
                </div>
              )}

              {/* Full Uncollapsed Attachments Section */}
              <div className="space-y-2 pt-1">
                <span className="text-[12px] font-semibold uppercase tracking-wider font-mono text-zinc-400 dark:text-zinc-500 block">
                  Media & File Attachments
                </span>
                <TaskAttachmentsSection
                  taskId={task.id}
                  attachments={taskNotes.filter((n) => ["image","video","voice","file"].includes(n.kind))}
                  storageUsed={storageUsed}
                  currentUserId={currentUserId}
                  onAdd={onAddNote}
                  onDelete={onDeleteNote}
                />
              </div>
            </div>
          ) : (
            /* ──────────────── EDIT MODE (FULL FIELDS RESTORED) ──────────────── */
            <div className="space-y-5 animate-in fade-in">
              {/* Title Input */}
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400">Task Title</Label>
                <Input 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="What needs doing?" 
                  className="h-10 rounded-xl border-zinc-200 dark:border-white/[0.08] bg-zinc-50/60 dark:bg-white/[0.03] px-3.5 text-[14px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-zinc-400 dark:focus:border-white/20 focus:bg-white dark:focus:bg-white/[0.05] focus:ring-0 transition-all"
                />
                {/* Live Link Preview in Edit Mode */}
                {(() => {
                  const urlMatch = title.match(/https?:\/\/[^\s]+/)?.[0] || (title.trim().startsWith("www.") ? `https://${title.trim()}` : null);
                  if (!urlMatch) return null;
                  return (
                    <div className="pt-1.5">
                      <LinkPreviewCard url={urlMatch} fallbackTitle={title} allowToggle={true} defaultExpanded={true} />
                    </div>
                  );
                })()}
              </div>

              {/* Priority Segmented Control */}
              <div className="space-y-2">
                <Label className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400">Priority</Label>
                <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl border border-zinc-200 dark:border-white/[0.06] bg-zinc-50 dark:bg-white/[0.02]">
                  {PRIOS.map((p) => {
                    const on = priority === p.v;
                    return (
                      <button
                        key={p.v}
                        type="button"
                        className={cn(
                          "flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12.5px] text-zinc-600 dark:text-zinc-400 border border-transparent transition-all duration-150 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:text-zinc-200 dark:hover:bg-white/[0.03] cursor-pointer",
                          on && p.activeClass
                        )}
                        onClick={() => setPriority(p.v)}
                      >
                        {p.v !== "none" && (
                          <span className={cn("size-1.5 rounded-full", p.dotClass)} />
                        )}
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Deadline & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-zinc-400 dark:text-zinc-500" /> Deadline
                  </Label>
                  <CustomDatePicker
                    value={deadline}
                    onChange={setDeadline}
                    placeholder="YYYY-MM-DD"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <Clock className="size-3.5 text-zinc-400 dark:text-zinc-500" /> Time
                  </Label>
                  <CustomTimePicker
                    value={deadlineTime}
                    disabled={!deadline}
                    onChange={setDeadlineTime}
                    placeholder="HH:MM"
                  />
                </div>
              </div>

              {/* Cluster Destination */}
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Folder className="size-3.5 text-zinc-400 dark:text-zinc-500" /> Cluster
                </Label>
                <Select value={clusterId || "none"} onValueChange={(v) => setClusterId(!v || v === "none" ? "" : v)}>
                  <SelectTrigger className="w-full h-10 rounded-xl border-zinc-200 dark:border-white/[0.08] bg-zinc-50/60 dark:bg-white/[0.03] px-3.5 text-[13.5px] text-zinc-800 dark:text-zinc-200 focus:border-zinc-400 dark:focus:border-white/20 focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#1c1c22] text-zinc-900 dark:text-zinc-200 shadow-2xl backdrop-blur-2xl">
                    <SelectItem value="none">🗒 Floating (unsorted)</SelectItem>
                    {clusters.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full" style={{ backgroundColor: c.color }} />
                          <span>{c.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Milestones Management */}
              <div className="space-y-2">
                <Label className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <CheckSquare className="size-3.5 text-zinc-400 dark:text-zinc-500" /> Milestones
                </Label>
                <div className="space-y-1.5">
                  {task.milestones?.length ? (
                    task.milestones.map((m) => (
                      <div className="flex items-center gap-2.5 rounded-xl border border-zinc-200 dark:border-white/[0.06] bg-zinc-50 dark:bg-white/[0.02] px-3 py-1.5" key={m.id}>
                        <input
                          className="size-4 shrink-0 cursor-pointer rounded-[4px] text-emerald-500 focus:ring-0"
                          type="checkbox"
                          checked={m.done}
                          onChange={() => onToggleMilestone(m.id)}
                        />
                        <input
                          className={cn(
                            "flex-1 bg-transparent text-[13px] text-zinc-800 dark:text-zinc-200 outline-none",
                            m.done && "text-zinc-400 dark:text-zinc-500 line-through"
                          )}
                          type="text"
                          defaultValue={m.title}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v && v !== m.title) onRenameMilestone(m.id, v);
                          }}
                        />
                        <button 
                          type="button" 
                          className="rounded-md p-1 text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer" 
                          onClick={() => onDeleteMilestone(m.id)}
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-zinc-200 dark:border-white/[0.06] p-3 text-center text-[12px] text-zinc-400 dark:text-zinc-500 italic">
                      No milestones yet. Add steps to track progress.
                    </div>
                  )}
                </div>

                {/* Add milestone inline */}
                <div className="flex gap-2 pt-1">
                  <Input
                    placeholder="Add a milestone..."
                    value={msInput}
                    onChange={(e) => setMsInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addMilestone();
                      }
                    }}
                    className="h-9 rounded-xl border-zinc-200 dark:border-white/[0.08] bg-zinc-50/60 dark:bg-white/[0.03] text-[13px]"
                  />
                  <Button 
                    type="button" 
                    size="sm" 
                    onClick={addMilestone}
                    className="h-9 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-3 cursor-pointer"
                  >
                    <Plus className="size-3.5 mr-1" /> Add
                  </Button>
                </div>
              </div>

              {/* Attachments Section in Edit Mode */}
              <div className="space-y-2 pt-1">
                <Label className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400">Attachments & Media</Label>
                <TaskAttachmentsSection
                  taskId={task.id}
                  attachments={taskNotes.filter((n) => ["image","video","voice","file"].includes(n.kind))}
                  storageUsed={storageUsed}
                  currentUserId={currentUserId}
                  onAdd={onAddNote}
                  onDelete={onDeleteNote}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-zinc-100 dark:border-white/[0.08] bg-zinc-50/60 dark:bg-[#141417] flex-row items-center justify-between sm:justify-between shrink-0">
          <Button 
            type="button" 
            variant="destructive" 
            onClick={onDelete}
            className="rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 hover:text-rose-700 dark:hover:text-rose-200 h-9 px-3.5 text-[13px] cursor-pointer"
          >
            <Trash2 className="size-3.5 mr-1.5" /> Move to bin
          </Button>

          <div className="flex gap-2">
            {!isEditing ? (
              <Button 
                type="button" 
                onClick={onClose}
                className="rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white h-9 px-5 text-[13px] font-medium shadow-sm transition-all cursor-pointer"
              >
                Close
              </Button>
            ) : (
              <>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl border-zinc-200 dark:border-white/[0.08] text-[13px]"
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  onClick={save}
                  className="rounded-xl bg-purple-600 text-white hover:bg-purple-700 h-9 px-5 text-[13px] font-medium shadow-sm transition-all"
                >
                  Save Changes
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
