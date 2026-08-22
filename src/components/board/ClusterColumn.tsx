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

const VISIBLE_LIMIT = 4;

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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="cluster group relative flex w-full flex-col rounded-2xl border border-zinc-200/90 dark:border-white/[0.08] bg-white/90 dark:bg-[#16161a]/85 p-3 backdrop-blur-md shadow-xs dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)] transition-all"
      data-cluster={cluster.id}
    >
      {/* Cluster Header */}
      <div className="mb-3 flex flex-col gap-2">
        <div className="flex items-center gap-2 px-0.5">
          <span className="cluster-grip -ml-1 flex shrink-0 cursor-grab items-center rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-zinc-100 transition-colors active:cursor-grabbing" title="Drag to reorder clusters">
            <GripVertical className="size-4" />
          </span>
          
          <span 
            className="shrink-0 size-2.5 rounded-full" 
            style={{ 
              backgroundColor: cluster.color, 
              boxShadow: `0 0 8px ${cluster.color}80` 
            }} 
          />
          
          <input
            className="cluster-name min-w-0 flex-1 border-0 bg-transparent text-[17px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 transition-colors"
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
              className="hidden shrink-0 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold whitespace-nowrap sm:inline-block"
              style={{ color: category.color, borderColor: `${category.color}40`, backgroundColor: `${category.color}15` }}
            >
              {category.name}
            </span>
          )}
          
          <span className="shrink-0 rounded-full bg-zinc-100 dark:bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 font-mono">{openCount}</span>
          
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-zinc-100 outline-none transition-colors">
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[220px] rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#16161a] p-1.5 shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl text-zinc-900 dark:text-zinc-200">
              <DropdownMenuItem onClick={onEdit} className="rounded-xl px-2.5 py-2 text-[13px] hover:bg-zinc-100 dark:hover:bg-white/[0.08] cursor-pointer">
                <Pencil className="size-4 mr-2 text-zinc-500 dark:text-zinc-400" /> Edit name, colour, category
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onMoveLeft} className="rounded-xl px-2.5 py-2 text-[13px] hover:bg-zinc-100 dark:hover:bg-white/[0.08] cursor-pointer">
                <ArrowLeft className="size-4 mr-2 text-zinc-500 dark:text-zinc-400" /> Move left
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onMoveRight} className="rounded-xl px-2.5 py-2 text-[13px] hover:bg-zinc-100 dark:hover:bg-white/[0.08] cursor-pointer">
                <ArrowRight className="size-4 mr-2 text-zinc-500 dark:text-zinc-400" /> Move right
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
                className="rounded-xl px-2.5 py-2 text-[13px] hover:bg-zinc-100 dark:hover:bg-white/[0.08] cursor-pointer"
              >
                <FileText className="size-4 mr-2 text-purple-500" /> Export as LaTeX (.tex)
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-100 dark:bg-white/[0.08] my-1" />
              <DropdownMenuItem onClick={onCold} className="rounded-xl px-2.5 py-2 text-[13px] hover:bg-zinc-100 dark:hover:bg-white/[0.08] cursor-pointer">
                <Snowflake className="size-4 mr-2 text-sky-500 dark:text-sky-400" /> Pause → Cold store
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onBin} className="rounded-xl px-2.5 py-2 text-[13px] text-rose-500 hover:bg-rose-500/10 cursor-pointer">
                <Trash2 className="size-4 mr-2" /> Move to bin
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Minimal Progress Bar */}
        <div className="flex items-center gap-2 px-1">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.06]">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: cluster.color }}
              initial={{ width: 0 }}
              animate={{ width: `${progress.pct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono shrink-0">
            {progress.pct}%
          </span>
        </div>
      </div>
      
      {/* Task List */}
      <div className="flex min-h-[30px] flex-col gap-1.5 transition-all">
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
            
            {/* Show More / Show Less Toggle Button */}
            {hasMore && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 hover:bg-zinc-100 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] py-1.5 text-[11.5px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
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
          <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-white/[0.01] text-[12px] text-zinc-500 italic transition-colors hover:border-white/[0.15]">
            Drop tasks here
          </div>
        )}
      </div>
    </motion.div>
  );
}
