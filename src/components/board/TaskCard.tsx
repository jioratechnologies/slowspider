"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  CalendarDays, 
  Clock, 
  NotebookPen, 
  Pencil, 
  Star, 
  Trash2, 
  Check, 
  Paperclip, 
  Mic, 
  Image as ImageIcon, 
  Video, 
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { dateClass, fmtDate, taskProgress } from "@/lib/board-helpers";
import type { Task, Note } from "@/lib/types";
import MathRenderer from "../research/MathRenderer";
import LinkPreviewCard from "../notes/LinkPreviewCard";

function getNoteChipStyle(note: Note) {
  if (note.kind === "voice") {
    return {
      icon: <Mic className="size-3 text-amber-400" />,
      className: "bg-amber-500/10 text-amber-300/90 border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/30",
    };
  }
  if (note.kind === "video") {
    return {
      icon: <Video className="size-3 text-purple-400" />,
      className: "bg-purple-500/10 text-purple-300/90 border-purple-500/20 hover:bg-purple-500/20 hover:border-purple-500/30",
    };
  }
  if (note.kind === "image") {
    return {
      icon: <ImageIcon className="size-3 text-sky-400" />,
      className: "bg-sky-500/10 text-sky-300/90 border-sky-500/20 hover:bg-sky-500/20 hover:border-sky-500/30",
    };
  }
  return {
    icon: <Paperclip className="size-3 text-zinc-400" />,
    className: "bg-zinc-500/10 text-zinc-300/90 border-zinc-500/20 hover:bg-zinc-500/20 hover:border-zinc-500/30",
  };
}

