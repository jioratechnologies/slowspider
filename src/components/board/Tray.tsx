"use client";

import { useEffect, useRef, useState } from "react";
import { Inbox, Pin, PinOff } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import TaskCard from "./TaskCard";
import type { Task, Note } from "@/lib/types";

export default function Tray({
  tasks,
  noteCount,
  mediaNotes,
  onToggle,
  onEdit,
  onEditNotes,
  onDelete,
  onToggleStar,
}: {
  tasks: Task[];
  noteCount: (taskId: number) => number;
  mediaNotes: (taskId: number) => Note[];
  onToggle: (id: number) => void;
  onEdit: (id: number, directEdit?: boolean) => void;
  onEditNotes: (id: number) => void;
  onDelete: (id: number) => void;
  onToggleStar: (id: number) => void;
}) {
  // Sentinel ref: when this div scrolls off the top, we show the sticky compact bar
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [sticky, setSticky] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setSticky(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-1px 0px 0px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const [allowSticky, setAllowSticky] = useState(true);
  useEffect(() => {
    const saved = localStorage.getItem("slowspider_tray_sticky");
    if (saved !== null) setAllowSticky(saved === "true");
  }, []);

  function toggleStickyPreference() {
    const next = !allowSticky;
    setAllowSticky(next);
    localStorage.setItem("slowspider_tray_sticky", String(next));
  }

  // Don't show sticky bar when no tasks or when disabled by user
  const showSticky = sticky && tasks.length > 0 && allowSticky;

  return (
    <>
      {/* Sentinel: invisible 1px element sitting right at the top of the tray */}
      <div ref={sentinelRef} className="h-px w-full" aria-hidden />

      {/* ── Sticky compact bar (zero-height wrapper prevents layout shift jitter) ── */}
      <div className="sticky top-[70px] sm:top-[80px] z-30 h-0 w-full overflow-visible">
        <AnimatePresence>
          {showSticky && (
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto w-fit max-w-full pt-1"
            >
            <div className="rounded-2xl border border-border/50 bg-background/65 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-2 pl-3.5 pr-2.5 flex items-center gap-3.5">
              <div className="flex shrink-0 flex-col items-center justify-center gap-1">
                <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Inbox className="size-3.5" />
                </div>
                <span className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-widest">{tasks.length} FLT</span>
              </div>
              <div className="h-10 w-px bg-border/50 shrink-0" />
              {/* Horizontal scrollable row of compact cards */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x items-center">
                {tasks.map((t) => (
                  <div key={t.id} className="w-[220px] shrink-0 snap-start">
                    <TaskCard
                      task={t}
                      noteCount={noteCount(t.id)}
                      mediaNotes={mediaNotes(t.id)}
                      onToggle={onToggle}
                      onEdit={onEdit}
                      onEditNotes={onEditNotes}
                      onDelete={onDelete}
                      onToggleStar={onToggleStar}
                    />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* ── Normal inline tray ────────────────────────────────────────── */}
      <section
        className="tray mb-4 rounded-2xl border border-zinc-200/90 dark:border-white/[0.08] bg-zinc-50/60 dark:bg-[#16161a]/85 p-3.5 shadow-xs dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)] backdrop-blur-md transition-all"
        id="tray"
      >
        <div className="mb-3 flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="flex items-center gap-2 text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
            <Inbox className="size-4 text-zinc-500 dark:text-zinc-400" />
            Floating
          </span>
          <span className="text-[11.5px] text-zinc-500 dark:text-zinc-400">
            Unsorted tasks — drag into a cluster when ready.
          </span>
          <button
            onClick={toggleStickyPreference}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 transition-colors hover:bg-zinc-100 dark:hover:bg-white/[0.08] hover:text-zinc-900 dark:hover:text-zinc-200"
            title={allowSticky ? "Disable sticky floating bar on scroll" : "Enable sticky floating bar on scroll"}
          >
            {allowSticky ? <PinOff className="size-3" /> : <Pin className="size-3" />}
            {allowSticky ? "Unpin on scroll" : "Pin on scroll"}
          </button>
        </div>
        <div className="flex min-h-11 flex-wrap items-start gap-2">
          {tasks.length ? (
            <AnimatePresence initial={false}>
              {tasks.map((t) => (
                <div key={t.id} className="w-full sm:w-64">
                  <TaskCard
                    task={t}
                    noteCount={noteCount(t.id)}
                    mediaNotes={mediaNotes(t.id)}
                    onToggle={onToggle}
                    onEdit={onEdit}
                    onEditNotes={onEditNotes}
                    onDelete={onDelete}
                    onToggleStar={onToggleStar}
                  />
                </div>
              ))}
            </AnimatePresence>
          ) : (
            <div className="w-full rounded-xl border border-dashed border-zinc-200 dark:border-white/[0.06] bg-white/50 dark:bg-white/[0.01] px-4 py-3 text-center text-[12.5px] text-zinc-500 italic">
              Nothing floating. New tasks appear here first.
            </div>
          )}
        </div>
      </section>
    </>
  );
}
