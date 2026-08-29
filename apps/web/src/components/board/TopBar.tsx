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

  const userInitials = userEmail
    ? userEmail.slice(0, 2).toUpperCase()
    : "ME";

  return (
    <header
      className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bg)]"
    >
      {/* Mobile Full-Width Search Overlay */}
      <AnimatePresence>
        {mobileSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute inset-0 z-50 flex md:hidden items-center gap-3 bg-[var(--bg)] px-4 py-2.5"
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

      <div className="mx-auto flex w-full max-w-375 items-center gap-4 px-5 py-3 sm:px-8">
        {/* Brand: Floating logo mark + serif text */}
        <div className="flex items-center gap-3 shrink-0">
          <svg width="18" height="auto" viewBox="0 0 143 100" fill="none" role="img" aria-label="Slow Spider">
            <g stroke="currentColor" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--ink)]">
              <path d="M8 91 54 8 100 91" />
              <path d="M43 91 89 8 135 91" />
            </g>
            <circle cx="71.5" cy="87" r="11.5" className="fill-[var(--muted)]" />
          </svg>
          <span className="hidden sm:inline-block font-normal tracking-wide text-[15px] text-[var(--ink)] [font-family:var(--serif)] select-none">
            Slow Spider
          </span>
        </div>

        {/* Thin divider */}
        <div className="hidden sm:block h-4 w-px bg-[var(--line)]" />

        {/* Workspace Switcher */}
        <WorkspaceSwitcher
          workspaceId={workspaceId}
          workspaces={workspaces}
          onOpenCollaborators={onOpenCollaborators}
        />

        {/* Desktop Search — underlined input */}
        <div className="hidden md:flex items-center gap-2 border-b border-[var(--line)] pb-0.5 w-36 lg:w-52 xl:w-64 transition-colors focus-within:border-[var(--ink)]">
          <Search className="size-3.5 shrink-0 text-[var(--muted)]" />
          <input
            ref={desktopSearchInputRef}
            type="text"
            placeholder="Search…"
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
            <kbd className="hidden lg:inline-flex items-center justify-center px-1 py-0.5 text-[10px] font-mono text-[var(--ink3)] select-none">
              {osShortcut}
            </kbd>
          )}
        </div>

        {/* Right side Desktop Actions — plain text-style buttons */}
        <div className="ml-auto hidden md:flex shrink-0 items-center gap-3 lg:gap-4">
          {/* Calendar */}
          <button
            type="button"
            className={`flex items-center gap-1.5 text-[13px] transition-colors ${
              calendarOpen
                ? "text-[var(--ink)] font-medium"
                : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
            title="Calendar — tasks with a date"
            aria-pressed={calendarOpen}
            onClick={onToggleCalendar}
          >
            <CalendarIcon className="size-3.5 shrink-0" />
            <span className="hidden xl:inline">Calendar</span>
          </button>

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
            <span className="hidden xl:inline">Sort: {sortMode === "smart" ? "Smart" : "Manual"}</span>
          </button>

          {/* Research Tools */}
          <button
            type="button"
            className="flex items-center gap-1.5 text-[13px] text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
            title="Scientific Research Tools"
            onClick={() => setResearchToolsOpen(true)}
          >
            <Atom className="size-3.5 shrink-0" />
            <span className="hidden 2xl:inline">Research</span>
          </button>

          {/* New Cluster — primary action */}
          <button
            type="button"
            className="flex items-center gap-1.5 bg-[var(--ink)] text-[var(--bg)] px-3 py-1.5 text-[13px] font-normal hover:opacity-80 transition-opacity"
            title="New cluster"
            onClick={onAddCluster}
          >
            <PlusCircle className="size-3.5 shrink-0" />
            <span className="hidden lg:inline">Cluster</span>
          </button>

          <InvitesNotification />

          {/* Theme Toggle — minimal */}
          <button
            type="button"
            onClick={onCycleTheme}
            className="flex size-8 items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
            title={`Current theme: ${theme}`}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={theme}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-center"
              >
                {theme === "dark" ? (
                  <Moon className="size-4" />
                ) : theme === "light" ? (
                  <Sun className="size-4" />
                ) : (
                  <Palette className="size-4" />
                )}
              </motion.div>
            </AnimatePresence>
          </button>

          {/* User Avatar — thin circle, serif initials */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex size-8 items-center justify-center rounded-full border border-[var(--line)] text-[var(--ink)] text-[12px] [font-family:var(--serif)] tracking-tight outline-none transition-colors hover:border-[var(--ink)]"
              title={`Account: ${userEmail}`}
            >
              <span>{userInitials}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-64 border border-[var(--line)] bg-[var(--bg)] p-1.5 text-[var(--ink)]">
              <div className="truncate px-3 py-2 text-[12.5px] border-b border-[var(--line)] mb-1">
                <span className="block text-[10px] uppercase tracking-widest text-[var(--muted)]">Signed in as</span>
                <span className="text-[var(--ink)] truncate block">{userEmail}</span>
              </div>

              {installAvailable && (
                <>
                  <DropdownMenuItem onClick={onInstall} className="px-3 py-2 text-[13px] cursor-pointer">
                    <DownloadCloud className="size-4 mr-2 text-[var(--muted)]" /> Install app
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[var(--line)] my-1" />
                </>
              )}

              <DropdownMenuGroup>
                <DropdownMenuLabel className="px-3 py-1 text-[10px] uppercase tracking-widest text-[var(--muted)]">Preferences</DropdownMenuLabel>
                <DropdownMenuItem onClick={onToggleNotify} className="px-3 py-2 text-[13px] cursor-pointer">
                  <Bell className="size-4 mr-2 text-[var(--muted)]" /> Browser reminders
                  <span className="ml-auto font-mono text-xs text-[var(--ink3)]">{notifyState}</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-[var(--line)] my-1" />

              <DropdownMenuGroup>
                <DropdownMenuLabel className="px-3 py-1 text-[10px] uppercase tracking-widest text-[var(--muted)]">Organize</DropdownMenuLabel>
                <DropdownMenuItem onClick={onManageCategories} className="px-3 py-2 text-[13px] cursor-pointer">
                  <Tags className="size-4 mr-2 text-[var(--muted)]" /> Manage categories…
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-[var(--line)] my-1" />

              <DropdownMenuGroup>
                <DropdownMenuLabel className="px-3 py-1 text-[10px] uppercase tracking-widest text-[var(--muted)]">Your data</DropdownMenuLabel>
                <DropdownMenuItem onClick={onExportJSON} className="px-3 py-2 text-[13px] cursor-pointer">
                  <Download className="size-4 mr-2 text-[var(--muted)]" /> Export backup (JSON)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onImportData} className="px-3 py-2 text-[13px] cursor-pointer">
                  <Upload className="size-4 mr-2 text-[var(--muted)]" /> Import backup (JSON)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExportICS} className="px-3 py-2 text-[13px] cursor-pointer">
                  <CalendarIcon className="size-4 mr-2 text-[var(--muted)]" /> Add deadlines to calendar (.ics)
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-[var(--line)] my-1" />

              <DropdownMenuItem onClick={onSignOut} className="px-3 py-2 text-[13px] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer">
                <LogOut className="size-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile Action Buttons */}
        <div className="flex md:hidden shrink-0 items-center gap-2 ml-auto">
          <button
            type="button"
            className="flex size-8 items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
            title="Search"
            onClick={() => setMobileSearchOpen(true)}
          >
            <Search className="size-4" />
          </button>

          <InvitesNotification />

          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex size-8 items-center justify-center rounded-full border border-[var(--line)] text-[var(--ink)] text-[11px] [font-family:var(--serif)] outline-none"
              title={`Account: ${userEmail}`}
            >
              <span>{userInitials}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-64 border border-[var(--line)] bg-[var(--bg)] p-1.5 text-[var(--ink)]">
              <div className="truncate px-3 py-2 text-[12.5px] border-b border-[var(--line)] mb-1">
                <span className="block text-[10px] uppercase tracking-widest text-[var(--muted)]">Signed in as</span>
                <span className="text-[var(--ink)] truncate block">{userEmail}</span>
              </div>

              <DropdownMenuItem onClick={onCycleTheme} className="px-3 py-2 text-[13px] cursor-pointer">
                {theme === "dark" ? <Moon className="size-4 mr-2" /> : <Sun className="size-4 mr-2" />}
                <span>Theme: <strong className="capitalize font-medium">{theme}</strong></span>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={onAddCluster} className="px-3 py-2 text-[13px] cursor-pointer">
                <PlusCircle className="size-4 mr-2 text-[var(--muted)]" /> New Cluster
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleSort} className="px-3 py-2 text-[13px] cursor-pointer">
                <ArrowDownWideNarrow className="size-4 mr-2 text-[var(--muted)]" /> Sort: {sortMode === "smart" ? "Smart" : "Manual"}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[var(--line)] my-1" />

              {installAvailable && (
                <>
                  <DropdownMenuItem onClick={onInstall} className="px-3 py-2 text-[13px] cursor-pointer">
                    <DownloadCloud className="size-4 mr-2 text-[var(--muted)]" /> Install app
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[var(--line)] my-1" />
                </>
              )}

              <DropdownMenuGroup>
                <DropdownMenuLabel className="px-3 py-1 text-[10px] uppercase tracking-widest text-[var(--muted)]">Preferences</DropdownMenuLabel>
                <DropdownMenuItem onClick={onToggleNotify} className="px-3 py-2 text-[13px] cursor-pointer">
                  <Bell className="size-4 mr-2 text-[var(--muted)]" /> Browser reminders
                  <span className="ml-auto font-mono text-xs text-[var(--ink3)]">{notifyState}</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-[var(--line)] my-1" />

              <DropdownMenuGroup>
                <DropdownMenuLabel className="px-3 py-1 text-[10px] uppercase tracking-widest text-[var(--muted)]">Organize</DropdownMenuLabel>
                <DropdownMenuItem onClick={onManageCategories} className="px-3 py-2 text-[13px] cursor-pointer">
                  <Tags className="size-4 mr-2 text-[var(--muted)]" /> Manage categories…
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-[var(--line)] my-1" />

              <DropdownMenuGroup>
                <DropdownMenuLabel className="px-3 py-1 text-[10px] uppercase tracking-widest text-[var(--muted)]">Your data</DropdownMenuLabel>
                <DropdownMenuItem onClick={onExportJSON} className="px-3 py-2 text-[13px] cursor-pointer">
                  <Download className="size-4 mr-2 text-[var(--muted)]" /> Export backup (JSON)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onImportData} className="px-3 py-2 text-[13px] cursor-pointer">
                  <Upload className="size-4 mr-2 text-[var(--muted)]" /> Import backup (JSON)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExportICS} className="px-3 py-2 text-[13px] cursor-pointer">
                  <CalendarIcon className="size-4 mr-2 text-[var(--muted)]" /> Add deadlines to calendar (.ics)
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-[var(--line)] my-1" />

              <DropdownMenuItem onClick={onSignOut} className="px-3 py-2 text-[13px] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer">
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
    </header>
  );
}
