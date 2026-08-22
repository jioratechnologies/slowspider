import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  api,
  setActiveWorkspace,
  type BoardPayload,
  type RemoteCluster,
  type RemoteMilestone,
  type RemoteNote,
  type RemoteTask,
  type RemoteWorkspace,
  type SortMode,
} from "../api";

interface BoardContextValue {
  userId: string;
  data: BoardPayload | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  reload: () => Promise<void>;
  refresh: () => void;
  openTaskId: number | null;
  setOpenTaskId: (id: number | null) => void;
  openNotesTaskId: number | null;
  setOpenNotesTaskId: (id: number | null) => void;
  workspaceSheetOpen: boolean;
  setWorkspaceSheetOpen: (open: boolean) => void;
  addTask: (title: string, clusterId: number | null) => Promise<RemoteTask | null>;
  patchTask: (id: number, patch: Partial<RemoteTask>) => void;
  moveTask: (taskId: number, clusterId: number | null) => void;
  deleteTaskForever: (id: number) => void;
  addNote: (input: Record<string, unknown>) => Promise<RemoteNote>;
  deleteNote: (id: number) => void;
  sortMode: SortMode;
  toggleSortMode: () => void;
  createCluster: (input: { name: string; color: string; category_id: number | null }) => Promise<void>;
  patchCluster: (id: number, patch: Partial<RemoteCluster>) => void;
  deleteClusterForever: (id: number) => void;
  applyNoteChange: (note: RemoteNote | null, removedId?: number) => void;
  addMilestone: (taskId: number, title: string) => Promise<void>;
  toggleMilestone: (taskId: number, msId: number) => void;
  renameMilestone: (taskId: number, msId: number, title: string) => void;
  deleteMilestone: (taskId: number, msId: number) => void;
  workspaces: RemoteWorkspace[];
  workspacesLoading: boolean;
  loadWorkspaces: () => Promise<void>;
  switchWorkspace: (id: number) => Promise<void>;
  createWorkspace: (name: string) => Promise<void>;
  renameWorkspace: (id: number, name: string) => Promise<void>;
}

const BoardContext = createContext<BoardContextValue | null>(null);

