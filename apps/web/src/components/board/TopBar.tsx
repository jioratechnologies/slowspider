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
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bg)]">
      {/* Mobile Full-Width Search Overlay */}
      <AnimatePresence>
        {mobileSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute inset-0 z-50 flex items-center gap-3 bg-[var(--bg)] px-4 py-2.5 md:hidden"
          >
            <button
              type="button"
              className="flex size-8 shrink-0 items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
              onClick={closeMobileSearch}
            >
              <ArrowLeft className="size-4" />
            </button>
            <div className="flex flex-1 items-center gap-2 border-b border-[var(--line)] pb-1">
              <Search className="size-3.5 shrink-0 text-[var(--muted)]" />
              <input
                autoFocus
                type="text"
                placeholder="Search tasks, notes, clusters…"
                className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink3)]"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && closeMobileSearch()}
              />
              {search && (
                <button
                  type="button"
                  className="shrink-0 text-[var(--muted)] hover:text-[var(--ink)]"
                  onClick={() => onSearchChange("")}
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto flex w-full max-w-[1600px] items-center gap-4 px-4 py-2.5 sm:px-6">
        {/* Mobile-only brand + menu — the sidebar owns these on desktop */}
        <button
          type="button"
          onClick={onMenu}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--panel-2)] hover:text-[var(--ink)] transition-colors lg:hidden"
          title="Menu"
        >
          <Menu className="size-4.5" />
        </button>
        <svg
          width="17"
          height="auto"
          viewBox="0 0 143 100"
          fill="none"
          role="img"
          aria-label="Slow Spider"
          className="shrink-0 lg:hidden"
        >
          <g stroke="currentColor" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--ink)]">
            <path d="M8 91 54 8 100 91" />
            <path d="M43 91 89 8 135 91" />
          </g>
          <circle cx="71.5" cy="87" r="11.5" className="fill-[var(--logo-dot)]" />
        </svg>

        {/* Desktop Search — underlined input */}
        <div className="hidden min-w-0 flex-1 md:flex md:max-w-md items-center gap-2 border-b border-[var(--line)] pb-0.5 transition-colors focus-within:border-[var(--ink)]">
          <Search className="size-3.5 shrink-0 text-[var(--muted)]" />
          <input
            ref={desktopSearchInputRef}
            type="text"
            placeholder="Search tasks, notes, clusters…"
            className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--ink3)]"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {search ? (
            <button
              type="button"
              className="shrink-0 text-[var(--muted)] hover:text-[var(--ink)]"
              onClick={() => onSearchChange("")}
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <kbd className="inline-flex shrink-0 items-center justify-center px-1 py-0.5 text-[10px] font-mono text-[var(--ink3)] select-none">
              {osShortcut}
            </kbd>
          )}
        </div>

        {/* Right actions */}
        <div className="ml-auto flex shrink-0 items-center gap-3">
          {/* Sort */}
          <button
            type="button"
            className={`flex items-center gap-1.5 text-[13px] transition-colors ${
              sortMode === "manual"
                ? "text-[var(--ink)] font-medium"
                : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
            title={`Task ordering: ${sortMode === "smart" ? "Smart Order" : "Manual Order"}. Click to toggle.`}
            onClick={onToggleSort}
          >
            <ArrowDownWideNarrow className="size-3.5 shrink-0" />
            <span className="hidden sm:inline">Sort: {sortMode === "smart" ? "Smart" : "Manual"}</span>
          </button>

          <InvitesNotification />

          {/* Mobile search trigger */}
          <button
            type="button"
            className="flex size-8 items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] transition-colors md:hidden"
            title="Search"
            onClick={() => setMobileSearchOpen(true)}
          >
            <Search className="size-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
