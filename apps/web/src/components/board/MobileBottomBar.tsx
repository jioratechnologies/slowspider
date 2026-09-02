"use client";

import React from "react";
import { Plus, CalendarDays, Atom, Snowflake, Trash2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileBottomBar({
  onQuickAdd,
  onOpenCalendar,
  onOpenResearch,
  onToggleCold,
  onToggleBin,
  coldCount = 0,
  binCount = 0,
  calendarOpen,
  coldOpen,
  binOpen,
}: {
  onQuickAdd: () => void;
  onOpenCalendar: () => void;
  onOpenResearch: () => void;
  onToggleCold: () => void;
  onToggleBin: () => void;
  coldCount?: number;
  binCount?: number;
  calendarOpen?: boolean;
  coldOpen?: boolean;
  binOpen?: boolean;
}) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 md:hidden pointer-events-none">
      <nav
        aria-label="Mobile Navigation Bar"
        className="pointer-events-auto flex items-center justify-around w-full border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#141417] px-2 py-2 shadow-[0_-8px_30px_rgba(0,0,0,0.25)] text-neutral-900 dark:text-neutral-100"
      >
        {/* Calendar */}
        <button
          type="button"
          onClick={onOpenCalendar}
          className={cn(
            "relative flex flex-1 flex-col items-center justify-center gap-1 py-1 px-1.5 rounded-xl transition-all cursor-pointer",
            calendarOpen
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold"
              : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          )}
        >
          <CalendarDays className="size-5 text-emerald-500" />
          <span className="text-[11px] font-semibold tracking-tight">Calendar</span>
        </button>

        {/* Cold Store / Freezer */}
        <button
          type="button"
          data-drop="coldStore"
          onClick={onToggleCold}
          className={cn(
            "relative flex flex-1 flex-col items-center justify-center gap-1 py-1 px-1.5 rounded-xl transition-all cursor-pointer",
            coldOpen
              ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold"
              : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          )}
        >
          <div className="relative">
            <Snowflake className="size-5 text-blue-500" />
            {coldCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-mono font-bold text-white shadow-xs">
                {coldCount}
              </span>
            )}
          </div>
          <span className="text-[11px] font-semibold tracking-tight">Freezer</span>
        </button>

        {/* Decorative Floating Central Add Button */}
        <div className="relative -top-5 flex flex-col items-center justify-center px-1">
          <button
            type="button"
            onClick={onQuickAdd}
            className="group relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white shadow-[0_8px_25px_rgba(99,102,241,0.55)] ring-4 ring-white dark:ring-[#141417] transition-all duration-200 active:scale-90 hover:scale-105 cursor-pointer"
            title="Create new task"
            aria-label="Add task"
          >
            {/* Ambient decorative glow ring */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-indigo-500 to-pink-500 opacity-0 group-hover:opacity-40 blur-sm transition-opacity" />
            <Plus className="size-7 stroke-[2.75] transition-transform duration-200 group-hover:rotate-90 text-white" />
          </button>
        </div>

        {/* Research Suite */}
        <button
          type="button"
          onClick={onOpenResearch}
          className="relative flex flex-1 flex-col items-center justify-center gap-1 py-1 px-1.5 rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-all cursor-pointer"
        >
          <Atom className="size-5 text-cyan-500" />
          <span className="text-[11px] font-semibold tracking-tight">Research</span>
        </button>

        {/* Dumping Bin */}
        <button
          type="button"
          data-drop="dumpBin"
          onClick={onToggleBin}
          className={cn(
            "relative flex flex-1 flex-col items-center justify-center gap-1 py-1 px-1.5 rounded-xl transition-all cursor-pointer",
            binOpen
              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold"
              : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          )}
        >
          <div className="relative">
            <Trash2 className="size-5 text-rose-500" />
            {binCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-mono font-bold text-white shadow-xs">
                {binCount}
              </span>
            )}
          </div>
          <span className="text-[11px] font-semibold tracking-tight">Bin</span>
        </button>
      </nav>
    </div>
  );
}
