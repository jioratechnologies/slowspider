"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronsUpDown, Pencil, Plus, UserPlus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { switchWorkspaceAction, createWorkspaceAction, renameWorkspaceAction } from "@/lib/workspace-actions";
import type { WorkspaceRef } from "@/lib/workspace-actions";

function stopMenuTypeahead(e: React.KeyboardEvent) {
  e.stopPropagation();
}

export default function WorkspaceSwitcher({
  workspaceId,
  workspaces,
  onOpenCollaborators,
}: {
  workspaceId: number;
  workspaces: WorkspaceRef[];
  onOpenCollaborators?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [busy, setBusy] = useState(false);

  const current = workspaces.find((w) => w.id === workspaceId);
  const owned = workspaces.filter((w) => w.role === "owner");
  const shared = workspaces.filter((w) => w.role === "editor");
  const [tab, setTab] = useState<"individual" | "shared">("individual");
  const hasShared = shared.length > 0;
  const visible = tab === "shared" && hasShared ? shared : owned;

  function resetPanels() {
    setCreating(false);
    setRenamingId(null);
  }

  async function switchTo(id: number) {
    if (id === workspaceId) {
      setOpen(false);
      return;
    }
    setBusy(true);
    const res = await switchWorkspaceAction(id);
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    }
  }

  async function createWorkspace(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    const res = await createWorkspaceAction(name);
    setBusy(false);
    if (res.ok) {
      setNewName("");
      setCreating(false);
      setOpen(false);
      router.refresh();
    }
  }

  function startRename(w: WorkspaceRef) {
    setRenamingId(w.id);
    setRenameValue(w.name);
  }

  async function submitRename(e: React.FormEvent, id: number) {
    e.preventDefault();
    const name = renameValue.trim();
    if (!name) return;
    setBusy(true);
    const res = await renameWorkspaceAction(id, name);
    setBusy(false);
    if (res.ok) {
      setRenamingId(null);
      router.refresh();
    }
  }

  const isCurrentShared = current?.role === "editor";

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <DropdownMenu
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            resetPanels();
            setTab("individual");
          }
        }}
      >
        <DropdownMenuTrigger className="group flex min-w-0 max-w-56 items-center gap-2 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/80 dark:bg-white/[0.03] py-1.5 pr-2.5 pl-3 text-left outline-none transition-all hover:border-zinc-300 dark:hover:border-white/20 hover:bg-zinc-100 dark:hover:bg-white/[0.06] shadow-2xs">
          {isCurrentShared ? (
            <Users className="size-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
          ) : (
            <Building2 className="size-3.5 shrink-0 text-zinc-500 dark:text-zinc-400" />
          )}
          
          <span className="truncate text-[12.5px] font-medium text-zinc-800 dark:text-zinc-200">
            {current?.name || "Workspace"}
          </span>

          {isCurrentShared ? (
            <span className="rounded-md bg-indigo-500/10 px-1.5 py-0.2 text-[10px] font-mono font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              Shared
            </span>
          ) : null}

          <ChevronsUpDown className="size-3 shrink-0 text-zinc-400 dark:text-zinc-500 transition-colors group-hover:text-zinc-600 dark:group-hover:text-zinc-300 ml-0.5" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="min-w-72 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#16161a] p-1.5 shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl text-zinc-900 dark:text-zinc-200">
          {/* Active Workspace summary & Collaborators button */}
          <div className="px-3 py-2 border-b border-zinc-100 dark:border-white/[0.08] mb-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono uppercase text-zinc-400 dark:text-zinc-500">Current Workspace</span>
              <span className={cn(
                "rounded-md px-1.5 py-0.5 text-[10px] font-mono font-medium",
                current?.role === "owner" 
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" 
                  : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
              )}>
                {current?.role === "owner" ? "Owner" : "Editor"}
              </span>
            </div>
            
            {onOpenCollaborators && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onOpenCollaborators();
                }}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-white/[0.03] py-1.5 text-[12px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.08] hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <Users className="size-3.5 text-indigo-500" />
                <span>Manage Collaborators</span>
              </button>
            )}
          </div>

          {/* Individual vs Shared Tabs if user is part of shared workspaces */}
          {hasShared && (
            <div className="mb-1 flex gap-1 rounded-xl bg-zinc-100 dark:bg-white/[0.04] p-0.5">
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-lg px-2 py-1 text-[11.5px] font-medium transition-colors cursor-pointer",
                  tab === "individual" ? "bg-white dark:bg-[#202026] text-zinc-900 dark:text-zinc-100 shadow-2xs" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                )}
                onClick={() => {
                  resetPanels();
                  setTab("individual");
                }}
              >
                Personal ({owned.length})
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-lg px-2 py-1 text-[11.5px] font-medium transition-colors cursor-pointer",
                  tab === "shared" ? "bg-white dark:bg-[#202026] text-zinc-900 dark:text-zinc-100 shadow-2xs" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                )}
                onClick={() => {
                  resetPanels();
                  setTab("shared");
                }}
              >
                Shared ({shared.length})
              </button>
            </div>
          )}

          <div className="space-y-0.5 max-h-48 overflow-y-auto">
            {visible.map((w) =>
              renamingId === w.id ? (
                <form key={w.id} onSubmit={(e) => submitRename(e, w.id)} className="flex gap-1.5 p-1.5">
                  <Input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={stopMenuTypeahead}
                    onKeyUp={stopMenuTypeahead}
                    className="h-8 text-xs rounded-xl"
                  />
                  <Button type="submit" size="sm" disabled={busy} className="h-8 rounded-xl px-2.5 text-xs">
                    Save
                  </Button>
                </form>
              ) : (
                <DropdownMenuItem 
                  key={w.id} 
                  onClick={() => switchTo(w.id)} 
                  disabled={busy} 
                  className="group/item rounded-xl px-2.5 py-2 text-[12.5px] hover:bg-zinc-100 dark:hover:bg-white/[0.08] cursor-pointer flex items-center gap-2"
                >
                  {w.role === "owner" ? (
                    <Building2 className="size-3.5 shrink-0 text-zinc-400" />
                  ) : (
                    <Users className="size-3.5 shrink-0 text-indigo-400" />
                  )}
                  
                  <span className="flex-1 truncate font-medium text-zinc-800 dark:text-zinc-200">{w.name}</span>
                  
                  {w.role === "editor" && (
                    <span className="rounded bg-indigo-500/10 px-1 py-0.2 text-[9.5px] font-mono text-indigo-500">Shared</span>
                  )}

                  {w.id === workspaceId && <Check className="size-3.5 shrink-0 text-emerald-500" />}

                  {w.role === "owner" && (
                    <button
                      type="button"
                      className="rounded-md p-1 text-zinc-400 opacity-0 hover:bg-zinc-200 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white group-hover/item:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        startRename(w);
                      }}
                      title="Rename workspace"
                    >
                      <Pencil className="size-3" />
                    </button>
                  )}
                </DropdownMenuItem>
              )
            )}
          </div>

          {tab === "individual" && (
            <>
              <DropdownMenuSeparator className="bg-zinc-100 dark:border-white/[0.08] my-1" />
              {creating ? (
                <form onSubmit={createWorkspace} className="flex gap-1.5 p-1.5">
                  <Input
                    autoFocus
                    placeholder="New workspace name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={stopMenuTypeahead}
                    onKeyUp={stopMenuTypeahead}
                    className="h-8 text-xs rounded-xl"
                  />
                  <Button type="submit" size="sm" disabled={busy} className="h-8 rounded-xl px-3 text-xs">
                    Create
                  </Button>
                </form>
              ) : (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-[12.5px] font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.08] hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
                  onClick={() => setCreating(true)}
                >
                  <Plus className="size-3.5" /> New workspace
                </button>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Quick Collaborators button if workspace is shared or to view members */}
      {onOpenCollaborators && (
        <button
          type="button"
          onClick={onOpenCollaborators}
          className="hidden sm:inline-flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/80 dark:bg-white/[0.03] px-2.5 py-1.5 text-[12px] font-medium text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-white/15 hover:bg-zinc-100 dark:hover:bg-white/[0.06] hover:text-zinc-900 dark:hover:text-white transition-all shadow-2xs cursor-pointer"
          title="View and manage workspace collaborators"
        >
          <Users className="size-3 text-indigo-500 dark:text-indigo-400" />
          <span className="hidden xl:inline">Collaborators</span>
        </button>
      )}
    </div>
  );
}

