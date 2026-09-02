"use client";

import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { 
  Archive, 
  Play, 
  RotateCcw, 
  Snowflake, 
  Trash2, 
  X 
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category, Cluster, Task } from "@/lib/types";

function cleanTitle(title: string) {
  return title.replace(/\s*\[(?:File|Audio Record|Audio_Record)[^\]]*\]/gi, "").trim();
}

export default function ArchiveDrawer({
  open,
  initialTab = "cold",
  clusters,
  tasks,
  categories,
  onClose,
  onResumeCluster,
  onBinCluster,
  onResumeTask,
  onBinTask,
  onRestoreCluster,
  onDeleteClusterForever,
  onRestoreTask,
  onDeleteTaskForever,
  onEmptyBin,
  taskCount,
}: {
  open: boolean;
  initialTab?: "cold" | "bin";
  clusters: Cluster[];
  tasks: Task[];
  categories: Category[];
  onClose: () => void;
  onResumeCluster: (id: number) => void;
  onBinCluster: (id: number) => void;
  onResumeTask: (id: number) => void;
  onBinTask: (id: number) => void;
  onRestoreCluster: (id: number) => void;
  onDeleteClusterForever: (id: number) => void;
  onRestoreTask: (id: number) => void;
  onDeleteTaskForever: (id: number) => void;
  onEmptyBin: () => void;
  taskCount: (clusterId: number) => number;
}) {
  const [activeTab, setActiveTab] = useState<"cold" | "bin">(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const coldClusters = clusters.filter((c) => c.status === "cold");
  const coldTasks = tasks.filter((t) => t.cold && !t.binned);
  const totalCold = coldClusters.length + coldTasks.length;

  const binnedClusters = clusters.filter((c) => c.status === "binned");
  const binnedTasks = tasks.filter((t) => t.binned);
  const totalBin = binnedClusters.length + binnedTasks.length;

  const category = (id: number | null) => (id ? categories.find((c) => c.id === id) || null : null);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Drawer Panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-0 top-0 z-[100] flex h-dvh w-full max-w-[480px] flex-col border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#141417] shadow-2xl text-neutral-900 dark:text-neutral-100"
          >
            {/* Header with Tabs */}
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 bg-neutral-50/50 dark:bg-neutral-900/30">
              <div className="flex items-center gap-2">
                <Archive className="size-5 text-purple-500" />
                <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  Archive & Storage
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Segmented Tab Bar */}
            <div className="border-b border-neutral-200 dark:border-neutral-800 p-4 bg-neutral-50 dark:bg-neutral-900/50">
              <div className="flex rounded-xl bg-neutral-200 dark:bg-neutral-800 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("cold")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer",
                    activeTab === "cold"
                      ? "bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-xs"
                      : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                  )}
                >
                  <Snowflake className="size-3.5" />
                  <span>Freezer ({totalCold})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("bin")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer",
                    activeTab === "bin"
                      ? "bg-white dark:bg-neutral-900 text-rose-600 dark:text-rose-400 shadow-xs"
                      : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                  )}
                >
                  <Trash2 className="size-3.5" />
                  <span>Dumping Bin ({totalBin})</span>
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Cold Store Tab */}
              {activeTab === "cold" && (
                <div className="space-y-4">
                  {/* Paused Clusters */}
                  {coldClusters.length > 0 && (
                    <div>
                      <span className="mb-2.5 block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        Paused Clusters ({coldClusters.length})
                      </span>
                      <div className="space-y-2">
                        {coldClusters.map((c) => {
                          const cat = category(c.category_id);
                          const count = taskCount(c.id);
                          return (
                            <div
                              key={c.id}
                              className="group flex items-center justify-between gap-3 rounded-xl border border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-neutral-800/80 p-3.5 shadow-2xs"
                            >
                              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                <span
                                  className="size-2.5 rounded-full shrink-0 ring-1 ring-black/10 dark:ring-white/20"
                                  style={{ background: c.color }}
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{c.name}</p>
                                  <p className="text-xs font-mono text-neutral-500">
                                    {count} task{count === 1 ? "" : "s"} {cat ? `· ${cat.name}` : ""}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => onResumeCluster(c.id)}
                                  className="flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 cursor-pointer"
                                  title="Unfreeze cluster"
                                >
                                  <Play className="size-3.5" />
                                  <span>Resume</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onBinCluster(c.id)}
                                  className="rounded-lg p-1.5 text-neutral-400 hover:text-rose-500 transition-colors cursor-pointer"
                                  title="Move cluster to bin"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Paused Tasks */}
                  {coldTasks.length > 0 && (
                    <div>
                      <span className="mb-2.5 block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        Paused Tasks ({coldTasks.length})
                      </span>
                      <div className="space-y-2">
                        {coldTasks.map((t) => (
                          <div
                            key={t.id}
                            className="group flex items-center justify-between gap-3 rounded-xl border border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-neutral-800/80 p-3.5 shadow-2xs"
                          >
                            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                              {cleanTitle(t.title)}
                            </p>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onResumeTask(t.id)}
                                className="flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 cursor-pointer"
                                title="Unfreeze task"
                              >
                                <Play className="size-3.5" />
                                <span>Resume</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onBinTask(t.id)}
                                className="rounded-lg p-1.5 text-neutral-400 hover:text-rose-500 transition-colors cursor-pointer"
                                title="Move to bin"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {totalCold === 0 && (
                    <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 text-center text-neutral-400">
                      <Snowflake className="size-8 stroke-[1.5]" />
                      <p className="text-sm font-medium">Freezer is empty</p>
                      <p className="text-xs text-neutral-400">Pause clusters or tasks to put them on ice</p>
                    </div>
                  )}
                </div>
              )}

              {/* Dumping Bin Tab */}
              {activeTab === "bin" && (
                <div className="space-y-4">
                  {totalBin > 0 && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={onEmptyBin}
                        className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-xs font-mono font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/25 transition-colors cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                        <span>Empty Bin Forever</span>
                      </button>
                    </div>
                  )}

                  {/* Binned Clusters */}
                  {binnedClusters.length > 0 && (
                    <div>
                      <span className="mb-2.5 block text-xs font-mono font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                        Binned Clusters ({binnedClusters.length})
                      </span>
                      <div className="space-y-2">
                        {binnedClusters.map((c) => (
                          <div
                            key={c.id}
                            className="group flex items-center justify-between gap-3 rounded-xl border border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-neutral-800/80 p-3.5 shadow-2xs"
                          >
                            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{c.name}</p>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onRestoreCluster(c.id)}
                                className="flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                                title="Restore cluster"
                              >
                                <RotateCcw className="size-3.5" />
                                <span>Restore</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteClusterForever(c.id)}
                                className="rounded-lg p-1.5 text-neutral-400 hover:text-rose-500 transition-colors cursor-pointer"
                                title="Delete forever"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Binned Tasks */}
                  {binnedTasks.length > 0 && (
                    <div>
                      <span className="mb-2.5 block text-xs font-mono font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                        Binned Tasks ({binnedTasks.length})
                      </span>
                      <div className="space-y-2">
                        {binnedTasks.map((t) => (
                          <div
                            key={t.id}
                            className="group flex items-center justify-between gap-3 rounded-xl border border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-neutral-800/80 p-3.5 shadow-2xs"
                          >
                            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                              {cleanTitle(t.title)}
                            </p>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onRestoreTask(t.id)}
                                className="flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                                title="Restore task"
                              >
                                <RotateCcw className="size-3.5" />
                                <span>Restore</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteTaskForever(t.id)}
                                className="rounded-lg p-1.5 text-neutral-400 hover:text-rose-500 transition-colors cursor-pointer"
                                title="Delete forever"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {totalBin === 0 && (
                    <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 text-center text-neutral-400">
                      <Trash2 className="size-8 stroke-[1.5]" />
                      <p className="text-sm font-medium">Bin is empty</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
