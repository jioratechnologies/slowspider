"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronsDown, ChevronsUp, Clock, RotateCcw, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { daysLeft, rotStage } from "@/lib/board-helpers";
import type { Cluster, Task } from "@/lib/types";

/** Strip legacy [File: …] and [Audio Record: …] pollution from task titles */
function cleanTitle(title: string) {
  return title.replace(/\s*\[(?:File|Audio Record|Audio_Record)[^\]]*\]/gi, "").trim();
}

export default function DumpBin({
  clusters,
  tasks,
  open,
  onToggleOpen,
  onRestoreCluster,
  onDeleteClusterForever,
  onRestoreTask,
  onDeleteTaskForever,
  onEmptyBin,
  taskCount,
}: {
  clusters: Cluster[];
  tasks: Task[];
  open: boolean;
  onToggleOpen: () => void;
  onRestoreCluster: (id: number) => void;
  onDeleteClusterForever: (id: number) => void;
  onRestoreTask: (id: number) => void;
  onDeleteTaskForever: (id: number) => void;
  onEmptyBin: () => void;
  taskCount: (clusterId: number) => number;
}) {
  const binnedClusters = clusters.filter((c) => c.status === "binned");
  const binnedTasks = tasks.filter((t) => t.binned);
  const count = binnedClusters.length + binnedTasks.length;
  const clusterName = (id: number | null) => clusters.find((c) => c.id === id)?.name || "Floating";
  const [showAll, setShowAll] = useState(false);
  const LIMIT = 4;

  return (
    <section className="stash mt-4 overflow-hidden rounded-2xl border border-zinc-200/90 dark:border-white/[0.08] bg-white/90 dark:bg-[#16161a]/85 backdrop-blur-md shadow-xs dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)] transition-all" id="dumpBin">
      {/* Header */}
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-3 text-left select-none hover:bg-zinc-100 dark:hover:bg-white/[0.04] transition-colors"
        onClick={onToggleOpen}
      >
        <div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.15)]">
          <Trash2 className="size-3.5 text-rose-500 dark:text-rose-400" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-semibold leading-tight text-zinc-900 dark:text-zinc-100">Dumping bin</span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Removed for good after 2 weeks</span>
        </div>
        {count > 0 && (
          <span className="rounded-full bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[11px] font-medium text-rose-600 dark:text-rose-300 tabular-nums font-mono">
            {count}
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
            <div className="border-t border-zinc-100 dark:border-white/[0.06] px-3 py-3">
              {!count && (
                <p className="px-1 py-2 text-[12px] text-zinc-500 italic">
                  The bin is empty. Deleted clusters and tasks land here.
                </p>
              )}

              {count > 0 && (() => {
                const allItems = [
                  ...binnedClusters.map((c) => {
                    const rs = rotStage(c.binned_at);
                    const dl = daysLeft(c.binned_at);
                    const n = taskCount(c.id);
                    return (
                      <BinRow
                        key={`c${c.id}`}
                        skind="cluster"
                        sid={c.id}
                        rotStage={rs}
                        daysLeft={dl}
                        onRestore={() => onRestoreCluster(c.id)}
                        onDelete={() => onDeleteClusterForever(c.id)}
                      >
                        <span className="size-2 shrink-0 rounded-[3px]" style={{ background: c.color }} />
                        <span className={cn("flex-1 truncate text-[13px] font-medium text-zinc-800 dark:text-zinc-200", rs === 2 && "line-through text-zinc-500 dark:text-muted-foreground")}>
                          {c.name}
                        </span>
                        <span className="shrink-0 text-[11px] text-zinc-500 dark:text-muted-foreground">
                          {n} task{n !== 1 ? "s" : ""}
                        </span>
                      </BinRow>
                    );
                  }),
                  ...binnedTasks.map((t) => {
                    const rs = rotStage(t.binned_at);
                    const dl = daysLeft(t.binned_at);
                    const title = cleanTitle(t.title) || "Untitled";
                    return (
                      <BinRow
                        key={`t${t.id}`}
                        skind="task"
                        sid={t.id}
                        rotStage={rs}
                        daysLeft={dl}
                        onRestore={() => onRestoreTask(t.id)}
                        onDelete={() => onDeleteTaskForever(t.id)}
                      >
                        <span className="size-2 shrink-0 rounded-full bg-zinc-400 dark:bg-muted-foreground/60" />
                        <span className={cn("flex-1 truncate text-[13px] text-zinc-800 dark:text-zinc-200", rs === 2 && "line-through text-zinc-500 dark:text-muted-foreground")}>
                          {title}
                        </span>
                        <span className="shrink-0 text-[11px] text-zinc-500 dark:text-zinc-400">{clusterName(t.cluster_id)}</span>
                      </BinRow>
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

              {count > 0 && (
                <button
                  type="button"
                  className="mt-2.5 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12px] font-medium text-rose-500 hover:bg-rose-500/10 transition-colors"
                  onClick={onEmptyBin}
                >
                  Empty bin now
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function BinRow({
  skind,
  sid,
  rotStage,
  daysLeft,
  onRestore,
  onDelete,
  children,
}: {
  skind: "cluster" | "task";
  sid: number;
  rotStage: 0 | 1 | 2;
  daysLeft: number;
  onRestore: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "stash-item group flex cursor-grab items-center gap-2.5 rounded-xl border border-zinc-200/90 dark:border-white/[0.08] bg-zinc-50/70 hover:bg-zinc-100 dark:bg-white/[0.02] px-3 py-2.5 touch-none active:cursor-grabbing transition-all dark:hover:bg-white/[0.05] dark:hover:border-white/15 text-zinc-800 dark:text-zinc-200",
        rotStage === 1 && "opacity-75",
        rotStage === 2 && "opacity-50"
      )}
      data-skind={skind}
      data-sid={sid}
      data-splace="bin"
    >
      {children}

      {/* Days left badge */}
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-mono tabular-nums",
          daysLeft <= 3 ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30" : "bg-zinc-100 dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.08]"
        )}
        title={`Deleted permanently in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}
      >
        <Clock className="size-2.5" />
        {daysLeft}d
      </span>

      {/* Icon-only action buttons (revealed on hover) */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          className="rounded-lg p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/60 hover:text-zinc-900 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100 transition-colors"
          title="Restore"
          onClick={onRestore}
        >
          <RotateCcw className="size-3.5" />
        </button>
        <button
          type="button"
          className="rounded-lg p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-rose-500/10 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
          title="Delete permanently"
          onClick={onDelete}
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
