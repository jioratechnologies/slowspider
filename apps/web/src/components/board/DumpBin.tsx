"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronsDown, ChevronsUp, Clock, RotateCcw, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { daysLeft, rotStage } from "@/lib/board-helpers";
import type { Cluster, Task } from "@/lib/types";

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
    <section className="stash overflow-hidden rounded-xl border border-(line) bg-(panel) shadow-xs transition-all" id="dumpBin">
      {/* Header */}
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-3 text-left select-none hover:bg-(accent-soft) transition-colors"
        onClick={onToggleOpen}
      >
        <div className="flex size-6.5 shrink-0 items-center justify-center rounded-lg border border-(line) bg-(panel-2) text-(muted)">
          <Trash2 className="size-3.5 text-(ink)" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium leading-tight text-(ink)">Dumping Bin</span>
          <span className="text-[11px] text-(muted)">Removed for good after 2 weeks</span>
        </div>
        {count > 0 && (
          <span className="rounded-full border border-(line) bg-(panel-2) px-2 py-0.2 text-[10.5px] font-mono text-(muted)">
            {count}
          </span>
        )}
        <ChevronDown
          className={cn("size-3.5 shrink-0 text-(muted) transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-(line) px-3 py-2.5 space-y-2.5">
              {!count && (
                <p className="px-1 py-2 text-[11.5px] text-(muted) italic">
                  The bin is empty. Deleted items land here.
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
                        <span className="size-1.5 shrink-0 rounded-full" style={{ background: c.color }} />
                        <span className={cn("flex-1 truncate text-[12.5px] font-medium text-(ink)", rs === 2 && "line-through text-(muted)")}>
                          {c.name}
                        </span>
                        <span className="shrink-0 text-[10.5px] text-(muted) font-mono">
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
                        <span className="size-1.5 shrink-0 rounded-full bg-(muted)" />
                        <span className={cn("flex-1 truncate text-[12.5px] text-(ink)", rs === 2 && "line-through text-(muted)")}>
                          {title}
                        </span>
                        <span className="shrink-0 text-[10.5px] text-(muted) font-mono">{clusterName(t.cluster_id)}</span>
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
                        className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-(line) py-1 text-[11px] text-(muted) hover:text-(ink) transition-colors cursor-pointer"
                        onClick={() => setShowAll((v) => !v)}
                      >
                        {showAll ? (
                          <><ChevronsUp className="size-3" /> Show less</>
                        ) : (
                          <><ChevronsDown className="size-3" /> Show {allItems.length - LIMIT} more</>
                        )}
                      </button>
                    )}
                  </>
                );
              })()}

              {count > 0 && (
                <button
                  type="button"
                  className="mt-2 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-(line) bg-(panel-2) py-1.5 text-[11.5px] text-(muted) hover:text-rose-500 hover:border-rose-500/30 transition-colors"
                  onClick={onEmptyBin}
                >
                  Empty bin
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
        "stash-item group flex cursor-grab items-center gap-2 rounded-lg border border-(line) bg-(bg) px-2.5 py-2 touch-none active:cursor-grabbing transition-all hover:border-(line-strong) hover:bg-(panel) text-(ink)",
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
        className="inline-flex shrink-0 items-center gap-1 rounded border border-(line) bg-(panel-2) px-1.5 py-0.2 text-[10px] font-mono text-(muted)"
        title={`Deleted permanently in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}
      >
        <Clock className="size-2.5" />
        {daysLeft}d
      </span>

      {/* Action buttons (revealed on hover) */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          className="rounded p-1 text-(muted) hover:text-(ink) hover:bg-(accent-soft) transition-colors cursor-pointer"
          title="Restore"
          onClick={onRestore}
        >
          <RotateCcw className="size-3" />
        </button>
        <button
          type="button"
          className="rounded p-1 text-(muted) hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
          title="Delete permanently"
          onClick={onDelete}
        >
          <X className="size-3" />
        </button>
      </div>
    </div>
  );
}
