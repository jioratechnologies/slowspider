"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownWideNarrow, ArrowLeft, Menu, Search, X } from "lucide-react";
import InvitesNotification from "./InvitesNotification";
import type { SortMode } from "@/lib/types";

export default function TopBar({
  search,
  onSearchChange,
  sortMode,
  onToggleSort,
  onMenu,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  sortMode: SortMode;
  onToggleSort: () => void;
  onMenu: () => void;
}) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [osShortcut, setOsShortcut] = useState("⌘K");
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const isMac =
      typeof navigator !== "undefined" &&
      /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent);
    setOsShortcut(isMac ? "⌘K" : "Ctrl K");
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        desktopSearchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function closeMobileSearch() {
    setMobileSearchOpen(false);
    onSearchChange("");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111114]">
      {/* Mobile Full-Width Search Overlay */}
      <AnimatePresence>
        {mobileSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute inset-0 z-50 flex items-center gap-3 bg-white dark:bg-[#111114] px-4 py-3 md:hidden"
          >
            <button
              type="button"
              className="flex size-9 shrink-0 items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
              onClick={closeMobileSearch}
            >
              <ArrowLeft className="size-5" />
            </button>
            <div className="flex flex-1 items-center gap-2 border-b border-neutral-300 dark:border-neutral-700 pb-1.5">
              <Search className="size-4 shrink-0 text-neutral-500" />
              <input
                autoFocus
                type="text"
                placeholder="Search tasks, notes, clusters…"
                className="min-w-0 flex-1 border-0 bg-transparent text-sm font-medium text-neutral-900 dark:text-neutral-100 outline-none placeholder:text-neutral-400"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && closeMobileSearch()}
              />
              {search && (
                <button
                  type="button"
                  className="shrink-0 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 p-1"
                  onClick={() => onSearchChange("")}
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto flex w-full max-w-[1600px] items-center gap-4 px-4 py-3 sm:px-6">
        {/* Mobile-only brand + menu */}
        <button
          type="button"
          onClick={onMenu}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors lg:hidden cursor-pointer"
          title="Menu"
        >
          <Menu className="size-5" />
        </button>
        <svg
          width="20"
          height="auto"
          viewBox="0 0 143 100"
          fill="none"
          role="img"
          aria-label="Slow Spider"
          className="shrink-0 lg:hidden"
        >
          <g stroke="currentColor" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-900 dark:text-neutral-100">
            <path d="M8 91 54 8 100 91" />
            <path d="M43 91 89 8 135 91" />
          </g>
          <circle cx="71.5" cy="87" r="11.5" className="fill-amber-500" />
        </svg>

        {/* Desktop Search — Modern Pill Input */}
        <div className="hidden min-w-0 flex-1 md:flex md:max-w-lg items-center gap-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700/80 bg-neutral-50 dark:bg-neutral-900/60 px-3.5 py-1.5 transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 shadow-2xs">
          <Search className="size-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
          <input
            ref={desktopSearchInputRef}
            type="text"
            placeholder="Search tasks, notes, clusters…"
            className="min-w-0 flex-1 border-0 bg-transparent text-sm font-medium text-neutral-900 dark:text-neutral-100 outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {search ? (
            <button
              type="button"
              className="shrink-0 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 cursor-pointer"
              onClick={() => onSearchChange("")}
            >
              <X className="size-4" />
            </button>
          ) : (
            <kbd className="inline-flex shrink-0 items-center justify-center rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-1.5 py-0.5 text-xs font-mono font-semibold text-neutral-500 dark:text-neutral-400 select-none">
              {osShortcut}
            </kbd>
          )}
        </div>

        {/* Right actions */}
        <div className="ml-auto flex shrink-0 items-center gap-3">
          {/* Sort */}
          <button
            type="button"
            className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              sortMode === "manual"
                ? "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                : "border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/60 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            }`}
            title={`Task ordering: ${sortMode === "smart" ? "Smart Order" : "Manual Order"}. Click to toggle.`}
            onClick={onToggleSort}
          >
            <ArrowDownWideNarrow className="size-4 shrink-0" />
            <span className="hidden sm:inline">Sort: {sortMode === "smart" ? "Smart" : "Manual"}</span>
          </button>

          <InvitesNotification />

          {/* Mobile search trigger */}
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors md:hidden"
            title="Search"
            onClick={() => setMobileSearchOpen(true)}
          >
            <Search className="size-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
