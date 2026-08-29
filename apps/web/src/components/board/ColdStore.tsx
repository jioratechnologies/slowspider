"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronsDown, ChevronsUp, Play, Snowflake, Trash2, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category, Cluster, Task } from "@/lib/types";

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
        "stash overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] shadow-xs transition-all"
      )}
    >
      {/* Header */}
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-3 text-left select-none hover:bg-[var(--accent-soft)] transition-colors"
        onClick={onToggleOpen}
      >
        <div className="flex size-6.5 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--panel-2)] text-[var(--muted)]">
          <Snowflake className="size-3.5 text-[var(--ink)]" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium leading-tight text-[var(--ink)]">
            Cold Store
          </span>
          <span className="text-[11px] text-[var(--muted)]">Paused projects, kept for later</span>
        </div>
        {total > 0 && (
          <span className="rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-2 py-0.2 text-[10.5px] font-mono text-[var(--muted)]">
            {total}
          </span>
        )}
        <ChevronDown
          className={cn("size-3.5 shrink-0 text-[var(--muted)] transition-transform duration-200", open && "rotate-180")}
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
            <div className="border-t border-[var(--line)] px-3 py-2.5 space-y-2.5">
              {/* Cloud Archive Info Banner */}
              <div className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-2.5 py-1.5 text-[11px] text-[var(--muted)]">
                <span className="flex items-center gap-1.5 font-mono">
                  <Archive className="size-3 shrink-0" />
                  <span>Archived &amp; Compressed</span>
                </span>
                <span className="font-mono text-[10px] text-[var(--ink3)]">
                  &gt; 4mo
                </span>
              </div>

              {!total && (
                <p className="px-1 py-2 text-[11.5px] text-[var(--muted)] italic">
                  Nothing paused. Drag tasks or clusters here to pause them.
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
                        <span className="size-1.5 shrink-0 rounded-full" style={{ background: c.color }} />
                        <span className="flex-1 truncate text-[12.5px] font-medium text-[var(--ink)]">{c.name}</span>
                        <span className="shrink-0 text-[10px] text-[var(--muted)] font-mono border border-[var(--line)] bg-[var(--panel-2)] px-1.5 py-0.2 rounded">
                          Zipped
                        </span>
                        <span className="shrink-0 text-[10.5px] text-[var(--muted)] font-mono">
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
                        <span className="size-1.5 shrink-0 rounded-full bg-[var(--muted)]" />
                        <span className="flex-1 truncate text-[12.5px] text-[var(--ink)]">{title}</span>
                        <span className="shrink-0 text-[10px] text-[var(--muted)] font-mono border border-[var(--line)] bg-[var(--panel-2)] px-1.5 py-0.2 rounded">
                          Zipped
                        </span>
                        <span className="shrink-0 text-[10.5px] text-[var(--muted)] font-mono">
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
                        className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--line)] py-1 text-[11px] text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
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
        "stash-item group flex cursor-grab items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-2 touch-none active:cursor-grabbing transition-all hover:border-[var(--line-strong)] hover:bg-[var(--panel)] text-[var(--ink)]",
        frozen && "just-frozen ring-1 ring-[var(--ink)]"
      )}
      data-skind={skind}
      data-sid={sid}
      data-splace="cold"
    >
      {children}

      {/* Action buttons (revealed on hover) */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          className="rounded p-1 text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--accent-soft)] transition-colors cursor-pointer"
          title="Resume"
          onClick={onResume}
        >
          <Play className="size-3" />
        </button>
        <button
          type="button"
          className="rounded p-1 text-[var(--muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
          title="Move to bin"
          onClick={onBin}
        >
          <Trash2 className="size-3" />
        </button>
      </div>
    </div>
  );
}