export function BoardProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [data, setData] = useState<BoardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);
  const [openNotesTaskId, setOpenNotesTaskId] = useState<number | null>(null);
  const [workspaceSheetOpen, setWorkspaceSheetOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<RemoteWorkspace[]>([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(false);

  const reload = useCallback(async () => {
    try {
      const board = await api.board();
      setData(board);
      // The client never picks a workspace at login — the server resolves the account's
      // default one. Pinning it here (once) is what lets `switchWorkspace` mean anything
      // afterward, instead of every request silently re-resolving to the same default.
      await setActiveWorkspace(board.workspaceId);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your board.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    reload();
  }, [reload]);

  function fail(e: unknown) {
    setError(e instanceof Error ? e.message : "Something went wrong.");
  }

  async function addTask(title: string, clusterId: number | null): Promise<RemoteTask | null> {
    if (!title.trim() || !data) return null;
    const siblings = data.tasks.filter((t) => t.cluster_id === clusterId);
    const pos = siblings.reduce((m, t) => Math.max(m, t.pos || 0), 0) + 1;
    try {
      const row = await api.createTask({ title: title.trim(), cluster_id: clusterId, pos });
      setData((prev) => (prev ? { ...prev, tasks: [...prev.tasks, row] } : prev));
      return row;
    } catch (e) {
      fail(e);
      return null;
    }
  }

  function patchTask(id: number, patch: Partial<RemoteTask>) {
    setData((prev) => (prev ? { ...prev, tasks: prev.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) } : prev));
    api.updateTask(id, patch).catch(fail);
  }

  /** Drops a task into a cluster (or Floating), appending it at the end of that column. */
  function moveTask(taskId: number, clusterId: number | null) {
    const siblings = (data?.tasks || []).filter((t) => t.cluster_id === clusterId && t.id !== taskId);
    const pos = siblings.reduce((m, t) => Math.max(m, t.pos || 0), 0) + 1;
    patchTask(taskId, { cluster_id: clusterId, pos, cold: false, binned: false, binned_at: null });
  }

  async function addNote(input: Record<string, unknown>): Promise<RemoteNote> {
    const row = await api.createNote(input);
    applyNoteChange(row);
    return row;
  }

  function deleteNote(id: number) {
    applyNoteChange(null, id);
    api.deleteNote(id).catch(fail);
  }

  function toggleSortMode() {
    const next: SortMode = (data?.sortMode ?? "smart") === "smart" ? "manual" : "smart";
    setData((prev) => (prev ? { ...prev, sortMode: next } : prev));
    api.saveSortMode(next).catch(fail);
  }

  function deleteTaskForever(id: number) {
    setData((prev) => (prev ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== id) } : prev));
    api.deleteTaskForever(id).catch(fail);
  }

  async function createCluster(input: { name: string; color: string; category_id: number | null }) {
    if (!data) return;
    try {
      const row = await api.createCluster({ ...input, pos: data.clusters.length });
      setData((prev) => (prev ? { ...prev, clusters: [...prev.clusters, row] } : prev));
    } catch (e) {
      fail(e);
    }
  }

  function patchCluster(id: number, patch: Partial<RemoteCluster>) {
    setData((prev) => (prev ? { ...prev, clusters: prev.clusters.map((c) => (c.id === id ? { ...c, ...patch } : c)) } : prev));
    api.updateCluster(id, patch).catch(fail);
  }

  function deleteClusterForever(id: number) {
    setData((prev) =>
      prev ? { ...prev, clusters: prev.clusters.filter((c) => c.id !== id), tasks: prev.tasks.filter((t) => t.cluster_id !== id) } : prev
    );
    api.deleteClusterForever(id).catch(fail);
  }

  function applyNoteChange(note: RemoteNote | null, removedId?: number) {
    setData((prev) => {
      if (!prev) return prev;
      if (removedId != null) {
        const gone = prev.notes.find((n) => n.id === removedId);
        return {
          ...prev,
          notes: prev.notes.filter((n) => n.id !== removedId),
          storageUsed: Math.max(0, prev.storageUsed - (gone?.size_bytes || 0)),
        };
      }
      if (!note) return prev;
      return { ...prev, notes: [...prev.notes, note], storageUsed: prev.storageUsed + (note.size_bytes || 0) };
    });
  }

  async function addMilestone(taskId: number, title: string) {
    const v = title.trim();
    if (!v || !data) return;
    const t = data.tasks.find((x) => x.id === taskId);
    const pos = (t?.milestones || []).reduce((m, ms) => Math.max(m, ms.pos || 0), 0) + 1;
    try {
      const row = await api.addMilestone(taskId, v, pos);
      setData((prev) =>
        prev ? { ...prev, tasks: prev.tasks.map((x) => (x.id === taskId ? { ...x, milestones: [...(x.milestones || []), row] } : x)) } : prev
      );
    } catch (e) {
      fail(e);
    }
  }

  function patchMilestone(taskId: number, msId: number, patch: Partial<RemoteMilestone>) {
    setData((prev) =>
      prev
        ? {
            ...prev,
            tasks: prev.tasks.map((x) =>
              x.id !== taskId ? x : { ...x, milestones: (x.milestones || []).map((m) => (m.id === msId ? { ...m, ...patch } : m)) }
            ),
          }
        : prev
    );
    api.updateMilestone(taskId, msId, patch).catch(fail);
  }

  function toggleMilestone(taskId: number, msId: number) {
    const t = data?.tasks.find((x) => x.id === taskId);
    const m = t?.milestones?.find((mm) => mm.id === msId);
    if (!m) return;
    patchMilestone(taskId, msId, { done: !m.done });
  }

  function renameMilestone(taskId: number, msId: number, title: string) {
    patchMilestone(taskId, msId, { title });
  }

  function deleteMilestone(taskId: number, msId: number) {
    setData((prev) =>
      prev
        ? { ...prev, tasks: prev.tasks.map((x) => (x.id !== taskId ? x : { ...x, milestones: (x.milestones || []).filter((m) => m.id !== msId) })) }
        : prev
    );
    api.deleteMilestone(taskId, msId).catch(fail);
  }

  const loadWorkspaces = useCallback(async () => {
    setWorkspacesLoading(true);
    try {
      const res = await api.workspaces();
      setWorkspaces(res.workspaces);
    } catch (e) {
      fail(e);
    } finally {
      setWorkspacesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  async function switchWorkspace(id: number) {
    await setActiveWorkspace(id);
    setLoading(true);
    await reload();
  }

  async function createWorkspace(name: string) {
    try {
      const ws = await api.createWorkspace(name);
      setWorkspaces((prev) => [...prev, ws]);
      await switchWorkspace(ws.id);
    } catch (e) {
      fail(e);
    }
  }

  async function renameWorkspace(id: number, name: string) {
    setWorkspaces((prev) => prev.map((w) => (w.id === id ? { ...w, name } : w)));
    api.renameWorkspace(id, name).catch(fail);
  }

  const value = useMemo<BoardContextValue>(
    () => ({
      userId,
      data,
      loading,
      refreshing,
      error,
      reload,
      refresh,
      openTaskId,
      setOpenTaskId,
      openNotesTaskId,
      setOpenNotesTaskId,
      workspaceSheetOpen,
      setWorkspaceSheetOpen,
      addTask,
      patchTask,
      moveTask,
      deleteTaskForever,
      addNote,
      deleteNote,
      sortMode: data?.sortMode ?? "smart",
      toggleSortMode,
      createCluster,
      patchCluster,
      deleteClusterForever,
      applyNoteChange,
      addMilestone,
      toggleMilestone,
      renameMilestone,
      deleteMilestone,
      workspaces,
      workspacesLoading,
      loadWorkspaces,
      switchWorkspace,
      createWorkspace,
      renameWorkspace,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      userId,
      data,
      loading,
      refreshing,
      error,
      openTaskId,
      openNotesTaskId,
      workspaceSheetOpen,
      reload,
      refresh,
      workspaces,
      workspacesLoading,
      loadWorkspaces,
    ]
  );

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}

export function useBoard(): BoardContextValue {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error("useBoard() must be used within a BoardProvider");
  return ctx;
}
