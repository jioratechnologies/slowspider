"use client";

import React from "react";
import { FolderKanban, GitPullRequest, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export type BoardViewMode = "clusters" | "workflow" | "priority";

export default function ViewSwitcher({
  viewMode,
  onChangeView,
  totalTasks,
}: {
  viewMode: BoardViewMode;
  onChangeView: (mode: BoardViewMode) => void;
  totalTasks: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
      {/* View Selector Segmented Buttons */}
      <div className="flex items-center gap-1.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#18181c] p-1.5 shadow-xs">
        <button
          type="button"
          onClick={() => onChangeView("clusters")}
          onDragOver={(e) => {
            e.preventDefault();
            if (viewMode !== "clusters") onChangeView("clusters");
          }}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-sm font-semibold transition-all cursor-pointer",
            viewMode === "clusters"
              ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shadow-xs"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          )}
          title="Cluster View: Group by project or topic clusters (drag here to switch)"
        >
          <FolderKanban className="size-4" />
          <span>Clusters</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeView("workflow")}
          onDragOver={(e) => {
            e.preventDefault();
            if (viewMode !== "workflow") onChangeView("workflow");
          }}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-sm font-semibold transition-all cursor-pointer",
            viewMode === "workflow"
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          )}
          title="Workflow View: Backlog → In Progress → Review → Done (drag here to switch)"
        >
          <GitPullRequest className="size-4" />
          <span>Workflow</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeView("priority")}
          onDragOver={(e) => {
            e.preventDefault();
            if (viewMode !== "priority") onChangeView("priority");
          }}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-sm font-semibold transition-all cursor-pointer",
            viewMode === "priority"
              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-xs"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          )}
          title="Priority View: High → Medium → Low → None (drag here to switch)"
        >
          <Layers className="size-4" />
          <span>Priority</span>
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs font-mono font-bold text-neutral-500 dark:text-neutral-400">
        <span className="rounded-full bg-neutral-200 dark:bg-neutral-800 px-2.5 py-1 text-neutral-700 dark:text-neutral-300">
          {totalTasks} active tasks
        </span>
      </div>
    </div>
  );
}
