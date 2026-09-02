"use client";

import { useEffect, useRef, useState } from "react";
import { Inbox, Pin, PinOff, ChevronDown, ChevronUp } from "lucide-react";
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
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [sticky, setSticky] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

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

  const showSticky = sticky && tasks.length > 0 && allowSticky;

  return (
    <>
      {/* Sentinel for sticky floating toolbar */}
      <div ref={sentinelRef} className="h-px w-full" aria-hidden />

      {/* Sticky Compact Bar on Scroll — solid, contained, not overlapping grid */}
      <div className="sticky top-[60px] z-20 h-0 w-full overflow-visible pointer-events-none">
        <AnimatePresence>
          {showSticky && (
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="mx-auto w-fit max-w-[min(92vw,560px)] pt-2 pointer-events-auto"
            >
              <div className="rounded-xl border border-(line) bg-(panel) p-1.5 pl-3 pr-2 flex items-center gap-3 shadow-lg text-(ink)">
                <div className="flex shrink-0 items-center gap-1.5 text-xs font-medium">
                  <Inbox className="size-3.5 text-(muted)" />
                  <span className="font-mono">{tasks.length}</span>
                </div>
                <div className="h-5 w-px bg-(line) shrink-0" />
                <div className="flex gap-2 overflow-x-auto no-scrollbar items-center max-w-[360px]">
                  {tasks.map((t) => (
                    <div key={t.id} className="w-[200px] shrink-0">
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

      {/* Main Tray Area */}
      <section
        className="tray mb-4 rounded-xl border border-(line) bg-(panel) p-3 shadow-xs transition-all"
        id="tray"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-(ink)">
              <Inbox className="size-3.5 text-(muted)" />
              Floating Inbox
            </span>
            <span className="rounded-full border border-(line) bg-(panel-2) px-2 py-0.2 text-[10.5px] font-mono text-(muted)">
              {tasks.length}
            </span>
            <span className="hidden sm:inline text-[11px] text-(muted)">
              — unsorted tasks
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleStickyPreference}
              className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 text-[11px] text-(muted) hover:text-(ink) transition-colors cursor-pointer"
              title={allowSticky ? "Disable sticky bar on scroll" : "Enable sticky bar on scroll"}
            >
              {allowSticky ? <PinOff className="size-3" /> : <Pin className="size-3" />}
            </button>

            {tasks.length > 0 && (
              <button
                type="button"
                onClick={() => setCollapsed((v) => !v)}
                className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] text-(muted) hover:text-(ink) transition-colors cursor-pointer"
              >
                {collapsed ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Task cards or subtle empty dropzone */}
        {!collapsed && (
          <div className="mt-2.5">
            {tasks.length ? (
              <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                <AnimatePresence initial={false}>
                  {tasks.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      noteCount={noteCount(t.id)}
                      mediaNotes={mediaNotes(t.id)}
                      onToggle={onToggle}
                      onEdit={onEdit}
                      onEditNotes={onEditNotes}
                      onDelete={onDelete}
                      onToggleStar={onToggleStar}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex h-12 items-center justify-center rounded-lg border border-dashed border-(line) bg-(bg) text-[11.5px] text-(muted) italic">
                Drop unsorted tasks here
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}
