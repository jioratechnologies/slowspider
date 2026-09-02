"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Maximize2 } from "lucide-react";
import TaskCard from "./TaskCard";
import type { Task, Note, Priority } from "@/lib/types";

const DEFAULT_VISIBLE_LIMIT = 5;

export default function WorkflowColumn({
  id,
  title,
  count,
  color,
  tasks,
  onToggleTask,
  onEditTask,
  onEditNotesTask,
  onDeleteTask,
  onToggleTaskStar,
  onQuickSetPriority,
  onExpand,
  noteCount,
  mediaNotes,
}: {
  id: string;
  title: string;
  count: number;
  color?: string;
  tasks: Task[];
  onToggleTask: (id: number) => void;
  onEditTask: (id: number, directEdit?: boolean) => void;
  onEditNotesTask: (id: number) => void;
  onDeleteTask: (id: number) => void;
  onToggleTaskStar: (id: number) => void;
  onQuickSetPriority?: (id: number, priority: Priority) => void;
  onExpand?: () => void;
  noteCount: (taskId: number) => number;
  mediaNotes: (taskId: number) => Note[];
}) {
  const [expanded, setExpanded] = useState(false);
  const isUnset = id === "unset";
  const hasMore = tasks.length > DEFAULT_VISIBLE_LIMIT;
  const visibleTasks = expanded ? tasks : tasks.slice(0, DEFAULT_VISIBLE_LIMIT);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="cluster group relative flex w-full flex-col rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#121215] p-3.5 shadow-xs transition-all min-w-[290px]"
      data-workflow-column={id}
    >
      {/* Column Header */}
      <div className="mb-3.5 flex items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <div className="flex items-center gap-2.5">
          {color && (
            <span
              className="size-3 rounded-full shrink-0 shadow-xs"
              style={{ backgroundColor: color }}
            />
          )}
          <span className="text-[15px] font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="shrink-0 rounded-full border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 text-xs font-mono font-bold text-neutral-700 dark:text-neutral-300">
            {count}
          </span>
          {onExpand && (
            <button
              type="button"
              onClick={onExpand}
              className="rounded-lg p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Expand column in dialog"
            >
              <Maximize2 className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="flex min-h-[60px] flex-col gap-2 transition-all">
        {tasks.length ? (
          <>
            <AnimatePresence initial={false} mode="popLayout">
              {visibleTasks.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  noteCount={noteCount(t.id)}
                  mediaNotes={mediaNotes(t.id)}
                  showPriorityTriage={isUnset}
                  onToggle={onToggleTask}
                  onEdit={onEditTask}
                  onEditNotes={onEditNotesTask}
                  onDelete={onDeleteTask}
                  onToggleStar={onToggleTaskStar}
                  onQuickSetPriority={onQuickSetPriority}
                />
              ))}
            </AnimatePresence>

            {/* Show More / Show Less Accordion */}
            {hasMore && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-white/50 dark:bg-neutral-800/40 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors cursor-pointer shadow-2xs"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="size-3.5" />
                    <span>Show less</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-3.5" />
                    <span>Show {tasks.length - DEFAULT_VISIBLE_LIMIT} more</span>
                  </>
                )}
              </button>
            )}
          </>
        ) : (
          <div className="flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/40 text-xs font-medium text-neutral-400 dark:text-neutral-500 italic">
            No tasks in this column
          </div>
        )}
      </div>
    </motion.div>
  );
}