export default function TaskCard({
  task,
  noteCount = 0,
  mediaNotes = [],
  onToggle,
  onEdit,
  onEditNotes,
  onDelete,
  onToggleStar,
}: {
  task: Task;
  noteCount?: number;
  mediaNotes?: Note[];
  onToggle: (id: number) => void;
  onEdit: (id: number, directEdit?: boolean) => void;
  onEditNotes: (id: number) => void;
  onDelete: (id: number) => void;
  onToggleStar: (id: number) => void;
}) {
  const prio = task.priority || "none";
  const progress = task.milestones?.length ? taskProgress(task) : null;
  const dcls = task.deadline ? dateClass(task.deadline) : "";

  const titleClean = task.title 
    ? task.title.replace(/\[File:\s*[^\]]+\]/g, "").trim() 
    : "";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "card group relative flex flex-col rounded-xl border border-zinc-200/90 dark:border-white/[0.08] bg-white dark:bg-[#1c1c22] px-3 py-2.5 shadow-xs dark:shadow-[0_2px_6px_rgba(0,0,0,0.2)] transition-all duration-150",
        "hover:border-zinc-300 dark:hover:border-white/[0.2] hover:bg-zinc-50/50 dark:hover:bg-[#23232a] hover:shadow-md dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.35)]",
        task.done && "opacity-60 border-zinc-200/60 dark:border-white/[0.04] bg-zinc-50/60 dark:bg-[#18181c]/60 hover:opacity-80"
      )}
      draggable
      data-id={task.id}
      data-priority={prio}
      onClick={() => onEdit(task.id)}
    >
      {/* Main Row: Checkbox + Priority Dot + Title + Actions */}
      <div className="flex items-start gap-2">
        {/* Custom Rounded Checkbox */}
        <button
          type="button"
          onClick={() => onToggle(task.id)}
          className={cn(
            "relative mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-[5px] border transition-all duration-150",
            task.done
              ? "border-emerald-500/80 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.25)]"
              : "border-zinc-300 dark:border-white/20 bg-zinc-50/50 dark:bg-white/[0.02] text-transparent hover:border-zinc-400 dark:hover:border-white/40 hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
          )}
          aria-label={task.done ? "Mark incomplete" : "Mark complete"}
        >
          <Check className={cn("size-3 transition-transform", task.done ? "scale-100" : "scale-75 opacity-0")} strokeWidth={3} />
        </button>

        {/* Priority Indicator Dot (Red = High, Amber = Medium, Blue = Low) */}
        {prio !== "none" && (
          <span 
            className={cn(
              "mt-1.5 size-2 shrink-0 rounded-full",
              prio === "high" && "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.7)]",
              prio === "med" && "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.7)]",
              prio === "low" && "bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.7)]"
            )}
            title={`${prio.toUpperCase()} Priority`}
          />
        )}

        {/* Task Title */}
        <div 
          className="min-w-0 flex-1 cursor-pointer pt-0.5"
          onClick={() => onEdit(task.id, false)}
        >
          <div className={cn(
            "text-[13.5px] font-medium leading-[1.35] tracking-[-0.01em] break-words text-zinc-800 dark:text-zinc-200 transition-colors group-hover:text-zinc-950 dark:group-hover:text-zinc-100",
            task.done && "line-through text-zinc-400 dark:text-zinc-500 decoration-zinc-400 dark:decoration-zinc-600"
          )}>
            {titleClean ? (
              <MathRenderer text={titleClean} />
            ) : (
              <span className="text-zinc-400 dark:text-zinc-500 italic font-normal">Untitled task</span>
            )}
          </div>
        </div>

        {/* Quick Action Floating Pill (Always visible) */}
        <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-zinc-200/80 dark:border-white/10 bg-zinc-50/90 dark:bg-[#141416]/95 p-0.5 shadow-2xs backdrop-blur-md transition-all duration-150">
          <button
            type="button"
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100 transition-colors cursor-pointer"
            title="Notes"
            onClick={(e) => {
              e.stopPropagation();
              onEditNotes(task.id);
            }}
          >
            <NotebookPen className="size-3.5" />
          </button>
          <button
            type="button"
            className="rounded-md p-1 text-zinc-500 hover:bg-purple-500/10 hover:text-purple-600 dark:text-zinc-400 dark:hover:bg-purple-500/20 dark:hover:text-purple-300 transition-colors cursor-pointer"
            title="Edit Task"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task.id, true);
            }}
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            className="rounded-md p-1 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-500 dark:text-zinc-400 dark:hover:bg-rose-500/20 dark:hover:text-rose-300 transition-colors cursor-pointer"
            title="Move to bin"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
          >
            <Trash2 className="size-3.5" />
          </button>
          <button
            type="button"
            className={cn(
              "rounded-md p-1 transition-colors cursor-pointer",
              task.starred
                ? "text-amber-400 hover:bg-amber-400/10"
                : "text-zinc-400 hover:bg-zinc-200/70 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-zinc-100"
            )}
            title={task.starred ? "Unstar" : "Star"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar(task.id);
            }}
          >
            <Star className={cn("size-3.5", task.starred && "fill-current")} />
          </button>
        </div>
      </div>

      {/* Metadata & Tag Badges */}
      {(task.deadline || noteCount > 0 || mediaNotes.length > 0 || progress) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 pt-0.5">
          {/* Deadline Pill -> Opens Task Modal */}
          {task.deadline && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task.id);
              }}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium tracking-tight cursor-pointer hover:opacity-85 transition-opacity",
                dcls === "overdue" && "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25",
                dcls === "soon" && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25",
                !dcls && "bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.06]"
              )}
              title="Edit deadline"
            >
              <CalendarDays className="size-3" />
              <span>{task.deadline.slice(5)}</span>
              {task.deadline_time && <span className="font-mono text-[10px] opacity-75">{task.deadline_time}</span>}
            </button>
          )}

          {/* Text Notes Badge -> Opens Notes Modal */}
          {noteCount > 0 && (
            <button 
              type="button"
              className="inline-flex items-center gap-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 text-[10.5px] font-medium text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/15 transition-colors cursor-pointer"
              title={`${noteCount} note${noteCount > 1 ? "s" : ""} — click to open notes editor`}
              onClick={(e) => {
                e.stopPropagation();
                onEditNotes(task.id);
              }}
            >
              <NotebookPen className="size-3 text-indigo-500 dark:text-indigo-400" />
              <span>{noteCount} {noteCount === 1 ? "note" : "notes"}</span>
            </button>
          )}

          {/* Media Attachment Chips -> Opens Task Modal with full audio/media players and downloads */}
          {mediaNotes.map((note) => {
            const style = getNoteChipStyle(note);
            const displayName = note.kind === "voice" && note.body.startsWith("voice-note") 
              ? "Audio" 
              : note.body;

            return (
              <button 
                key={note.id} 
                type="button"
                className={cn(
                  "inline-flex max-w-[150px] items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-tight transition-colors cursor-pointer hover:opacity-90",
                  style.className
                )}
                title={`${displayName} — click to view attachment & details`}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(task.id);
                }}
              >
                {style.icon}
                <span className="truncate">{displayName}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Task Note Preview */}
      {task.notes && (
        <div 
          className="mt-1.5 pl-7 text-[12px] leading-relaxed text-zinc-400/80 line-clamp-2 cursor-pointer hover:text-zinc-300 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onEditNotes(task.id);
          }}
          title="Click to view notes"
        >
          <MathRenderer text={task.notes} />
        </div>
      )}

      {/* Link Preview if Title or Notes contains URL */}
      {(() => {
        const urlMatch = task.title.match(/https?:\/\/[^\s]+/)?.[0] || (task.title.trim().startsWith("www.") ? `https://${task.title.trim()}` : null) || task.notes?.match(/https?:\/\/[^\s]+/)?.[0];
        if (!urlMatch) return null;
        return (
          <div className="mt-2 sm:pl-7 w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <LinkPreviewCard url={urlMatch} fallbackTitle={task.title} allowToggle={true} defaultExpanded={false} />
          </div>
        );
      })()}

      {/* Milestone Progress Bar */}
      {progress && (
        <div 
          className="mt-2.5 flex items-center gap-2.5 sm:pl-7 cursor-pointer hover:opacity-80 transition-opacity" 
          title={`${progress.done} of ${progress.total} milestones completed — click to edit`}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(task.id);
          }}
        >
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/[0.06]">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-[width] duration-300" 
              style={{ width: `${progress.pct}%` }} 
            />
          </div>
          <span className="text-[10.5px] font-medium text-zinc-400 font-mono">
            {progress.done}/{progress.total}
          </span>
        </div>
      )}
    </motion.div>
  );
}

