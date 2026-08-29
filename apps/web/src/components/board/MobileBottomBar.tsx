"use client";

import React from "react";
import { Plus, Calendar as CalendarIcon, Atom, Snowflake, Trash2 } from "lucide-react";
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
        aria-label="Mobile Dock"
        className="pointer-events-auto flex items-center justify-between w-full border-t border-[var(--line)] bg-[var(--bg)] px-2 py-1.5"
      >
        {/* Calendar */}
        <button
          type="button"
          onClick={onOpenCalendar}
          className={cn(
            "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 transition-colors cursor-pointer",
            calendarOpen
              ? "text-[var(--ink)]"
              : "text-[var(--ink3)] hover:text-[var(--ink)]"
          )}
        >
          <CalendarIcon className="size-4" />
          <span className="text-[9px] tracking-wide">Calendar</span>
        </button>

        {/* Cold Store */}
        <button
          type="button"
          data-drop="coldStore"
          onClick={onToggleCold}
          className={cn(
            "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 transition-colors cursor-pointer [&.dragover]:text-[var(--ink)]",
            coldOpen
              ? "text-[var(--ink)]"
              : "text-[var(--ink3)] hover:text-[var(--ink)]"
          )}
        >
          <div className="relative">
            <Snowflake className="size-4" />
            {coldCount > 0 && (
              <span className="absolute -top-1 -right-2 text-[8px] font-mono text-[var(--ink)]">
                {coldCount}
              </span>
            )}
          </div>
          <span className="text-[9px] tracking-wide">Cold</span>
        </button>

        {/* Central Add Button */}
        <button
          type="button"
          onClick={onQuickAdd}
          className="mx-1 flex size-10 shrink-0 items-center justify-center bg-[var(--ink)] text-[var(--bg)] cursor-pointer"
          title="Add new task"
        >
          <Plus className="size-4.5 stroke-[2]" />
        </button>

        {/* Research */}
        <button
          type="button"
          onClick={onOpenResearch}
          className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[var(--ink3)] hover:text-[var(--ink)] transition-colors cursor-pointer"
        >
          <Atom className="size-4" />
          <span className="text-[9px] tracking-wide">Research</span>
        </button>

        {/* Bin */}
        <button
          type="button"
          data-drop="dumpBin"
          onClick={onToggleBin}
          className={cn(
            "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 transition-colors cursor-pointer [&.dragover]:text-[var(--ink)]",
            binOpen
              ? "text-[var(--ink)]"
              : "text-[var(--ink3)] hover:text-[var(--ink)]"
          )}
        >
          <div className="relative">
            <Trash2 className="size-4" />
            {binCount > 0 && (
              <span className="absolute -top-1 -right-2 text-[8px] font-mono text-[var(--ink)]">
                {binCount}
              </span>
            )}
          </div>
          <span className="text-[9px] tracking-wide">Bin</span>
        </button>
      </nav>
    </div>
  );
}
