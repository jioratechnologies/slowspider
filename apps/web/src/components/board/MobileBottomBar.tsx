"use client";

import React from "react";
import { Plus, Calendar as CalendarIcon, Atom, Snowflake, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
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
    <div className="fixed bottom-4 inset-x-0 z-40 md:hidden flex justify-center px-4 pointer-events-none">
      <nav
        aria-label="Mobile Dock"
        className="pointer-events-auto flex items-center justify-between w-full max-w-sm rounded-3xl border border-zinc-200/90 dark:border-white/[0.12] bg-white/90 dark:bg-[#141418]/90 p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.65)] backdrop-blur-2xl transition-all"
      >
        {/* 1. Calendar Tab */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          type="button"
          onClick={onOpenCalendar}
          className={cn(
            "relative flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-1.5 transition-all cursor-pointer",
            calendarOpen
              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
          )}
        >
          <CalendarIcon className="size-4.5" />
          <span className="text-[10px] font-medium tracking-tight">Calendar</span>
        </motion.button>

        {/* 2. Cold Store Tab (Drop Target) */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          type="button"
          data-drop="coldStore"
          onClick={onToggleCold}
          className={cn(
            "relative flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-1.5 transition-all cursor-pointer [&.dragover]:bg-sky-500/20 [&.dragover]:ring-2 [&.dragover]:ring-sky-500",
            coldOpen
              ? "bg-sky-500/10 text-sky-500 dark:text-sky-400 font-semibold"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
          )}
        >
          <div className="relative">
            <Snowflake className="size-4.5" />
            {coldCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 flex size-4 items-center justify-center rounded-full bg-sky-500 text-[9px] font-bold text-white font-mono shadow-xs ring-2 ring-white dark:ring-[#141418]">
                {coldCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium tracking-tight">Cold</span>
        </motion.button>

        {/* 3. Central Prominent '+ Add' Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          type="button"
          onClick={onQuickAdd}
          className="mx-1 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-zinc-900 via-zinc-800 to-zinc-700 dark:from-white dark:via-zinc-100 dark:to-zinc-200 text-white dark:text-zinc-900 shadow-md dark:shadow-[0_4px_16px_rgba(255,255,255,0.2)] cursor-pointer"
          title="Add new task"
        >
          <Plus className="size-5 stroke-[2.75]" />
        </motion.button>

        {/* 4. Research Suite Tab */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          type="button"
          onClick={onOpenResearch}
          className="relative flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-1.5 text-zinc-500 dark:text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 transition-all cursor-pointer"
        >
          <Atom className="size-4.5 text-purple-500" />
          <span className="text-[10px] font-medium tracking-tight">Research</span>
        </motion.button>

        {/* 5. Dumping Bin Tab (Drop Target) */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          type="button"
          data-drop="dumpBin"
          onClick={onToggleBin}
          className={cn(
            "relative flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-1.5 transition-all cursor-pointer [&.dragover]:bg-rose-500/20 [&.dragover]:ring-2 [&.dragover]:ring-rose-500",
            binOpen
              ? "bg-rose-500/10 text-rose-500 dark:text-rose-400 font-semibold"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
          )}
        >
          <div className="relative">
            <Trash2 className="size-4.5" />
            {binCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white font-mono shadow-xs ring-2 ring-white dark:ring-[#141418]">
                {binCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium tracking-tight">Bin</span>
        </motion.button>
      </nav>
    </div>
  );
}
