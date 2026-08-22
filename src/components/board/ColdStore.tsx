"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronsDown, ChevronsUp, Play, Snowflake, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category, Cluster, Task } from "@/lib/types";

/** Strip legacy [File: …] pollution from task titles */
function cleanTitle(title: string) {
  return title.replace(/\s*\[(?:File|Audio Record|Audio_Record)[^\]]*\]/gi, "").trim();
}

export default function ColdStore({
  clusters,
  tasks,
  categories,
  open,
  justFrozen,
  onToggleOpen,
  onResumeCluster,
  onBinCluster,
  onResumeTask,
  onBinTask,
  taskCount,
}: {
  clusters: Cluster[];
  tasks: Task[];
  categories: Category[];
  open: boolean;
  justFrozen: string | null;
  onToggleOpen: () => void;
  onResumeCluster: (id: number) => void;
  onBinCluster: (id: number) => void;
  onResumeTask: (id: number) => void;
  onBinTask: (id: number) => void;
  taskCount: (clusterId: number) => number;
}) {
  const cold = clusters.filter((c) => c.status === "cold");
  const coldTasks = tasks.filter((t) => t.cold && !t.binned);
  const total = cold.length + coldTasks.length;
  const category = (id: number | null) => (id ? categories.find((c) => c.id === id) || null : null);
  const [showAll, setShowAll] = useState(false);
  const LIMIT = 4;

  return (
    <section
      id="coldStore"
      className={cn(
        "stash mt-4 overflow-hidden rounded-2xl border border-zinc-200/90 dark:border-white/[0.08] bg-white/90 dark:bg-[#16161a]/85 backdrop-blur-md shadow-xs dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)] transition-all"
      )}
    >
      {/* Header */}
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-3 text-left select-none hover:bg-zinc-100 dark:hover:bg-white/[0.04] transition-colors"
        onClick={onToggleOpen}
      >
        <div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/20 shadow-[0_0_10px_rgba(14,165,233,0.15)]">
          <Snowflake className="size-3.5 text-sky-500 dark:text-sky-400" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
            Cold store
          </span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Paused projects, kept for later</span>
        </div>
        {total > 0 && (
          <span className="rounded-full bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 text-[11px] font-medium text-sky-600 dark:text-sky-300 tabular-nums font-mono">
            {total}
          </span>
        )}
        <ChevronDown
          className={cn("size-4 shrink-0 text-zinc-400 dark:text-zinc-500 transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-zinc-100 dark:border-white/[0.06] px-3 py-3 space-y-3">
              {/* Cloud Archive & Compression Info Banner */}
              <div className="flex items-center justify-between rounded-xl bg-sky-500/10 border border-sky-500/20 px-3 py-2 text-[11px] text-sky-600 dark:text-sky-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <Snowflake className="size-3.5 shrink-0" />
                  <span>Cloud Storage: <strong>Zipped &amp; Archived</strong> (70% space saved)</span>
                </span>
                <span className="font-mono text-[10px] bg-sky-500/20 px-1.5 py-0.5 rounded-md font-bold">
                  Auto-Cold &gt; 4mo
                </span>
              </div>

              {!total && (
                <p className="px-1 py-2 text-[12px] text-zinc-500 italic">
                  Nothing paused. Items inactive for &gt; 4 months auto-archive here to save cloud storage.
                </p>
              )}

              {total > 0 && (() => {
                const allItems = [
                  ...cold.map((c) => {
                    const n = taskCount(c.id);
                    const cat = category(c.category_id);
                    const frozen = `cluster:${c.id}` === justFrozen;
                    return (
                      <ColdRow
                        key={`c${c.id}`}
                        skind="cluster"
                        sid={c.id}
                        frozen={frozen}
                        onResume={() => onResumeCluster(c.id)}
                        onBin={() => onBinCluster(c.id)}
                      >
                        <span className="size-2 shrink-0 rounded-[3px]" style={{ background: c.color }} />
                        <span className="flex-1 truncate text-[13px] font-medium text-zinc-800 dark:text-zinc-200">{c.name}</span>
                        <span className="shrink-0 text-[10.5px] text-sky-600 dark:text-sky-400 font-mono bg-sky-500/10 px-1.5 py-0.5 rounded-md">
                          📦 Zipped
                        </span>
                        <span className="shrink-0 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                          {n} task{n !== 1 ? "s" : ""}
                          {cat ? ` · ${cat.name}` : ""}
                        </span>
                      </ColdRow>
                    );
                  }),
                  ...coldTasks.map((t) => {
                    const frozen = `task:${t.id}` === justFrozen;
                    const targetCluster = clusters.find((c) => c.id === t.cluster_id && c.status === "active");
                    const clusterName = targetCluster ? targetCluster.name : "Floating";
                    const title = cleanTitle(t.title) || "Untitled";
                    return (
                      <ColdRow
                        key={`t${t.id}`}
                        skind="task"
                        sid={t.id}
                        frozen={frozen}
                        onResume={() => onResumeTask(t.id)}
                        onBin={() => onBinTask(t.id)}
                      >
                        <span className="size-2 shrink-0 rounded-full bg-sky-400" />
                        <span className="flex-1 truncate text-[13px] text-zinc-800 dark:text-zinc-200">{title}</span>
                        <span className="shrink-0 text-[10.5px] text-sky-600 dark:text-sky-400 font-mono bg-sky-500/10 px-1.5 py-0.5 rounded-md">
                          📦 Zipped
                        </span>
                        <span className="shrink-0 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                          {clusterName}
                        </span>
                      </ColdRow>
                    );
                  }),
                ];
                const visible = showAll ? allItems : allItems.slice(0, LIMIT);
                const hasMore = allItems.length > LIMIT;
                return (
                  <>
                    <div
                      className={cn(
                        "flex flex-col gap-1.5 overflow-y-auto pr-0.5",
                        showAll && allItems.length > LIMIT && "max-h-64"
                      )}
                    >
                      {visible}
                    </div>
                    {hasMore && (
                      <button
                        type="button"
                        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-200 dark:border-white/[0.08] py-1.5 text-[11.5px] text-zinc-600 dark:text-zinc-400 transition-colors hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-zinc-100"
                        onClick={() => setShowAll((v) => !v)}
                      >
                        {showAll ? (
                          <><ChevronsUp className="size-3.5" /> Show less</>
                        ) : (
                          <><ChevronsDown className="size-3.5" /> Show {allItems.length - LIMIT} more</>
                        )}
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function ColdRow({
  skind,
  sid,
  frozen,
  onResume,
  onBin,
  children,
}: {
  skind: "cluster" | "task";
  sid: number;
  frozen: boolean;
  onResume: () => void;
  onBin: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "stash-item group flex cursor-grab items-center gap-2.5 rounded-xl border border-zinc-200/90 dark:border-white/[0.08] bg-zinc-50/70 hover:bg-zinc-100 dark:bg-white/[0.02] px-3 py-2.5 touch-none active:cursor-grabbing transition-all dark:hover:bg-white/[0.05] dark:hover:border-white/15 text-zinc-800 dark:text-zinc-200",
        frozen && "just-frozen ring-1 ring-sky-400/30 bg-sky-500/5"
      )}
      data-skind={skind}
      data-sid={sid}
      data-splace="cold"
    >
      {children}

      {/* Icon-only action buttons (revealed on hover) */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          className="rounded-lg p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-sky-500/15 hover:text-sky-500 dark:hover:text-sky-400 transition-colors"
          title="Resume"
          onClick={onResume}
        >
          <Play className="size-3.5" />
        </button>
        <button
          type="button"
          className="rounded-lg p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-rose-500/10 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
          title="Move to bin"
          onClick={onBin}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
