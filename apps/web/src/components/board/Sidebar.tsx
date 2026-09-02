"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlarmClock,
  Atom,
  Bell,
  Calendar as CalendarIcon,
  DownloadCloud,
  Download,
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
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import type { WorkspaceRef } from "@/lib/workspace-actions";

type ThemeMode = "auto" | "light" | "dark";

export default function Sidebar({
  workspaceId,
  workspaces,
  onOpenCollaborators,
  counts,
  calendarOpen,
  coldOpen,
  binOpen,
  theme,
  notifyState,
  installAvailable,
  userEmail,
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
  onGoBoard,
  onToggleCalendar,
  onToggleCold,
  onToggleBin,
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
  counts: { board: number; calendar: number; deadlines: number; cold: number; bin: number };
  calendarOpen: boolean;
  coldOpen: boolean;
  binOpen: boolean;
  theme: ThemeMode;
  notifyState: "On" | "Off" | "Blocked";
  installAvailable: boolean;
  userEmail: string;
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  onGoBoard: () => void;
  onToggleCalendar: () => void;
  onToggleCold: () => void;
  onToggleBin: () => void;
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
      <div className={cn("flex items-center gap-2.5 px-3 pt-4 pb-3", c && "flex-col px-0")}>
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <svg
            width="18"
            height="auto"
            viewBox="0 0 143 100"
            fill="none"
            role="img"
            aria-label="Slow Spider"
            className={cn("shrink-0", c && "mx-auto")}
          >
            <g stroke="currentColor" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--ink)]">
              <path d="M8 91 54 8 100 91" />
              <path d="M43 91 89 8 135 91" />
            </g>
            <circle cx="71.5" cy="87" r="11.5" className="fill-[var(--logo-dot)]" />
          </svg>
          {!c && (
            <span className="truncate font-normal tracking-wide text-[15px] text-[var(--ink)] [font-family:var(--serif)] select-none">
              Slow Spider
            </span>
          )}
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
            title="Close menu"
          >
            <X className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              "flex size-8 shrink-0 items-center justify-center text-[var(--ink3)] hover:text-[var(--ink)] transition-colors",
              c && "mt-1"
            )}
            title={c ? "Expand sidebar (Ctrl/⌘ B)" : "Collapse sidebar (Ctrl/⌘ B)"}
          >
            {c ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        )}
      </div>

      {/* Workspace */}
      <div className={cn("px-3 pb-1", c && "px-0")}>
        {c ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Switch workspace"
            className="mx-auto flex size-9 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--panel-2)] hover:text-[var(--ink)] transition-colors"
          >
            <LayoutDashboard className="size-4" />
          </button>
        ) : (
          <WorkspaceSwitcher workspaceId={workspaceId} workspaces={workspaces} onOpenCollaborators={onOpenCollaborators} />
        )}
      </div>

      <nav className={cn("min-h-0 flex-1 overflow-y-auto px-3 pb-3 no-scrollbar", c && "px-2")}>
        <SectionLabel collapsed={c}>Focus</SectionLabel>
        <NavItem icon={LayoutDashboard} label="Board" count={counts.board} collapsed={c} onClick={onGoBoard} title="Back to the board" />
        <NavItem
          icon={CalendarIcon}
          label="Calendar"
          count={counts.calendar}
          active={calendarOpen}
          collapsed={c}
          onClick={onToggleCalendar}
          title="Calendar — tasks with a date"
        />
        <button
          type="button"
          title="Jump to deadlines"
          onClick={() => {
            document.getElementById("deadlines-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
            onClose?.();
          }}
          className={cn(
            "group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors",
            "text-[var(--muted)] hover:bg-[var(--panel-2)] hover:text-[var(--ink)]",
            c && "justify-center px-0"
          )}
        >
          <AlarmClock className="size-4 shrink-0" strokeWidth={1.75} />
          {!c && <span className="min-w-0 flex-1 truncate">Deadlines</span>}
          {counts.deadlines > 0 &&
            (c ? (
              <span className="absolute right-1 top-1 size-2 rounded-full bg-rose-500" />
            ) : (
              <span className="shrink-0 rounded-full border border-rose-500/40 bg-rose-500/10 px-1.5 py-px text-[10px] font-mono leading-4 text-rose-500">
                {counts.deadlines}
              </span>
            ))}
        </button>
        <NavItem
          icon={Snowflake}
          label="Freezer"
          count={counts.cold}
          active={coldOpen}
          collapsed={c}
          onClick={onToggleCold}
          title="Freezer — paused clusters & tasks"
        />
        <NavItem
          icon={Trash2}
          label="Dumping Bin"
          count={counts.bin}
          active={binOpen}
          collapsed={c}
          onClick={onToggleBin}
          title="Dumping Bin — removed items, gone after 2 weeks"
        />

        <SectionLabel collapsed={c}>Create</SectionLabel>
        <NavItem icon={Plus} label="New cluster" collapsed={c} onClick={onAddCluster} title="New cluster" />
        <NavItem icon={Atom} label="Research tools" collapsed={c} onClick={onOpenResearch} title="Scientific research tools" />
        <NavItem icon={Tags} label="Categories" collapsed={c} onClick={onManageCategories} title="Manage categories" />

        <SectionLabel collapsed={c}>Data</SectionLabel>
        <NavItem icon={Download} label="Export backup" collapsed={c} onClick={onExportJSON} title="Export backup (JSON)" />
        <NavItem icon={Upload} label="Import backup" collapsed={c} onClick={onImportData} title="Import backup (JSON)" />
        <NavItem icon={CalendarIcon} label="Deadlines (.ics)" collapsed={c} onClick={onExportICS} title="Add deadlines to calendar (.ics)" />
      </nav>

      {/* Footer */}
      <div className={cn("shrink-0 border-t border-[var(--line)] p-3", c && "px-2")}>
        {installAvailable && (
          <RailRow
            icon={DownloadCloud}
            label={`Install app`}
            collapsed={c}
            onClick={onInstall}
            title="Install Slow Spider as an app"
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

        {!c && <div className="my-2 h-px bg-[var(--line)]" />}

        <div className={cn("flex items-center gap-2", c && "flex-col gap-1")}>
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full border border-[var(--line)] text-[12px] [font-family:var(--serif)] tracking-tight text-[var(--ink)]",
              c && "size-7 text-[11px]"
            )}
            title={`Account: ${userEmail}`}
          >
            {userInitials}
          </span>
          {!c && <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--muted)]">{userEmail}</span>}
          <button
            type="button"
            onClick={onSignOut}
            className={cn(
              "flex shrink-0 items-center justify-center rounded-lg p-2 text-[var(--ink3)] hover:bg-[var(--panel-2)] hover:text-[var(--ink)] transition-colors",
              !c && "ml-auto"
            )}
            title="Sign out"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop — persistent, collapsible */}
      <aside
        className={cn(
          "sticky top-0 z-40 hidden h-dvh shrink-0 flex-col border-r border-[var(--line)] bg-[var(--panel)] transition-[width] duration-200 ease-out lg:flex",
          collapsed ? "w-[60px]" : "w-[236px]"
        )}
      >
        {content({ collapsed })}
      </aside>

      {/* Mobile — overlay drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[60] bg-black/40 lg:hidden"
              onClick={onCloseMobile}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="fixed left-0 top-0 z-[70] flex h-dvh w-[272px] flex-col border-r border-[var(--line)] bg-[var(--panel)] lg:hidden"
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
  label,
  count,
  active,
  collapsed,
  onClick,
  title,
}: {
  icon: LucideIcon;
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
        "relative mt-0.5 flex w-full items-center gap-2.5 rounded-lg py-2 text-left text-[13px] transition-colors",
        collapsed ? "justify-center px-0" : "px-2.5",
        active
          ? "bg-[var(--panel-2)] font-medium text-[var(--ink)]"
          : "text-[var(--muted)] hover:bg-[var(--panel-2)]/60 hover:text-[var(--ink)]"
      )}
    >
      <Icon className="size-4 shrink-0" strokeWidth={active ? 2 : 1.75} />
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {!!count && count > 0 && !collapsed && (
        <span className="shrink-0 rounded-full border border-[var(--line)] bg-[var(--bg)] px-1.5 py-px text-[10px] font-mono leading-4 text-[var(--muted)]">
          {count}
        </span>
      )}
      {!!count && count > 0 && collapsed && (
        <span className="absolute right-1 top-1 size-1.5 rounded-full bg-[var(--ink)]" />
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
        "mb-0.5 flex w-full items-center gap-2.5 rounded-lg py-1.5 text-left text-[12.5px] transition-colors",
        collapsed ? "justify-center px-0" : "px-2",
        dimmed ? "text-[var(--ink3)] hover:text-[var(--ink)]" : "text-[var(--muted)] hover:text-[var(--ink)]"
      )}
    >
      <Icon className="size-4 shrink-0" strokeWidth={1.75} />
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
    </button>
  );
}

function SectionLabel({ children, collapsed }: { children: React.ReactNode; collapsed?: boolean }) {
  if (collapsed) return <div className="mx-auto my-2.5 h-px w-6 bg-[var(--line)]" />;
  return <div className="px-2.5 pb-1 pt-4 text-[10px] uppercase tracking-widest text-[var(--ink3)] select-none">{children}</div>;
}
