"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownWideNarrow,
  ArrowLeft,
  Atom,
  Download,
  LogOut,
  Moon,
  PlusCircle,
  Search,
  Sun,
  Palette,
  Tags,
  Calendar as CalendarIcon,
  Bell,
  DownloadCloud,
  Upload,
  Users,
  X,
} from "lucide-react";
import InvitesNotification from "./InvitesNotification";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import ConstantsConverterModal from "../research/ConstantsConverterModal";
import type { WorkspaceRef } from "@/lib/workspace-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SortMode } from "@/lib/types";

export default function TopBar({
  workspaceId,
  workspaces,
  search,
  onSearchChange,
  sortMode,
  onToggleSort,
  calendarOpen,
  onToggleCalendar,
  onAddCluster,
  onManageCategories,
  onExportICS,
  onExportJSON,
  onImportData,
  onOpenCollaborators,
  theme,
  onCycleTheme,
  notifyState,
  onToggleNotify,
  installAvailable,
  onInstall,
  userEmail,
  onSignOut,
  onPinCalculator,
}: {
  workspaceId: number;
  workspaces: WorkspaceRef[];
  search: string;
  onSearchChange: (v: string) => void;
  sortMode: SortMode;
  onToggleSort: () => void;
  calendarOpen: boolean;
  onToggleCalendar: () => void;
  onAddCluster: () => void;
  onManageCategories: () => void;
  onExportICS: () => void;
  onExportJSON: () => void;
  onImportData: () => void;
  onOpenCollaborators: () => void;
  theme: "auto" | "light" | "dark";
  onCycleTheme: () => void;
  notifyState: "On" | "Off" | "Blocked";
  onToggleNotify: () => void;
  installAvailable: boolean;
  onInstall: () => void;
  userEmail: string;
  onSignOut: () => void;
  onPinCalculator?: () => void;
}) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [researchToolsOpen, setResearchToolsOpen] = useState(false);
  const [osShortcut, setOsShortcut] = useState("⌘K");
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);

  // OS detection for keyboard shortcut icon/badge
  useEffect(() => {
    const isMac =
      typeof navigator !== "undefined" &&
      /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent);
    setOsShortcut(isMac ? "⌘K" : "Ctrl K");
  }, []);

  // Global shortcut (Cmd+K / Ctrl+K) to focus search
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

  const userInitials = userEmail
    ? userEmail.slice(0, 2).toUpperCase()
    : "ME";

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-40 border-b border-zinc-200/80 dark:border-white/[0.08] bg-white/85 dark:bg-[#141416]/85 backdrop-blur-xl shadow-xs dark:shadow-[0_4px_24px_rgba(0,0,0,0.35)] relative"
    >
      {/* Mobile Full-Width Search Overlay */}
      <AnimatePresence>
        {mobileSearchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-0 z-50 flex md:hidden items-center gap-2 bg-white dark:bg-[#141416] px-3 py-2"
          >
            <button
              type="button"
              className="flex size-8 shrink-0 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/[0.08] dark:text-zinc-400"
              onClick={closeMobileSearch}
            >
              <ArrowLeft className="size-4.5" />
            </button>
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-zinc-300 dark:border-white/15 bg-zinc-50 dark:bg-white/[0.05] px-3 py-1.5 shadow-2xs">
              <Search className="size-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
              <input
                autoFocus
                type="text"
                placeholder="Search tasks, notes, clusters..."
                className="min-w-0 flex-1 border-0 bg-transparent text-[13.5px] text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && closeMobileSearch()}
              />
              {search && (
                <button
                  type="button"
                  className="shrink-0 text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200"
                  onClick={() => onSearchChange("")}
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto flex w-full max-w-375 items-center gap-2.5 px-4 py-2.5 sm:gap-3 sm:px-6 sm:py-2.5">
        {/* Brand section: Logo Icon + Slow Spider text label */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-white/[0.04] shadow-xs">
            <svg width="20" height="auto" viewBox="0 0 143 100" fill="none" role="img" aria-label="Slow Spider">
              <g stroke="currentColor" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-800 dark:text-zinc-100">
                <path d="M8 91 54 8 100 91" />
                <path d="M43 91 89 8 135 91" />
              </g>
              <circle cx="71.5" cy="87" r="11.5" className="fill-amber-400" />
            </svg>
          </div>
          <span className="hidden sm:inline-block font-semibold tracking-tight text-[16px] text-zinc-900 dark:text-zinc-100 [font-family:var(--serif)] select-none">
            Slow Spider
          </span>
        </div>

        {/* Divider on desktop */}
        <div className="hidden sm:block h-4 w-px bg-zinc-200 dark:bg-white/10" />

        {/* Workspace Switcher */}
        <WorkspaceSwitcher
          workspaceId={workspaceId}
          workspaces={workspaces}
          onOpenCollaborators={onOpenCollaborators}
        />

        {/* Desktop Permanent Search Bar with Device-Aware Shortcut Badge */}
        <div className="hidden md:flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/80 dark:bg-white/[0.03] px-2.5 py-1.5 w-36 lg:w-52 xl:w-64 transition-all focus-within:border-zinc-400 dark:focus-within:border-white/20 focus-within:bg-white dark:focus-within:bg-[#18181c] shadow-xs">
          <Search className="size-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
          <input
            ref={desktopSearchInputRef}
            type="text"
            placeholder="Search..."
            className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {search ? (
            <button
              type="button"
              className="shrink-0 text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200"
              onClick={() => onSearchChange("")}
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <kbd className="hidden lg:inline-flex items-center justify-center rounded-md border border-zinc-200/90 dark:border-white/10 bg-zinc-100 dark:bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-sans text-zinc-400 dark:text-zinc-500 select-none shadow-2xs">
              {osShortcut}
            </kbd>
          )}
        </div>

        {/* Right side Desktop Actions: Calendar -> Sort -> New Cluster -> Notification -> Theme Toggle -> User Avatar */}
        <div className="ml-auto hidden md:flex shrink-0 items-center gap-1.5 lg:gap-2">
          {/* 1. Calendar Button */}
          <button
            type="button"
            className={`flex h-8.5 items-center gap-1.5 rounded-xl border px-2.5 lg:px-3 text-[13px] font-medium transition-all ${
              calendarOpen
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-white/20 dark:bg-white/10 dark:text-white shadow-xs"
                : "border-zinc-200 dark:border-white/[0.08] bg-zinc-50/80 dark:bg-white/[0.03] text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-white/15 hover:bg-zinc-100 dark:hover:bg-white/[0.06] hover:text-zinc-900 dark:hover:text-white"
            }`}
            title="Calendar — tasks with a date"
            aria-pressed={calendarOpen}
            onClick={onToggleCalendar}
          >
            <CalendarIcon className="size-3.5 shrink-0" />
            <span className="hidden xl:inline">Calendar</span>
          </button>

          {/* 2. Sort Tasks Button (Between Calendar and Cluster) */}
          <button
            type="button"
            className={`flex h-8.5 items-center gap-1.5 rounded-xl border px-2.5 lg:px-3 text-[13px] font-medium transition-all ${
              sortMode === "manual"
                ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
                : "border-zinc-200 dark:border-white/[0.08] bg-zinc-50/80 dark:bg-white/[0.03] text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-white/15 hover:bg-zinc-100 dark:hover:bg-white/[0.06] hover:text-zinc-900 dark:hover:text-white"
            }`}
            title={`Task ordering: ${sortMode === "smart" ? "Smart Order" : "Manual Order"}. Click to toggle.`}
            onClick={onToggleSort}
          >
            <ArrowDownWideNarrow className="size-3.5 shrink-0" />
            <span className="hidden xl:inline">Sort: {sortMode === "smart" ? "Smart" : "Manual"}</span>
          </button>

          {/* 3. Research Tools Button (Physical constants & energy/optics converter) */}
          <button
            type="button"
            className="flex h-8.5 items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/80 dark:bg-white/[0.03] px-2.5 lg:px-3 text-[13px] font-medium text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-white/15 hover:bg-zinc-100 dark:hover:bg-white/[0.06] hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer shadow-2xs"
            title="Scientific Research Tools: Fundamental constants & optics/energy converter"
            onClick={() => setResearchToolsOpen(true)}
          >
            <Atom className="size-3.5 text-purple-500 shrink-0" />
            <span className="hidden 2xl:inline">Research Tools</span>
          </button>

          {/* 4. New Cluster Button */}
          <button
            type="button"
            className="flex h-8.5 items-center gap-1.5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white px-2.5 lg:px-3.5 text-[13px] font-medium shadow-xs transition-all"
            title="New cluster"
            onClick={onAddCluster}
          >
            <PlusCircle className="size-3.5 shrink-0" />
            <span className="hidden lg:inline">Cluster</span>
          </button>

          <InvitesNotification />

          {/* 4. Animated Theme Changer Toggle Button */}
          <button
            type="button"
            onClick={onCycleTheme}
            className="relative flex size-8.5 items-center justify-center rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/80 dark:bg-white/[0.02] text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-white/15 hover:bg-zinc-100 dark:hover:bg-white/[0.06] hover:text-zinc-900 dark:hover:text-white transition-all overflow-hidden"
            title={`Current theme: ${theme}. Click to switch theme.`}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={theme}
                initial={{ y: -12, opacity: 0, rotate: -45 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                exit={{ y: 12, opacity: 0, rotate: 45 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="flex items-center justify-center"
              >
                {theme === "dark" ? (
                  <Moon className="size-4 text-sky-400 fill-sky-400/20" />
                ) : theme === "light" ? (
                  <Sun className="size-4 text-amber-500 fill-amber-500/20" />
                ) : (
                  <Palette className="size-4 text-zinc-500 dark:text-zinc-400" />
                )}
              </motion.div>
            </AnimatePresence>
          </button>

          {/* 5. User Avatar Menu (Replaces gear icon) */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex size-8.5 items-center justify-center rounded-xl border border-zinc-200 dark:border-white/15 bg-gradient-to-tr from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-[12px] tracking-tight outline-none shadow-xs transition-all hover:scale-105 hover:ring-2 hover:ring-zinc-400/30 dark:hover:ring-white/20"
              title={`Account: ${userEmail}`}
            >
              <span>{userInitials}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-72 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#16161a] p-1.5 shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl text-zinc-900 dark:text-zinc-200">
              <div className="truncate px-3 py-2 text-[12.5px] font-medium border-b border-zinc-100 dark:border-white/[0.08] mb-1">
                <span className="block text-[11px] font-normal uppercase font-mono text-zinc-400 dark:text-zinc-500">Signed in as</span>
                <span className="text-zinc-900 dark:text-zinc-100 truncate block">{userEmail}</span>
              </div>

              {installAvailable && (
                <>
                  <DropdownMenuItem onClick={onInstall} className="rounded-xl px-2.5 py-2 text-[13px] hover:bg-zinc-100 dark:hover:bg-white/[0.08] cursor-pointer">
                    <DownloadCloud className="size-4 mr-2 text-zinc-500 dark:text-zinc-400" /> Install app
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-zinc-100 dark:bg-white/[0.08] my-1" />
                </>
              )}

              <DropdownMenuGroup>
                <DropdownMenuLabel className="px-2.5 py-1 text-[11px] uppercase font-mono text-zinc-400 dark:text-zinc-500">Preferences</DropdownMenuLabel>
                <DropdownMenuItem onClick={onToggleNotify} className="rounded-xl px-2.5 py-2 text-[13px] hover:bg-zinc-100 dark:hover:bg-white/[0.08] cursor-pointer">
                  <Bell className="size-4 mr-2 text-zinc-500 dark:text-zinc-400" /> Browser reminders
                  <span className="ml-auto font-mono text-xs text-zinc-400 dark:text-zinc-500">{notifyState}</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-zinc-100 dark:bg-white/[0.08] my-1" />

              <DropdownMenuGroup>
                <DropdownMenuLabel className="px-2.5 py-1 text-[11px] uppercase font-mono text-zinc-400 dark:text-zinc-500">Organize</DropdownMenuLabel>
                <DropdownMenuItem onClick={onManageCategories} className="rounded-xl px-2.5 py-2 text-[13px] hover:bg-zinc-100 dark:hover:bg-white/[0.08] cursor-pointer">
                  <Tags className="size-4 mr-2 text-zinc-500 dark:text-zinc-400" /> Manage categories…
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-zinc-100 dark:bg-white/[0.08] my-1" />

              <DropdownMenuGroup>
                <DropdownMenuLabel className="px-2.5 py-1 text-[11px] uppercase font-mono text-zinc-400 dark:text-zinc-500">Your data</DropdownMenuLabel>
                <DropdownMenuItem onClick={onExportJSON} className="rounded-xl px-2.5 py-2 text-[13px] hover:bg-zinc-100 dark:hover:bg-white/[0.08] cursor-pointer">
                  <Download className="size-4 mr-2 text-zinc-500 dark:text-zinc-400" /> Export backup (JSON)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onImportData} className="rounded-xl px-2.5 py-2 text-[13px] hover:bg-zinc-100 dark:hover:bg-white/[0.08] cursor-pointer">
                  <Upload className="size-4 mr-2 text-zinc-500 dark:text-zinc-400" /> Import backup (JSON)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExportICS} className="rounded-xl px-2.5 py-2 text-[13px] hover:bg-zinc-100 dark:hover:bg-white/[0.08] cursor-pointer">
                  <CalendarIcon className="size-4 mr-2 text-zinc-500 dark:text-zinc-400" /> Add deadlines to calendar (.ics)
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-zinc-100 dark:bg-white/[0.08] my-1" />

              <DropdownMenuItem onClick={onSignOut} className="rounded-xl px-2.5 py-2 text-[13px] text-rose-500 hover:bg-rose-500/10 cursor-pointer">
                <LogOut className="size-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile Action Buttons */}
        <div className="flex md:hidden shrink-0 items-center gap-1.5 ml-auto">
          {/* Mobile Search Button */}
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-white/[0.02] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            title="Search"
            onClick={() => setMobileSearchOpen(true)}
          >
            <Search className="size-4" />
          </button>

          <InvitesNotification />

          {/* User Avatar Menu on Mobile */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex size-8 items-center justify-center rounded-xl border border-zinc-200 dark:border-white/15 bg-gradient-to-tr from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-[11px] outline-none shadow-xs"
              title={`Account: ${userEmail}`}
            >
              <span>{userInitials}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-72 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#16161a] p-1.5 shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl text-zinc-900 dark:text-zinc-200">
              <div className="truncate px-3 py-2 text-[12.5px] font-medium border-b border-zinc-100 dark:border-white/[0.08] mb-1">
                <span className="block text-[11px] font-normal uppercase font-mono text-zinc-400 dark:text-zinc-500">Signed in as</span>
                <span className="text-zinc-900 dark:text-zinc-100 truncate block">{userEmail}</span>
              </div>

              {/* Theme Toggle in Menu */}
              <DropdownMenuItem onClick={onCycleTheme} className="rounded-xl px-2.5 py-2 text-[13px] hover:bg-zinc-100 dark:hover:bg-white/[0.08] cursor-pointer">
                {theme === "dark" ? <Moon className="size-4 mr-2 text-sky-400" /> : <Sun className="size-4 mr-2 text-amber-500" />}
                <span>Theme: <strong className="capitalize">{theme}</strong></span>
              </DropdownMenuItem>

              {/* Quick Actions in Menu */}
              <DropdownMenuItem onClick={onAddCluster} className="rounded-xl px-2.5 py-2 text-[13px] hover:bg-zinc-100 dark:hover:bg-white/[0.08] cursor-pointer">
                <PlusCircle className="size-4 mr-2 text-zinc-500 dark:text-zinc-400" /> New Cluster
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleSort} className="rounded-xl px-2.5 py-2 text-[13px] hover:bg-zinc-100 dark:hover:bg-white/[0.08] cursor-pointer">
                <ArrowDownWideNarrow className="size-4 mr-2 text-zinc-500 dark:text-zinc-400" /> Task Sort: {sortMode === "smart" ? "Smart" : "Manual"}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-100 dark:bg-white/[0.08] my-1" />

              {installAvailable && (
                <>
                  <DropdownMenuItem onClick={onInstall} className="rounded-xl px-2.5 py-2 text-[13px] hover:bg-zinc-100 dark:hover:bg-white/[0.08] cursor-pointer">
                    <DownloadCloud className="size-4 mr-2 text-zinc-500 dark:text-zinc-400" /> Install app
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-zinc-100 dark:bg-white/[0.08] my-1" />
                </>
              )}

              <DropdownMenuGroup>
                <DropdownMenuLabel className="px-2.5 py-1 text-[11px] uppercase font-mono text-zinc-400 dark:text-zinc-500">Preferences</DropdownMenuLabel>
                <DropdownMenuItem onClick={onToggleNotify} className="rounded-xl px-2.5 py-2 text-[13px] hover:bg-zinc-100 dark:hover:bg-white/[0.08] cursor-pointer">
                  <Bell className="size-4 mr-2 text-zinc-500 dark:text-zinc-400" /> Browser reminders
                  <span className="ml-auto font-mono text-xs text-zinc-400 dark:text-zinc-500">{notifyState}</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-zinc-100 dark:bg-white/[0.08] my-1" />

              <DropdownMenuGroup>
                <DropdownMenuLabel className="px-2.5 py-1 text-[11px] uppercase font-mono text-zinc-400 dark:text-zinc-500">Organize</DropdownMenuLabel>
                <DropdownMenuItem onClick={onManageCategories} className="rounded-xl px-2.5 py-2 text-[13px] hover:bg-zinc-100 dark:hover:bg-white/[0.08] cursor-pointer">
                  <Tags className="size-4 mr-2 text-zinc-500 dark:text-zinc-400" /> Manage categories…
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-zinc-100 dark:bg-white/[0.08] my-1" />

              <DropdownMenuGroup>
                <DropdownMenuLabel className="px-2.5 py-1 text-[11px] uppercase font-mono text-zinc-400 dark:text-zinc-500">Your data</DropdownMenuLabel>
                <DropdownMenuItem onClick={onExportJSON} className="rounded-xl px-2.5 py-2 text-[13px] hover:bg-zinc-100 dark:hover:bg-white/[0.08] cursor-pointer">
                  <Download className="size-4 mr-2 text-zinc-500 dark:text-zinc-400" /> Export backup (JSON)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onImportData} className="rounded-xl px-2.5 py-2 text-[13px] hover:bg-zinc-100 dark:hover:bg-white/[0.08] cursor-pointer">
                  <Upload className="size-4 mr-2 text-zinc-500 dark:text-zinc-400" /> Import backup (JSON)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExportICS} className="rounded-xl px-2.5 py-2 text-[13px] hover:bg-zinc-100 dark:hover:bg-white/[0.08] cursor-pointer">
                  <CalendarIcon className="size-4 mr-2 text-zinc-500 dark:text-zinc-400" /> Add deadlines to calendar (.ics)
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-zinc-100 dark:bg-white/[0.08] my-1" />

              <DropdownMenuItem onClick={onSignOut} className="rounded-xl px-2.5 py-2 text-[13px] text-rose-500 hover:bg-rose-500/10 cursor-pointer">
                <LogOut className="size-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ConstantsConverterModal
        open={researchToolsOpen}
        onClose={() => setResearchToolsOpen(false)}
        onPinCalculator={onPinCalculator}
      />
    </motion.header>
  );
}
