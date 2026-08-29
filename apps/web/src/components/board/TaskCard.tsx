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
  Link as LinkIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { dateClass, fmtDate, taskProgress } from "@/lib/board-helpers";
import type { Task, Note } from "@/lib/types";
import MathRenderer from "../research/MathRenderer";
import LinkPreviewCard from "../notes/LinkPreviewCard";

function getNoteChipStyle(note: Note) {
  if (note.kind === "voice") {
    return {
      icon: <Mic className="size-3 text-[var(--muted)]" />,
      className: "text-[var(--muted)]",
    };
  }
  if (note.kind === "video") {
    return {
      icon: <Video className="size-3 text-[var(--muted)]" />,
      className: "text-[var(--muted)]",
    };
  }
  if (note.kind === "image") {
    return {
      icon: <ImageIcon className="size-3 text-[var(--muted)]" />,
      className: "text-[var(--muted)]",
    };
  }
  return {
    icon: <Paperclip className="size-3 text-[var(--muted)]" />,
    className: "text-[var(--muted)]",
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
        "card group relative flex flex-col rounded-lg border border-[var(--line)] bg-[var(--bg)] p-2.5 transition-all duration-150 shadow-xs cursor-pointer",
        "hover:border-[var(--line-strong)] hover:bg-[var(--panel)] hover:shadow-sm",
        task.done && "opacity-50 bg-[var(--sunken)]/40 border-[var(--line)]"
      )}
      draggable
      data-id={task.id}
      data-priority={prio}
      onClick={() => onEdit(task.id)}
    >
      {/* Top Row: Checkbox + Priority + Title + Hover Actions */}
      <div className="flex items-start gap-2.5">
        {/* Tactile Circular Checkbox */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(task.id);
          }}
          className={cn(
            "relative mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border transition-all duration-150",
            task.done
              ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)]"
              : "border-[var(--line-strong)] bg-transparent text-transparent hover:border-[var(--ink)]"
          )}
          aria-label={task.done ? "Mark incomplete" : "Mark complete"}
        >
          <Check className={cn("size-2.5 transition-transform stroke-[2.5]", task.done ? "scale-100 opacity-100" : "scale-75 opacity-0")} />
        </button>

        {/* Priority Dot */}
        {prio !== "none" && (
          <span 
            className={cn(
              "mt-1.5 size-1.5 shrink-0 rounded-full",
              prio === "high" && "bg-[var(--ink)]",
              prio === "med" && "bg-[var(--muted)]",
              prio === "low" && "bg-[var(--ink3)]"
            )}
            title={`${prio.toUpperCase()} Priority`}
          />
        )}

        {/* Task Title Content */}
        <div 
          className="min-w-0 flex-1 pt-0.5"
          onClick={() => onEdit(task.id, false)}
        >
          {isPureUrl ? (
            <div className={cn(
              "inline-flex items-center gap-1.5 font-mono text-[12px] text-[var(--ink)] hover:underline truncate max-w-full",
              task.done && "line-through text-[var(--muted)]"
            )}>
              <LinkIcon className="size-3 shrink-0 text-[var(--muted)]" />
              <span className="truncate">{rawTitle.replace(/^https?:\/\/(www\.)?/, "")}</span>
            </div>
          ) : (
            <div className={cn(
              "text-[13.5px] font-normal leading-snug break-words text-[var(--ink)] tracking-[-0.01em]",
              task.done && "line-through text-[var(--muted)] decoration-[var(--muted)]"
            )}>
              {rawTitle ? (
                <MathRenderer text={rawTitle} />
              ) : (
                <span className="text-[var(--ink3)] italic font-light">Untitled task</span>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions (revealed on hover) */}
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            type="button"
            className="rounded p-1 text-[var(--ink3)] hover:text-[var(--ink)] hover:bg-[var(--accent-soft)] transition-colors cursor-pointer"
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
            className="rounded p-1 text-[var(--ink3)] hover:text-[var(--ink)] hover:bg-[var(--accent-soft)] transition-colors cursor-pointer"
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
            className="rounded p-1 text-[var(--ink3)] hover:text-[var(--ink)] hover:bg-[var(--accent-soft)] transition-colors cursor-pointer"
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
              "rounded p-1 transition-colors cursor-pointer",
              task.starred
                ? "text-[var(--ink)]"
                : "text-[var(--ink3)] hover:text-[var(--ink)] hover:bg-[var(--accent-soft)]"
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
        <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-6.5">
          {/* Deadline */}
          {task.deadline && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task.id);
              }}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--panel-2)] px-1.5 py-0.5 text-[10.5px] font-mono tracking-tight cursor-pointer transition-colors text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--line-strong)]",
                dcls === "overdue" && "text-rose-500 dark:text-rose-400 border-rose-500/30 bg-rose-500/5 font-medium",
                dcls === "soon" && "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5",
              )}
              title="Edit deadline"
            >
              <CalendarDays className="size-3 shrink-0" />
              <span>{task.deadline.slice(5)}</span>
              {task.deadline_time && <span className="opacity-75">{task.deadline_time}</span>}
            </button>
          )}

          {/* Notes Count */}
          {noteCount > 0 && (
            <button 
              type="button"
              className="inline-flex items-center gap-1 rounded border border-[var(--line)] bg-[var(--panel-2)] px-1.5 py-0.5 text-[10.5px] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--line-strong)] transition-colors cursor-pointer"
              title={`${noteCount} note${noteCount > 1 ? "s" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                onEditNotes(task.id);
              }}
            >
              <NotebookPen className="size-3" />
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
                className="inline-flex max-w-[130px] items-center gap-1 rounded border border-[var(--line)] bg-[var(--panel-2)] px-1.5 py-0.5 text-[10.5px] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--line-strong)] transition-colors cursor-pointer"
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
          className="mt-1.5 pl-6.5 text-[11.5px] leading-relaxed text-[var(--muted)] line-clamp-2 cursor-pointer hover:text-[var(--ink)] transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onEditNotes(task.id);
          }}
          title="Click to view notes"
        >
          <MathRenderer text={task.notes} />
        </div>
      )}

      {/* Link Preview */}
      {urlMatch && (
        <div className="mt-2 pl-6.5 w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <LinkPreviewCard url={urlMatch} fallbackTitle={rawTitle} allowToggle={true} defaultExpanded={false} />
        </div>
      )}

      {/* Milestone Progress Bar */}
      {progress && (
        <div 
          className="mt-2 flex items-center gap-2 pl-6.5 cursor-pointer hover:opacity-80 transition-opacity" 
          title={`${progress.done} of ${progress.total} milestones`}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(task.id);
          }}
        >
          <div className="h-[2px] flex-1 rounded-full bg-[var(--sunken)] overflow-hidden">
            <div 
              className="h-full bg-[var(--ink)] rounded-full transition-[width] duration-300" 
              style={{ width: `${progress.pct}%` }} 
            />
          </div>
          <span className="text-[10px] text-[var(--muted)] font-mono">
            {progress.done}/{progress.total}
          </span>
        </div>
      )}
    </motion.div>
  );
}
