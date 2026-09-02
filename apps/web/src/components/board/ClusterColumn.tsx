"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GripVertical, MoreHorizontal, Pencil, ArrowLeft, ArrowRight, Snowflake, Trash2, ChevronDown, ChevronUp, FileText, Maximize2 } from "lucide-react";
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

const VISIBLE_LIMIT = 6;

export default function ClusterColumn({
  cluster,
  tasks,
  category,
  openCount,
  progress,
  onExpand,
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
  onExpand?: () => void;
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
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="cluster group relative flex w-full flex-col rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#121215] p-3.5 shadow-xs transition-all min-w-[290px]"
      data-cluster-id={cluster.id}
    >
      {/* Cluster Header */}
      <div className="mb-3.5 flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <span
            className="cluster-grip -ml-1 flex shrink-0 cursor-grab items-center p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors active:cursor-grabbing"
            title="Drag to reorder clusters"
          >
            <GripVertical className="size-4" />
          </span>

          {/* Color Indicator */}
          <span
            className="shrink-0 size-3 rounded-full ring-2 ring-black/10 dark:ring-white/20 shadow-xs"
            style={{ backgroundColor: cluster.color }}
          />

          <input
            className="cluster-name min-w-0 flex-1 border-0 bg-transparent text-[15px] font-bold tracking-tight text-neutral-900 dark:text-neutral-100 outline-none placeholder:text-neutral-400 transition-colors"
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
              className="hidden shrink-0 px-2 py-0.5 text-xs font-mono font-bold uppercase tracking-wider rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 sm:inline-block"
            >
              {category.name}
            </span>
          )}

          <span className="shrink-0 rounded-full border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 text-xs font-mono font-bold text-neutral-700 dark:text-neutral-300">
            {openCount}
          </span>

          {onExpand && (
            <button
              type="button"
              onClick={onExpand}
              className="rounded-lg p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 outline-none transition-colors cursor-pointer"
              title="Expand cluster in dialog"
            >
              <Maximize2 className="size-4" />
            </button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-lg p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 outline-none transition-colors cursor-pointer">
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#18181c] p-1.5 text-neutral-900 dark:text-neutral-100 shadow-2xl">
              <DropdownMenuItem onClick={onEdit} className="px-3 py-2 text-xs font-medium cursor-pointer rounded-lg">
                <Pencil className="size-4 mr-2.5 text-neutral-500" /> Edit details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onMoveLeft} className="px-3 py-2 text-xs font-medium cursor-pointer rounded-lg">
                <ArrowLeft className="size-4 mr-2.5 text-neutral-500" /> Move left
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onMoveRight} className="px-3 py-2 text-xs font-medium cursor-pointer rounded-lg">
                <ArrowRight className="size-4 mr-2.5 text-neutral-500" /> Move right
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
                className="px-3 py-2 text-xs font-medium cursor-pointer rounded-lg"
              >
                <FileText className="size-4 mr-2.5 text-neutral-500" /> Export as LaTeX
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-neutral-200 dark:bg-neutral-700 my-1" />
              <DropdownMenuItem onClick={onCold} className="px-3 py-2 text-xs font-medium cursor-pointer rounded-lg">
                <Snowflake className="size-4 mr-2.5 text-blue-500" /> Pause → Cold store
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onBin} className="px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer rounded-lg">
                <Trash2 className="size-4 mr-2.5" /> Move to bin
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Minimal Progress Bar */}
        <div className="flex items-center gap-2.5 px-0.5">
          <div className="h-1.5 flex-1 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
            <motion.div
              className="h-full bg-emerald-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress.pct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono font-bold shrink-0">
            {progress.pct}%
          </span>
        </div>
      </div>

      {/* Task List */}
      <div className="flex min-h-[50px] flex-col gap-2 transition-all">
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
                className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors cursor-pointer"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="size-3.5" />
                    <span>Show less</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-3.5" />
                    <span>Show {tasks.length - VISIBLE_LIMIT} more</span>
                  </>
                )}
              </button>
            )}
          </>
        ) : (
          <div className="flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/40 text-xs font-medium text-neutral-400 dark:text-neutral-500 italic">
            Drop tasks here
          </div>
        )}
      </div>
    </motion.div>
  );
}
