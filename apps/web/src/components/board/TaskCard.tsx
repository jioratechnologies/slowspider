"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  CalendarDays, 
  NotebookPen, 
  Pencil, 
  Star, 
  Trash2, 
  Check, 
  Paperclip, 
  Mic, 
  Image as ImageIcon, 
  Video, 
  Link as LinkIcon,
  Maximize2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { dateClass, fmtDate, taskProgress } from "@/lib/board-helpers";
import type { Task, Note, Priority } from "@/lib/types";
import MathRenderer from "../research/MathRenderer";
import LinkPreviewCard from "../notes/LinkPreviewCard";

function getNoteChipStyle(note: Note) {
  if (note.kind === "voice") {
    return {
      icon: <Mic className="size-3.5 text-rose-500 shrink-0" />,
      className: "text-neutral-700 dark:text-neutral-300",
    };
  }
  if (note.kind === "video") {
    return {
      icon: <Video className="size-3.5 text-purple-500 shrink-0" />,
      className: "text-neutral-700 dark:text-neutral-300",
    };
  }
  if (note.kind === "image") {
    return {
      icon: <ImageIcon className="size-3.5 text-blue-500 shrink-0" />,
      className: "text-neutral-700 dark:text-neutral-300",
    };
  }
  return {
    icon: <Paperclip className="size-3.5 text-neutral-500 shrink-0" />,
    className: "text-neutral-700 dark:text-neutral-300",
  };
}

