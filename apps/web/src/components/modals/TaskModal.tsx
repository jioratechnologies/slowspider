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
  ArrowLeft,
  BookOpen
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

const PRIOS: { v: Priority; label: string; dotClass: string }[] = [
  { 
    v: "high", 
    label: "High", 
    dotClass: "bg-(ink)" 
  },
  { 
    v: "med", 
    label: "Medium", 
    dotClass: "bg-(muted)" 
  },
  { 
    v: "low", 
    label: "Low", 
    dotClass: "bg-(ink3)" 
  },
  { 
    v: "none", 
    label: "None", 
    dotClass: "bg-transparent" 
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
    setClusterId(task.cluster_id ? String(task.cluster_id) : "");
    setIsEditing(!!initialEditMode);
  }

  if (!task) return null;

  function save() {
    onSave({
      title: title.trim() || task?.title || "Untitled",
      priority,
      starred,
      deadline: deadline || null,
      deadline_time: deadline ? deadlineTime || null : null,
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
      <DialogContent showCloseButton={false} className="max-h-[92vh] sm:max-w-160 flex flex-col gap-0 p-0 overflow-hidden rounded-2xl border border-(line) bg-(panel) shadow-2xl text-(ink)">
        {/* Top Header */}
        <DialogHeader className="px-6 py-4 border-b border-(line) flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2.5">
            {assignedCluster ? (
              <span
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-mono border border-(line) bg-(panel-2) text-(muted)"
              >
                <span className="size-1.5 rounded-full" style={{ backgroundColor: assignedCluster.color }} />
                <span>{assignedCluster.name}</span>
              </span>
            ) : (
              <span className="rounded-full border border-(line) bg-(panel-2) px-2.5 py-1 text-[11px] font-mono text-(muted)">
                Floating Task
              </span>
            )}

            <button
              type="button"
              className={cn(
                "rounded-lg p-1.5 transition-all cursor-pointer",
                starred 
                  ? "text-(ink) bg-(accent-soft)" 
                  : "text-(muted) hover:text-(ink) hover:bg-(accent-soft)"
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
                className="h-8 rounded-lg border-(line) text-[12px] text-(ink) hover:bg-(accent-soft) cursor-pointer"
              >
                <Pencil className="size-3 mr-1.5 text-(muted)" />
                Edit Task
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="h-8 rounded-lg text-[12px] text-(muted) hover:text-(ink) cursor-pointer"
              >
                <ArrowLeft className="size-3 mr-1.5" />
                Back to Details
              </Button>
            )}

            <button
              type="button"
              className="rounded-lg p-1.5 text-(muted) hover:bg-(accent-soft) hover:text-(ink) transition-colors cursor-pointer"
              onClick={onClose}
            >
              <X className="size-4" />
            </button>
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0 p-6 pb-44 space-y-5">
          {!isEditing ? (
            /* ──────────────── DETAIL VIEW MODE (DEFAULT) ──────────────── */
            <div className="space-y-5 animate-in fade-in">
              {/* Task Title */}
              <div className="space-y-2">
                <div className="text-[17px] font-medium tracking-tight text-(ink) leading-snug">
                  <MathRenderer text={task.title || "Untitled Task"} />
                </div>

                {/* Metadata Badges */}
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  {/* Priority */}
                  {task.priority && task.priority !== "none" && (
                    <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-mono border border-(line) bg-(panel-2) text-(muted)">
                      <span className={cn(
                        "size-1.5 rounded-full",
                        task.priority === "high" && "bg-(ink)",
                        task.priority === "med" && "bg-(muted)",
                        task.priority === "low" && "bg-(ink3)"
                      )} />
                      <span className="capitalize">{task.priority}</span>
                    </span>
                  )}

                  {/* Deadline & Time */}
                  {task.deadline && (
                    <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-mono border border-(line) bg-(panel-2) text-(muted)">
                      <Calendar className="size-3 text-(muted)" />
                      <span>{task.deadline}</span>
                      {task.deadline_time && <span>{task.deadline_time}</span>}
                    </span>
                  )}

                  {/* Status */}
                  <span className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-mono border",
                    task.done
                      ? "bg-(accent-soft) text-(ink) border-(ink)"
                      : "bg-(panel-2) text-(muted) border-(line)"
                  )}>
                    <Check className="size-3" />
                    <span>{task.done ? "Completed" : "In Progress"}</span>
                  </span>
                </div>
              </div>

              {/* Link Preview Card */}
              {urlInTask && (
                <div className="space-y-1.5">
                  <span className="text-[10.5px] font-mono uppercase text-(muted) font-semibold">
                    Linked Resource
                  </span>
                  <LinkPreviewCard url={urlInTask} fallbackTitle={task.title} allowToggle={false} defaultExpanded={true} />
                </div>
              )}

              {/* Milestones Section */}
              <div className="space-y-2.5 rounded-xl border border-(line) bg-(panel-2) p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="size-3.5 text-(muted)" />
                    <span className="text-[12.5px] font-medium text-(ink)">
                      Milestones ({completedMilestones}/{totalMilestones})
                    </span>
                  </div>
                  {totalMilestones > 0 && (
                    <span className="text-[10.5px] font-mono text-(muted)">
                      {milestonePct}% Complete
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                {totalMilestones > 0 && (
                  <div className="h-[2px] w-full overflow-hidden rounded-full bg-(sunken)">
                    <div
                      className="h-full bg-(ink) transition-all duration-300 rounded-full"
                      style={{ width: `${milestonePct}%` }}
                    />
                  </div>
                )}

                {/* Milestones Checklist */}
                <div className="space-y-1.5 pt-0.5">
                  {task.milestones?.length ? (
                    task.milestones.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => onToggleMilestone(m.id)}
                        className="flex items-center gap-2.5 rounded-lg border border-(line) bg-(bg) p-2 transition-all hover:border-(line-strong) cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={m.done}
                          onChange={() => {}}
                          className="size-3.5 shrink-0 cursor-pointer accent-(ink)"
                        />
                        <span className={cn(
                          "text-[12.5px] text-(ink) flex-1",
                          m.done && "line-through text-(muted)"
                        )}>
                          {m.title}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-[11.5px] text-(muted) italic py-1">
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
                    className="h-8.5 rounded-lg border-(line) bg-(bg) text-[12.5px]"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={addMilestone}
                    className="h-8.5 rounded-lg bg-(ink) text-(bg) px-3 cursor-pointer text-xs"
                  >
                    <Plus className="size-3 mr-1" /> Add
                  </Button>
                </div>
              </div>

              {/* Research Notes Section */}
              {task.notes && (
                <div className="space-y-2 rounded-xl border border-(line) bg-(panel-2) p-3.5">
                  <div className="flex items-center gap-2 text-(ink)">
                    <BookOpen className="size-3.5 text-(muted)" />
                    <span className="text-[12.5px] font-medium">Research Notes</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-(bg) border border-(line) text-[12.5px] text-(ink)">
                    <MathRenderer text={task.notes} />
                  </div>
                </div>
              )}

              {/* Attachments Section */}
              <div className="space-y-2 pt-0.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-(muted) block">
                  Media &amp; File Attachments
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
            /* ──────────────── EDIT MODE ──────────────── */
            <div className="space-y-4 animate-in fade-in">
              {/* Title Input */}
              <div className="space-y-1.5">
                <Label className="text-[11.5px] font-medium text-(muted)">Task Title</Label>
                <Input 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="What needs doing?" 
                  className="h-9 rounded-lg border-(line) bg-(bg) px-3 text-[13.5px] text-(ink)"
                />
                {/* Live Link Preview */}
                {(() => {
                  const urlMatch = title.match(/https?:\/\/[^\s]+/)?.[0] || (title.trim().startsWith("www.") ? `https://${title.trim()}` : null);
                  if (!urlMatch) return null;
                  return (
                    <div className="pt-1">
                      <LinkPreviewCard url={urlMatch} fallbackTitle={title} allowToggle={true} defaultExpanded={true} />
                    </div>
                  );
                })()}
              </div>

              {/* Priority Segmented Control */}
              <div className="space-y-1.5">
                <Label className="text-[11.5px] font-medium text-(muted)">Priority</Label>
                <div className="grid grid-cols-4 gap-1 p-1 rounded-lg border border-(line) bg-(panel-2)">
                  {PRIOS.map((p) => {
                    const on = priority === p.v;
                    return (
                      <button
                        key={p.v}
                        type="button"
                        className={cn(
                          "flex items-center justify-center gap-1.5 rounded-md py-1.5 text-[12px] font-mono border transition-all cursor-pointer",
                          on
                            ? "bg-(ink) text-(bg) border-(ink) font-medium"
                            : "border-transparent text-(muted) hover:text-(ink) hover:bg-(accent-soft)"
                        )}
                        onClick={() => setPriority(p.v)}
                      >
                        {p.v !== "none" && (
                          <span className={cn("size-1.5 rounded-full", on ? "bg-(bg)" : p.dotClass)} />
                        )}
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Deadline & Time */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <Label className="text-[11.5px] font-medium text-(muted) flex items-center gap-1.5">
                    <Calendar className="size-3 text-(muted)" /> Deadline
                  </Label>
                  <CustomDatePicker
                    value={deadline}
                    onChange={setDeadline}
                    placeholder="YYYY-MM-DD"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11.5px] font-medium text-(muted) flex items-center gap-1.5">
                    <Clock className="size-3 text-(muted)" /> Time
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
                <Label className="text-[11.5px] font-medium text-(muted) flex items-center gap-1.5">
                  <Folder className="size-3 text-(muted)" /> Cluster
                </Label>
                <Select value={clusterId || "none"} onValueChange={(v) => setClusterId(!v || v === "none" ? "" : v)}>
                  <SelectTrigger className="w-full h-9 rounded-lg border-(line) bg-(bg) px-3 text-[13px] text-(ink)">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-(line) bg-(panel) text-(ink) shadow-2xl">
                    <SelectItem value="none">🗒 Floating (unsorted)</SelectItem>
                    {clusters.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        <div className="flex items-center gap-2">
                          <span className="size-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                          <span>{c.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Milestones Management */}
              <div className="space-y-2">
                <Label className="text-[11.5px] font-medium text-(muted) flex items-center gap-1.5">
                  <CheckSquare className="size-3 text-(muted)" /> Milestones
                </Label>
                <div className="space-y-1.5">
                  {task.milestones?.length ? (
                    task.milestones.map((m) => (
                      <div className="flex items-center gap-2 rounded-lg border border-(line) bg-(bg) px-2.5 py-1.5" key={m.id}>
                        <input
                          className="size-3.5 shrink-0 cursor-pointer accent-(ink)"
                          type="checkbox"
                          checked={m.done}
                          onChange={() => onToggleMilestone(m.id)}
                        />
                        <input
                          className={cn(
                            "flex-1 bg-transparent text-[12.5px] text-(ink) outline-none",
                            m.done && "text-(muted) line-through"
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
                          className="rounded p-1 text-(muted) hover:text-rose-500 transition-colors cursor-pointer" 
                          onClick={() => onDeleteMilestone(m.id)}
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-(line) p-2.5 text-center text-[11.5px] text-(muted) italic">
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
                    className="h-8.5 rounded-lg border-(line) bg-(bg) text-[12.5px]"
                  />
                  <Button 
                    type="button" 
                    size="sm" 
                    onClick={addMilestone}
                    className="h-8.5 rounded-lg bg-(ink) text-(bg) px-3 cursor-pointer text-xs"
                  >
                    <Plus className="size-3 mr-1" /> Add
                  </Button>
                </div>
              </div>

              {/* Attachments Section in Edit Mode */}
              <div className="space-y-2 pt-0.5">
                <Label className="text-[11.5px] font-medium text-(muted)">Attachments &amp; Media</Label>
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
        <DialogFooter className="px-6 py-3.5 border-t border-(line) bg-(panel-2) flex-row items-center justify-between sm:justify-between shrink-0">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onDelete}
            className="rounded-lg border-(line) bg-(bg) text-(muted) hover:text-rose-500 hover:border-rose-500/30 h-8.5 px-3 text-[12px] cursor-pointer"
          >
            <Trash2 className="size-3 mr-1.5" /> Move to bin
          </Button>

          <div className="flex gap-2">
            {!isEditing ? (
              <Button 
                type="button" 
                onClick={onClose}
                className="rounded-lg bg-(ink) text-(bg) hover:opacity-90 h-8.5 px-4 text-[12px] font-medium cursor-pointer"
              >
                Close
              </Button>
            ) : (
              <>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditing(false)}
                  className="rounded-lg border-(line) text-[12px] text-(muted) hover:text-(ink) h-8.5 px-3"
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  onClick={save}
                  className="rounded-lg bg-(ink) text-(bg) hover:opacity-90 h-8.5 px-4 text-[12px] font-medium"
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
