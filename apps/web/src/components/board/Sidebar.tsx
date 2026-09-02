"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlarmClock,
  Archive,
  Atom,
  Bell,
  Calendar as CalendarIcon,
  DownloadCloud,
  Download,
  FolderKanban,
  GitPullRequest,
  HardDrive,
  Inbox,
  Layers,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Moon,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Snowflake,
  Sun,
  Tags,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/note-media";
import { STORAGE_QUOTA_BYTES } from "@/lib/types";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import type { WorkspaceRef } from "@/lib/workspace-actions";
import type { BoardViewMode } from "./ViewSwitcher";

type ThemeMode = "auto" | "light" | "dark";

export default function Sidebar({
  workspaceId,
  workspaces,
  onOpenCollaborators,
  counts,
  viewMode = "clusters",
  onChangeView,
  calendarOpen,
  deadlinesOpen,
  inboxOpen,
  archiveOpen,
  theme,
  notifyState,
  installAvailable,
  userEmail,
  storageUsed = 0,
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
  onOpenDeadlines,
  onToggleCalendar,
  onToggleInbox,
  onToggleArchive,
  onAddCluster,
  onManageCategories,
  onOpenResearch,
  onCycleTheme,
  onToggleNotify,
  onInstall,
  onExportJSON,
  onImportData,
  onExportICS,
  onSignOut,
}: {
  workspaceId: number;
  workspaces: WorkspaceRef[];
  onOpenCollaborators: () => void;
  counts: { board: number; calendar: number; deadlines: number; cold: number; bin: number; inbox: number };
  viewMode?: BoardViewMode;
  onChangeView?: (m: BoardViewMode) => void;
  calendarOpen: boolean;
  deadlinesOpen: boolean;
  inboxOpen: boolean;
  archiveOpen: boolean;
  theme: ThemeMode;
  notifyState: "On" | "Off" | "Blocked";
  installAvailable: boolean;
  userEmail: string;
  storageUsed?: number;
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  onOpenDeadlines: () => void;
  onToggleCalendar: () => void;
  onToggleInbox: () => void;
  onToggleArchive: () => void;
  onAddCluster: () => void;
  onManageCategories: () => void;
  onOpenResearch: () => void;
  onCycleTheme: () => void;
  onToggleNotify: () => void;
  onInstall: () => void;
  onExportJSON: () => void;
  onImportData: () => void;
  onExportICS: () => void;
  onSignOut: () => void;
}) {
  const userInitials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "ME";

  const content = ({ collapsed: c, onClose }: { collapsed: boolean; onClose?: () => void }) => (
    <>
      {/* Brand */}
      <div className={cn("flex items-center gap-3 px-4 pt-5 pb-3", c && "flex-col px-0")}>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <svg
            width="22"
            height="auto"
            viewBox="0 0 143 100"
            fill="none"
            role="img"
            aria-label="Slow Spider"
            className={cn("shrink-0", c && "mx-auto")}
          >
            <g stroke="currentColor" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-900 dark:text-neutral-100">
              <path d="M8 91 54 8 100 91" />
              <path d="M43 91 89 8 135 91" />
            </g>
            <circle cx="71.5" cy="87" r="11.5" className="fill-amber-500" />
          </svg>
          {!c && (
            <span className="truncate font-semibold tracking-tight text-[17px] text-neutral-900 dark:text-neutral-100 select-none">
              Slow Spider
            </span>
          )}
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer"
            title="Close menu"
          >
            <X className="size-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer",
              c && "mt-1"
            )}
            title={c ? "Expand sidebar (Ctrl/⌘ B)" : "Collapse sidebar (Ctrl/⌘ B)"}
          >
            {c ? <PanelLeftOpen className="size-4.5" /> : <PanelLeftClose className="size-4.5" />}
          </button>
        )}
      </div>

      {/* Workspace Switcher */}
      <div className={cn("px-3 pb-2", c && "px-0")}>
        {c ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Switch workspace"
            className="mx-auto flex size-10 items-center justify-center rounded-xl text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer"
          >
            <LayoutDashboard className="size-5" />
          </button>
        ) : (
          <WorkspaceSwitcher workspaceId={workspaceId} workspaces={workspaces} onOpenCollaborators={onOpenCollaborators} />
        )}
      </div>

      {/* Navigation Links */}
      <nav className={cn("min-h-0 flex-1 overflow-y-auto px-3 pb-4 no-scrollbar space-y-0.5", c && "px-2")}>
        <SectionLabel collapsed={c}>Views</SectionLabel>
        <NavItem
          icon={FolderKanban}
          iconColor="text-indigo-500 dark:text-indigo-400"
          label="Clusters"
          count={counts.board}
          active={viewMode === "clusters"}
          collapsed={c}
          onClick={() => {
            onChangeView?.("clusters");
            onClose?.();
          }}
          title="Cluster View: Organize by project areas"
        />
        <NavItem
          icon={GitPullRequest}
          iconColor="text-amber-500 dark:text-amber-400"
          label="Workflow"
          active={viewMode === "workflow"}
          collapsed={c}
          onClick={() => {
            onChangeView?.("workflow");
            onClose?.();
          }}
          title="Workflow View: Backlog, In Progress, Review, Done"
        />
        <NavItem
          icon={Layers}
          iconColor="text-rose-500 dark:text-rose-400"
          label="Priority"
          active={viewMode === "priority"}
          collapsed={c}
          onClick={() => {
            onChangeView?.("priority");
            onClose?.();
          }}
          title="Priority Matrix View: High, Medium, Low"
        />

        <SectionLabel collapsed={c}>Layers</SectionLabel>
        <NavItem
          icon={Inbox}
          iconColor="text-blue-500 dark:text-blue-400"
          label="Inbox Triage"
          count={counts.inbox}
          active={inboxOpen}
          collapsed={c}
          onClick={() => {
            onToggleInbox();
            onClose?.();
          }}
          title="Inbox: Unsorted captured thoughts"
        />
        <NavItem
          icon={AlarmClock}
          iconColor="text-rose-500 dark:text-rose-400"
          label="Deadlines"
          count={counts.deadlines}
          active={deadlinesOpen}
          collapsed={c}
          onClick={() => {
            onOpenDeadlines();
            onClose?.();
          }}
          title="Deadlines timeline & due items"
        />
        <NavItem
          icon={CalendarIcon}
          iconColor="text-emerald-500 dark:text-emerald-400"
          label="Calendar"
          count={counts.calendar}
          active={calendarOpen}
          collapsed={c}
          onClick={() => {
            onToggleCalendar();
            onClose?.();
          }}
          title="Calendar schedule"
        />
        <NavItem
          icon={Archive}
          iconColor="text-purple-500 dark:text-purple-400"
          label="Archive & Bin"
          count={counts.cold + counts.bin}
          active={archiveOpen}
          collapsed={c}
          onClick={() => {
            onToggleArchive();
            onClose?.();
          }}
          title="Archive: Freezer & Dumping Bin"
        />

        <SectionLabel collapsed={c}>Create & Tools</SectionLabel>
        <NavItem icon={Plus} label="New cluster" collapsed={c} onClick={onAddCluster} title="Create new cluster" />
        <NavItem icon={Tags} iconColor="text-teal-500 dark:text-teal-400" label="Categories" collapsed={c} onClick={onManageCategories} title="Manage category tags" />
        <NavItem icon={Atom} iconColor="text-cyan-500 dark:text-cyan-400" label="Research tools" collapsed={c} onClick={onOpenResearch} title="Scientific research tools" />

        <SectionLabel collapsed={c}>Data</SectionLabel>
        <NavItem icon={Download} label="Export backup" collapsed={c} onClick={onExportJSON} title="Export JSON backup" />
        <NavItem icon={Upload} label="Import backup" collapsed={c} onClick={onImportData} title="Import JSON backup" />
        <NavItem icon={CalendarIcon} label="Deadlines (.ics)" collapsed={c} onClick={onExportICS} title="Export .ics calendar" />
      </nav>

      {/* Footer */}
      <div className={cn("shrink-0 border-t border-neutral-200 dark:border-neutral-800 p-3 bg-white dark:bg-[#111114]", c && "px-2")}>
        {installAvailable && (
          <RailRow
            icon={DownloadCloud}
            label={`Install app`}
            collapsed={c}
            onClick={onInstall}
            title="Install Slow Spider as a desktop/mobile app"
          />
        )}
        <RailRow
          icon={theme === "dark" ? Moon : theme === "light" ? Sun : Palette}
          label={`Theme · ${theme[0].toUpperCase()}${theme.slice(1)}`}
          collapsed={c}
          onClick={onCycleTheme}
          title={`Current theme: ${theme}`}
        />
        <RailRow
          icon={Bell}
          label={`Reminders · ${notifyState}`}
          collapsed={c}
          onClick={onToggleNotify}
          title={`Browser reminders: ${notifyState}`}
          dimmed={notifyState !== "On"}
        />

        {/* Storage Usage Progress Meter (10 GB Assigned Quota) */}
        {!c ? (
          <div className="my-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800/80 bg-neutral-50/80 dark:bg-neutral-900/50 p-2.5 shadow-2xs">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-neutral-700 dark:text-neutral-300">
                <HardDrive className="size-3.5 text-purple-500" />
                <span>Storage</span>
              </div>
              <span className="font-mono text-[10.5px] text-neutral-500 dark:text-neutral-400 font-medium">
                {formatBytes(storageUsed)} / 10 GB
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  (storageUsed / STORAGE_QUOTA_BYTES) > 0.9
                    ? "bg-rose-500"
                    : (storageUsed / STORAGE_QUOTA_BYTES) > 0.7
                    ? "bg-amber-500"
                    : "bg-purple-500"
                )}
                style={{ width: `${Math.min(100, Math.max(1.5, (storageUsed / STORAGE_QUOTA_BYTES) * 100))}%` }}
              />
            </div>
          </div>
        ) : (
          <div
            className="my-2 flex justify-center"
            title={`Storage: ${formatBytes(storageUsed)} of 10 GB used (${((storageUsed / STORAGE_QUOTA_BYTES) * 100).toFixed(1)}%)`}
          >
            <div className="relative flex size-8 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800/80 text-purple-500 cursor-pointer">
              <HardDrive className="size-4" />
              {(storageUsed / STORAGE_QUOTA_BYTES) > 0.8 && (
                <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-amber-500" />
              )}
            </div>
          </div>
        )}

        {!c && <div className="my-2 h-px bg-neutral-200 dark:border-neutral-800" />}

        <div className={cn("flex items-center gap-2.5", c && "flex-col gap-1.5")}>
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-[13px] font-bold tracking-tight text-neutral-900 dark:text-neutral-100",
              c && "size-8 text-xs"
            )}
            title={`Account: ${userEmail}`}
          >
            {userInitials}
          </span>
          {!c && <span className="min-w-0 flex-1 truncate text-xs font-medium text-neutral-500 dark:text-neutral-400">{userEmail}</span>}
          <button
            type="button"
            onClick={onSignOut}
            className={cn(
              "flex shrink-0 items-center justify-center rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer",
              !c && "ml-auto"
            )}
            title="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={cn(
          "sticky top-0 z-40 hidden h-dvh shrink-0 flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111114] transition-[width] duration-200 ease-out lg:flex",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {content({ collapsed })}
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs lg:hidden"
              onClick={onCloseMobile}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed left-0 top-0 z-70 flex h-dvh w-72 flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111114] lg:hidden shadow-2xl"
            >
              {content({ collapsed: false, onClose: onCloseMobile })}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function NavItem({
  icon: Icon,
  iconColor,
  label,
  count,
  active,
  collapsed,
  onClick,
  title,
}: {
  icon: LucideIcon;
  iconColor?: string;
  label: string;
  count?: number;
  active?: boolean;
  collapsed?: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title || label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "relative flex w-full items-center gap-3 rounded-xl py-2.5 text-left text-sm font-medium transition-all cursor-pointer",
        collapsed ? "justify-center px-0" : "px-3",
        active
          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-semibold"
          : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 hover:text-neutral-900 dark:hover:text-neutral-100"
      )}
    >
      <Icon className={cn("size-4.5 shrink-0", iconColor || (active ? "text-blue-500" : "text-neutral-500 dark:text-neutral-400"))} />
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {!!count && count > 0 && !collapsed && (
        <span className="shrink-0 rounded-full border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs font-mono font-bold text-neutral-700 dark:text-neutral-300">
          {count}
        </span>
      )}
      {!!count && count > 0 && collapsed && (
        <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-blue-500" />
      )}
    </button>
  );
}

function RailRow({
  icon: Icon,
  label,
  collapsed,
  onClick,
  title,
  dimmed,
}: {
  icon: LucideIcon;
  label: string;
  collapsed?: boolean;
  onClick: () => void;
  title?: string;
  dimmed?: boolean;
}) {
  return (
    <button
      type="button"
      title={title || label}
      onClick={onClick}
      className={cn(
        "mb-0.5 flex w-full items-center gap-2.5 rounded-lg py-2 text-left text-xs font-medium transition-colors cursor-pointer",
        collapsed ? "justify-center px-0" : "px-2.5",
        dimmed ? "text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
    </button>
  );
}

function SectionLabel({ children, collapsed }: { children: React.ReactNode; collapsed?: boolean }) {
  if (collapsed) return <div className="mx-auto my-3 h-px w-8 bg-neutral-200 dark:bg-neutral-800" />;
  return <div className="px-3 pb-1.5 pt-4 text-xs uppercase font-mono font-bold tracking-wider text-neutral-400 dark:text-neutral-500 select-none">{children}</div>;
}