export default function TaskCard({
  task,
  noteCount = 0,
  mediaNotes = [],
  showPriorityTriage = false,
  onToggle,
  onEdit,
  onEditNotes,
  onDelete,
  onToggleStar,
  onQuickSetPriority,
}: {
  task: Task;
  noteCount?: number;
  mediaNotes?: Note[];
  showPriorityTriage?: boolean;
  onToggle: (id: number) => void;
  onEdit: (id: number, directEdit?: boolean) => void;
  onEditNotes: (id: number) => void;
  onDelete: (id: number) => void;
  onToggleStar: (id: number) => void;
  onQuickSetPriority?: (id: number, priority: Priority) => void;
}) {
  const prio = task.priority || "none";
  const progress = task.milestones?.length ? taskProgress(task) : null;
  const dcls = task.deadline ? dateClass(task.deadline) : "";

  const rawTitle = task.title ? task.title.replace(/\[File:\s*[^\]]+\]/g, "").trim() : "";
  const isPureUrl = /^(https?:\/\/|www\.)[^\s]+$/.test(rawTitle);
  const urlMatch = rawTitle.match(/https?:\/\/[^\s]+/)?.[0] || (rawTitle.startsWith("www.") ? `https://${rawTitle}` : null) || task.notes?.match(/https?:\/\/[^\s]+/)?.[0];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.1 } }}
      transition={{ duration: 0.15 }}
      className={cn(
        "card group relative flex flex-col rounded-xl border bg-white dark:bg-[#18181c] p-3 transition-all duration-150 shadow-xs cursor-pointer",
        prio === "high" && "border-l-4 border-l-rose-500 border-neutral-200 dark:border-neutral-800/90 hover:border-l-rose-500",
        prio === "med" && "border-l-4 border-l-amber-500 border-neutral-200 dark:border-neutral-800/90 hover:border-l-amber-500",
        prio === "low" && "border-l-4 border-l-blue-500 border-neutral-200 dark:border-neutral-800/90 hover:border-l-blue-500",
        prio === "none" && "border-neutral-200 dark:border-neutral-800/90",
        "hover:border-neutral-400 dark:hover:border-neutral-600 hover:shadow-md",
        task.done && "opacity-55 bg-neutral-100/60 dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-800"
      )}
      draggable
      data-id={task.id}
      data-priority={prio}
      onClick={() => onEdit(task.id)}
    >
      {/* Top Row: Checkbox + Title + Hover Actions */}
      <div className="flex items-start gap-2.5">
        {/* Tactile Circular Checkbox */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(task.id);
          }}
          className={cn(
            "relative mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full border transition-all duration-150 cursor-pointer",
            task.done
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-neutral-300 dark:border-neutral-600 bg-transparent text-transparent hover:border-neutral-500 dark:hover:border-neutral-400"
          )}
          aria-label={task.done ? "Mark incomplete" : "Mark complete"}
        >
          <Check className={cn("size-3 transition-transform stroke-[3]", task.done ? "scale-100 opacity-100" : "scale-75 opacity-0")} />
        </button>

        {/* Task Title Content */}
        <div 
          className="min-w-0 flex-1 pt-0.5"
          onClick={() => onEdit(task.id, false)}
        >
          {isPureUrl ? (
            <div className={cn(
              "inline-flex items-center gap-1.5 font-mono text-xs text-blue-600 dark:text-blue-400 hover:underline truncate max-w-full font-medium",
              task.done && "line-through text-neutral-400"
            )}>
              <LinkIcon className="size-3.5 shrink-0 text-blue-500" />
              <span className="truncate">{rawTitle.replace(/^https?:\/\/(www\.)?/, "")}</span>
            </div>
          ) : (
            <div className={cn(
              "text-sm font-semibold leading-snug break-words text-neutral-900 dark:text-neutral-100 tracking-tight",
              task.done && "line-through text-neutral-400 dark:text-neutral-500 font-normal"
            )}>
              {rawTitle ? (
                <MathRenderer text={rawTitle} />
              ) : (
                <span className="text-neutral-400 italic font-normal">Untitled task</span>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions (revealed on hover) */}
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            type="button"
            className="rounded-lg p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Notes"
            onClick={(e) => {
              e.stopPropagation();
              onEditNotes(task.id);
            }}
          >
            <NotebookPen className="size-4" />
          </button>
          <button
            type="button"
            className="rounded-lg p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Edit Task"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task.id, true);
            }}
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            className="rounded-lg p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Open Details"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task.id, false);
            }}
          >
            <Maximize2 className="size-4" />
          </button>
          <button
            type="button"
            className="rounded-lg p-1.5 text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Move to bin"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
          >
            <Trash2 className="size-4" />
          </button>
          <button
            type="button"
            className={cn(
              "rounded-lg p-1.5 transition-colors cursor-pointer",
              task.starred
                ? "text-amber-500 hover:text-amber-600"
                : "text-neutral-400 hover:text-amber-500 hover:bg-amber-500/10"
            )}
            title={task.starred ? "Unstar" : "Star"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar(task.id);
            }}
          >
            <Star className={cn("size-4", task.starred && "fill-current text-amber-500")} />
          </button>
        </div>
      </div>

      {/* 1-Click Priority Triage Buttons (for Unset Priority tasks) */}
      {showPriorityTriage && !task.done && onQuickSetPriority && (
        <div className="mt-2.5 flex items-center gap-1.5 pl-7" onClick={(e) => e.stopPropagation()}>
          <span className="text-[11px] font-mono text-neutral-400 font-bold">Set:</span>
          <button
            type="button"
            onClick={() => onQuickSetPriority(task.id, "high")}
            className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[10.5px] font-mono font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/25 transition-colors cursor-pointer"
            title="Set High Priority"
          >
            !High
          </button>
          <button
            type="button"
            onClick={() => onQuickSetPriority(task.id, "med")}
            className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10.5px] font-mono font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 transition-colors cursor-pointer"
            title="Set Medium Priority"
          >
            !Med
          </button>
          <button
            type="button"
            onClick={() => onQuickSetPriority(task.id, "low")}
            className="rounded-md border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 text-[10.5px] font-mono font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/25 transition-colors cursor-pointer"
            title="Set Low Priority"
          >
            !Low
          </button>
        </div>
      )}

      {/* Metadata & Tag Badges */}
      {(task.deadline || noteCount > 0 || mediaNotes.length > 0 || progress) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-7">
          {/* Deadline */}
          {task.deadline && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task.id);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-xs font-mono font-semibold cursor-pointer transition-all",
                dcls === "overdue" && "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40 font-bold",
                dcls === "soon" && "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40 font-bold",
                !dcls && "bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-100"
              )}
              title="Edit deadline"
            >
              <CalendarDays className="size-3.5 shrink-0" />
              <span>{task.deadline.slice(5)}</span>
              {task.deadline_time && <span className="opacity-80">@{task.deadline_time}</span>}
            </button>
          )}

          {/* Notes Count */}
          {noteCount > 0 && (
            <button 
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800/80 px-2 py-0.5 text-xs font-mono font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer"
              title={`${noteCount} note${noteCount > 1 ? "s" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                onEditNotes(task.id);
              }}
            >
              <NotebookPen className="size-3.5 text-indigo-500" />
              <span>{noteCount}</span>
            </button>
          )}

          {/* Media Attachment Chips */}
          {mediaNotes.map((note) => {
            const style = getNoteChipStyle(note);
            const displayName = note.kind === "voice" && note.body.startsWith("voice-note") 
              ? "Audio" 
              : note.body;

            return (
              <button 
                key={note.id} 
                type="button"
                className="inline-flex max-w-[140px] items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800/80 px-2 py-0.5 text-xs text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer"
                title={displayName}
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

      {/* Note preview (if any) */}
      {task.notes && (
        <div 
          className="mt-2 pl-7 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400 line-clamp-2 cursor-pointer hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onEditNotes(task.id);
          }}
          title="Click to view notes"
        >
          <MathRenderer text={task.notes} />
        </div>
      )}

      {/* Link Preview — contained, no overflow clutter */}
      {urlMatch && (
        <div className="mt-2 ml-7 w-[calc(100%-28px)] min-w-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <LinkPreviewCard url={urlMatch} fallbackTitle={rawTitle} allowToggle={true} defaultExpanded={false} />
        </div>
      )}

      {/* Milestone Progress Bar */}
      {progress && (
        <div 
          className="mt-2.5 flex items-center gap-2 pl-7 cursor-pointer hover:opacity-80 transition-opacity" 
          title={`${progress.done} of ${progress.total} milestones completed`}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(task.id);
          }}
        >
          <div className="h-1.5 flex-1 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-300",
                progress.pct === 100 ? "bg-emerald-500" : "bg-blue-500"
              )}
              style={{ width: `${progress.pct}%` }} 
            />
          </div>
          <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono font-semibold">
            {progress.done}/{progress.total}
          </span>
        </div>
      )}
    </motion.div>
  );
}
