"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GripVertical, MoreHorizontal, Pencil, ArrowLeft, ArrowRight, Snowflake, Trash2, ChevronDown, ChevronUp, FileText } from "lucide-react";
import TaskCard from "./TaskCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportClusterToLatex, downloadLatexFile } from "../research/LatexExporter";
import type { Category, Cluster, Task, Note } from "@/lib/types";

const VISIBLE_LIMIT = 5;

export default function ClusterColumn({
  cluster,
  tasks,
  category,
  openCount,
  progress,
  onEdit,
  onMoveLeft,
  onMoveRight,
  onCold,
  onBin,
  onRename,
  onToggleTask,
  onEditTask,
  onEditNotesTask,
  onDeleteTask,
  onToggleTaskStar,
  noteCount,
  mediaNotes,
}: {
  cluster: Cluster;
  tasks: Task[];
  category: Category | null;
  openCount: number;
  progress: { done: number; total: number; pct: number };
  onEdit: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onCold: () => void;
  onBin: () => void;
  onRename: (name: string) => void;
  onToggleTask: (id: number) => void;
  onEditTask: (id: number, directEdit?: boolean) => void;
  onEditNotesTask: (id: number) => void;
  onDeleteTask: (id: number) => void;
  onToggleTaskStar: (id: number) => void;
  noteCount: (taskId: number) => number;
  mediaNotes: (taskId: number) => Note[];
}) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = tasks.length > VISIBLE_LIMIT;
  const visibleTasks = expanded ? tasks : tasks.slice(0, VISIBLE_LIMIT);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="cluster group relative flex w-full flex-col rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5 shadow-xs transition-all"
      data-cluster={cluster.id}
    >
      {/* Cluster Header */}
      <div className="mb-3 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span
            className="cluster-grip -ml-1 flex shrink-0 cursor-grab items-center p-1 text-[var(--ink3)] hover:text-[var(--ink)] transition-colors active:cursor-grabbing"
            title="Drag to reorder clusters"
          >
            <GripVertical className="size-3.5" />
          </span>

          {/* Color Indicator */}
          <span
            className="shrink-0 size-2 rounded-full ring-1 ring-black/10 dark:ring-white/20"
            style={{ backgroundColor: cluster.color }}
          />

          <input
            className="cluster-name min-w-0 flex-1 border-0 bg-transparent text-[14.5px] font-medium tracking-tight text-[var(--ink)] outline-none placeholder:text-[var(--ink3)] transition-colors"
            defaultValue={cluster.name}
            placeholder="Cluster Name"
            spellCheck={false}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v) onRename(v);
              else e.target.value = cluster.name;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />

          {category && (
            <span
              className="hidden shrink-0 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded-md border border-[var(--line)] text-[var(--muted)] bg-[var(--panel-2)] sm:inline-block"
            >
              {category.name}
            </span>
          )}

          <span className="shrink-0 rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-2 py-0.5 text-[11px] font-mono text-[var(--muted)]">
            {openCount}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-md p-1 text-[var(--ink3)] hover:text-[var(--ink)] hover:bg-[var(--accent-soft)] outline-none transition-colors">
              <MoreHorizontal className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px] border border-[var(--line)] bg-[var(--panel)] p-1 text-[var(--ink)] shadow-md">
              <DropdownMenuItem onClick={onEdit} className="px-2.5 py-2 text-[13px] cursor-pointer">
                <Pencil className="size-3.5 mr-2 text-[var(--muted)]" /> Edit details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onMoveLeft} className="px-2.5 py-2 text-[13px] cursor-pointer">
                <ArrowLeft className="size-3.5 mr-2 text-[var(--muted)]" /> Move left
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onMoveRight} className="px-2.5 py-2 text-[13px] cursor-pointer">
                <ArrowRight className="size-3.5 mr-2 text-[var(--muted)]" /> Move right
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const notesMap: Record<number, Note[]> = {};
                  tasks.forEach((t) => {
                    notesMap[t.id] = mediaNotes(t.id);
                  });
                  const tex = exportClusterToLatex({
                    cluster,
                    tasks,
                    notesByTask: notesMap,
                  });
                  downloadLatexFile(tex, `Report_${cluster.name.replace(/\s+/g, "_")}`);
                }}
                className="px-2.5 py-2 text-[13px] cursor-pointer"
              >
                <FileText className="size-3.5 mr-2 text-[var(--muted)]" /> Export as LaTeX
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[var(--line)] my-1" />
              <DropdownMenuItem onClick={onCold} className="px-2.5 py-2 text-[13px] cursor-pointer">
                <Snowflake className="size-3.5 mr-2 text-[var(--muted)]" /> Pause → Cold store
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onBin} className="px-2.5 py-2 text-[13px] text-rose-500 hover:bg-rose-500/10 cursor-pointer">
                <Trash2 className="size-3.5 mr-2" /> Move to bin
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Minimal Progress Bar */}
        <div className="flex items-center gap-2 px-0.5">
          <div className="h-[2px] flex-1 rounded-full bg-[var(--sunken)] overflow-hidden">
            <motion.div
              className="h-full bg-[var(--ink)] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress.pct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-[10px] text-[var(--muted)] font-mono shrink-0">
            {progress.pct}%
          </span>
        </div>
      </div>

      {/* Task List */}
      <div className="flex min-h-[36px] flex-col gap-1.5 transition-all">
        {tasks.length ? (
          <>
            <AnimatePresence initial={false} mode="popLayout">
              {visibleTasks.map((t) => (
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
                />
              ))}
            </AnimatePresence>

            {/* Show More / Show Less */}
            {hasMore && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--line)] py-1.5 text-[11px] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--line-strong)] transition-colors"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="size-3" />
                    <span>Show less</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-3" />
                    <span>Show {tasks.length - VISIBLE_LIMIT} more</span>
                  </>
                )}
              </button>
            )}
          </>
        ) : (
          <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-[var(--line)] bg-[var(--bg)]/50 text-[12px] text-[var(--ink3)] italic">
            Drop tasks here
          </div>
        )}
      </div>
    </motion.div>
  );
}
