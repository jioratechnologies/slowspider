"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as db from "@/lib/board-actions";
import { signOutAction } from "@/lib/auth-actions";
import { downloadICS, downloadJSON, readJSONFile } from "@/lib/ics";
import { uploadMedia } from "@/lib/note-media";
import { COLORS, clusterProgress, isClusterActive, isTaskLive, tasksIn } from "@/lib/board-helpers";
import type { BoardData, Category, Cluster, Milestone, SortMode, Task } from "@/lib/types";
import type { NewNote } from "@/components/notes/NotesPanel";
import type { TaskPatch } from "../modals/TaskModal";
import { useDragDrop } from "@/hooks/useDragDrop";
import { useTheme } from "@/hooks/useTheme";
import { AnimatePresence, motion } from "framer-motion";

import TopBar from "./TopBar";
import QuickAdd from "./QuickAdd";
import Tray from "./Tray";
import CategoryFilter from "./CategoryFilter";
import ClusterColumn from "./ClusterColumn";
import DeadlinesPanel from "./DeadlinesPanel";
import CalendarPanel from "./CalendarPanel";
import ColdStore from "./ColdStore";
import DumpBin from "./DumpBin";
import TaskModal from "../modals/TaskModal";
import ClusterModal from "../modals/ClusterModal";
import CategoryModal from "../modals/CategoryModal";
import ConfirmModal, { type ConfirmState } from "../modals/ConfirmModal";
import InstallModal from "../modals/InstallModal";
import TaskNotesModal from "../modals/TaskNotesModal";
import CollaboratorsModal from "../modals/CollaboratorsModal";
import ScientificCalculator from "../research/ScientificCalculator";
import ConstantsConverterModal from "../research/ConstantsConverterModal";
import MobileBottomBar from "./MobileBottomBar";
import { useRealtimeBoard } from "@/hooks/useRealtimeBoard";
import type { WorkspaceRef } from "@/lib/workspace-actions";

export default function Board({
  userId,
  userEmail,
  workspaceId,
  workspaces,
  initialData,
  initialSortMode,
}: {
  userId: string;
  userEmail: string;
  workspaceId: number;
  workspaces: WorkspaceRef[];
  initialData: BoardData;
  initialSortMode: SortMode;
}) {
  const router = useRouter();
  const { theme, cycleTheme } = useTheme();
  const [collaboratorsOpen, setCollaboratorsOpen] = useState(false);
  const [pinnedCalculator, setPinnedCalculator] = useState(false);

  const [categories, setCategories] = useState(initialData.categories);
  const [clusters, setClusters] = useState(initialData.clusters);
  const [tasks, setTasks] = useState(initialData.tasks);
  const [notes, setNotes] = useState(initialData.notes);
  const [storageUsed, setStorageUsed] = useState(initialData.storageUsed);
  const [sortMode, setSortMode] = useState<SortMode>(initialSortMode);
  const [search, setSearch] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [coldOpen, setColdOpen] = useState(false);
  const [binOpen, setBinOpen] = useState(false);
  const [justFrozen, setJustFrozen] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [taskModalDirectEdit, setTaskModalDirectEdit] = useState(false);
  const [editingNotesTaskId, setEditingNotesTaskId] = useState<number | null>(null);

  function openTask(id: number, directEdit = false) {
    setEditingTaskId(id);
    setTaskModalDirectEdit(directEdit);
  }
  const [clusterModalOpen, setClusterModalOpen] = useState(false);
  const [editingClusterId, setEditingClusterId] = useState<number | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [researchToolsOpen, setResearchToolsOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<{ prompt: () => void; userChoice: Promise<unknown> } | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [notify, setNotify] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!justFrozen) return;
    const t = setTimeout(() => setJustFrozen(null), 900);
    return () => clearTimeout(t);
  }, [justFrozen]);

  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(() => setErrorMsg(null), 5000);
    return () => clearTimeout(t);
  }, [errorMsg]);

  useEffect(() => {
    // One-shot sync from a browser API unavailable during SSR (display-mode is unknown
    // until the client evaluates it), not state derived from props.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStandalone(window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);
    type BIPEvent = Event & { prompt: () => void; userChoice: Promise<unknown> };
    function onBip(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BIPEvent);
    }
    function onInstalled() {
      setDeferredPrompt(null);
    }
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function fail(e: unknown) {
    setErrorMsg(e instanceof Error ? e.message : "Something went wrong.");
  }

  // ---- tasks ----
  async function addTask(title: string, files?: File[]) {
    const floaters = tasks.filter((t) => t.cluster_id === null);
    const maxPos = floaters.reduce((m, t) => Math.max(m, t.pos || 0), 0);
    try {
      const row = await db.insertTask({ title, cluster_id: null, pos: maxPos + 1 });
      setTasks((prev) => [...prev, row]);

      if (files && files.length > 0) {
        for (const file of files) {
          try {
            const mediaKind = file.type.startsWith("video") ? "video" : file.type.startsWith("audio") ? "voice" : "image";
            const path = await uploadMedia(file, file.name, storageUsed);
            
            await addNote({
              task_id: row.id,
              cluster_id: null,
              kind: mediaKind,
              visibility: "workspace",
              body: file.name,
              url: path,
              mime: file.type,
              size_bytes: file.size,
              duration_ms: null,
              pos: notesForTask(row.id).length
            });
          } catch (err) {
            fail(err);
          }
        }
      }
    } catch (e) {
      fail(e);
    }
  }
  function toggleDone(id: number) {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    const done = !t.done;
    setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, done } : x)));
    db.updateTask(id, { done }).catch(fail);
  }
  function toggleStar(id: number) {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    const starred = !t.starred;
    setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, starred } : x)));
    db.updateTask(id, { starred }).catch(fail);
  }
  function binTask(id: number) {
    const now = new Date().toISOString();
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, binned: true, cold: false, binned_at: now } : t)));
    db.updateTask(id, { binned: true, cold: false, binned_at: now }).catch(fail);
  }
  function restoreTask(id: number) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, binned: false, binned_at: null } : t)));
    db.updateTask(id, { binned: false, binned_at: null }).catch(fail);
  }
  function coldTask(id: number) {
    setJustFrozen(`task:${id}`);
    setColdOpen(true);
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, cold: true } : t)));
    db.updateTask(id, { cold: true }).catch(fail);
  }
  function resumeTask(id: number) {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;

    // Check if target cluster still exists and is active, otherwise fallback to Floating
    const targetClusterExists = t.cluster_id != null && clusters.some((c) => c.id === t.cluster_id && c.status === "active");
    const targetClusterId = targetClusterExists ? t.cluster_id : null;

    // Give top priority: place at the top of the cluster / floating tray
    const siblings = tasks.filter((x) => x.cluster_id === targetClusterId && x.id !== id && !x.binned && !x.cold);
    const minPos = siblings.length ? Math.min(...siblings.map((s) => s.pos || 0)) - 1 : 0;

    const patch = { cluster_id: targetClusterId, pos: minPos, cold: false, binned: false, binned_at: null as string | null };
    setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    db.updateTask(id, patch).catch(fail);
  }
  function deleteTaskForeverConfirm(id: number) {
    const t = tasks.find((x) => x.id === id);
    setConfirmState({
      title: "Delete permanently?",
      message: `"${t?.title || "Untitled"}" will be gone for good.`,
      onConfirm: () => {
        setTasks((prev) => prev.filter((x) => x.id !== id));
        db.deleteTaskForever(id).catch(fail);
      },
    });
  }
  function moveTask(taskId: number, targetClusterId: number | null, overTaskId: number | null) {
    const t = tasks.find((x) => x.id === taskId);
    if (!t) return;
    const siblings = tasks
      .filter((x) => x.cluster_id === targetClusterId && x.id !== taskId)
      .sort((a, b) => (a.pos || 0) - (b.pos || 0));
    let pos: number;
    if (overTaskId != null) {
      const idx = siblings.findIndex((s) => s.id === overTaskId);
      if (idx === -1) pos = siblings.length ? siblings[siblings.length - 1].pos + 1 : 0;
      else pos = idx <= 0 ? (siblings[0] ? siblings[0].pos - 1 : 0) : (siblings[idx - 1].pos + siblings[idx].pos) / 2;
    } else {
      pos = siblings.length ? siblings[siblings.length - 1].pos + 1 : 0;
    }
    setTasks((prev) => prev.map((x) => (x.id === taskId ? { ...x, cluster_id: targetClusterId, pos } : x)));
    db.updateTask(taskId, { cluster_id: targetClusterId, pos }).catch(fail);
  }
  function restoreTaskToZone(taskId: number, targetClusterId: number | null) {
    const siblings = tasks
      .filter((x) => x.cluster_id === targetClusterId && x.id !== taskId)
      .sort((a, b) => (a.pos || 0) - (b.pos || 0));
    const pos = siblings.length ? siblings[siblings.length - 1].pos + 1 : 0;
    const patch = { cluster_id: targetClusterId, pos, cold: false, binned: false, binned_at: null as string | null };
    setTasks((prev) => prev.map((x) => (x.id === taskId ? { ...x, ...patch } : x)));
    db.updateTask(taskId, patch).catch(fail);
  }
  function handleTaskSave(patch: TaskPatch) {
    if (editingTaskId == null) return;
    const t = tasks.find((x) => x.id === editingTaskId);
    if (!t) return;
    let pos = t.pos;
    if (patch.cluster_id !== t.cluster_id) {
      const siblings = tasks.filter((x) => x.cluster_id === patch.cluster_id && x.id !== t.id);
      pos = siblings.reduce((m, s) => Math.max(m, s.pos || 0), 0) + 1;
    }
    const full = { ...patch, pos };
    setTasks((prev) => prev.map((x) => (x.id === editingTaskId ? { ...x, ...full } : x)));
    db.updateTask(editingTaskId, full).catch(fail);
  }
  function handleTaskDeleteFromModal() {
    if (editingTaskId == null) return;
    binTask(editingTaskId);
    setEditingTaskId(null);
  }

  // ---- notes ----
  async function addNote(input: NewNote) {
    const row = await db.insertNote(input);
    setNotes((prev) => [...prev, row]);
    setStorageUsed((n) => n + (row.size_bytes || 0));
  }
  function deleteNote(id: number) {
    const gone = notes.find((n) => n.id === id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setStorageUsed((n) => Math.max(0, n - (gone?.size_bytes || 0)));
    db.deleteNote(id).catch(fail);
  }
  function notesForTask(taskId: number) {
    return notes.filter((n) => n.task_id === taskId);
  }
  function noteCountForTask(taskId: number) {
    return notes.filter((n) => n.task_id === taskId).length;
  }
  function mediaNotesForTask(taskId: number) {
    return notes.filter((n) => n.task_id === taskId && (n.kind === "image" || n.kind === "video" || n.kind === "voice" || n.kind === "file"));
  }
  function textNotesForTask(taskId: number) {
    return notes.filter((n) => n.task_id === taskId && (n.kind === "text" || n.kind === "rich" || n.kind === "code" || n.kind === "link" || n.kind === "table"));
  }

  // ---- milestones (scoped to the task currently open in the modal) ----
  async function addMilestone(title: string) {
    if (editingTaskId == null) return;
    const t = tasks.find((x) => x.id === editingTaskId);
    const maxPos = (t?.milestones || []).reduce((m, ms) => Math.max(m, ms.pos || 0), 0);
    try {
      const row = await db.insertMilestone({ task_id: editingTaskId, title, pos: maxPos + 1 });
      setTasks((prev) => prev.map((x) => (x.id === editingTaskId ? { ...x, milestones: [...(x.milestones || []), row] } : x)));
    } catch (e) {
      fail(e);
    }
  }
  function toggleMilestone(msId: number) {
    if (editingTaskId == null) return;
    const t = tasks.find((x) => x.id === editingTaskId);
    const m = t?.milestones.find((mm) => mm.id === msId);
    if (!m) return;
    const done = !m.done;
    setTasks((prev) =>
      prev.map((x) =>
        x.id !== editingTaskId ? x : { ...x, milestones: x.milestones.map((mm) => (mm.id === msId ? { ...mm, done } : mm)) }
      )
    );
    db.updateMilestone(msId, { done }).catch(fail);
  }
  function renameMilestone(msId: number, title: string) {
    if (editingTaskId == null) return;
    setTasks((prev) => prev.map((t) => (t.id !== editingTaskId ? t : { ...t, milestones: t.milestones.map((m) => (m.id === msId ? { ...m, title } : m)) })));
    db.updateMilestone(msId, { title }).catch(fail);
  }
  function deleteMilestoneRow(msId: number) {
    if (editingTaskId == null) return;
    setTasks((prev) => prev.map((t) => (t.id !== editingTaskId ? t : { ...t, milestones: t.milestones.filter((m) => m.id !== msId) })));
    db.deleteMilestone(msId).catch(fail);
  }

  // ---- clusters ----
  async function handleClusterSave(input: { name: string; color: string; category_id: number | null }) {
    if (editingClusterId != null) {
      setClusters((prev) => prev.map((c) => (c.id === editingClusterId ? { ...c, ...input } : c)));
      db.updateCluster(editingClusterId, input).catch(fail);
    } else {
      try {
        const row = await db.insertCluster({ ...input, pos: clusters.length });
        setClusters((prev) => [...prev, row]);
      } catch (e) {
        fail(e);
      }
    }
    setClusterModalOpen(false);
  }
  function openClusterModal(id: number | null) {
    setEditingClusterId(id);
    setClusterModalOpen(true);
  }
  function renameCluster(id: number, name: string) {
    setClusters((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
    db.updateCluster(id, { name }).catch(fail);
  }
  function moveClusterAdjacent(id: number, dir: 1 | -1) {
    const idx = clusters.findIndex((c) => c.id === id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= clusters.length) return;
    const arr = [...clusters];
    [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
    const withPos = arr.map((c, i) => ({ ...c, pos: i }));
    setClusters(withPos);
    db.batchUpdatePos("clusters", withPos.map((c) => ({ id: c.id, pos: c.pos }))).catch(fail);
  }
  function reorderClustersLive(fromId: number, toId: number, after: boolean) {
    setClusters((prev) => {
      const arr = [...prev];
      const fromIdx = arr.findIndex((c) => c.id === fromId);
      if (fromIdx < 0) return prev;
      const [moved] = arr.splice(fromIdx, 1);
      let insert = arr.findIndex((c) => c.id === toId);
      if (insert < 0) insert = arr.length;
      else if (after) insert += 1;
      arr.splice(insert, 0, moved);
      return arr.map((c, i) => ({ ...c, pos: i }));
    });
  }
  function persistClusterOrder() {
    db.batchUpdatePos("clusters", clusters.map((c, i) => ({ id: c.id, pos: i }))).catch(fail);
  }
  function coldCluster(id: number) {
    setJustFrozen(`cluster:${id}`);
    setColdOpen(true);
    setClusters((prev) => prev.map((c) => (c.id === id ? { ...c, status: "cold" as const, binned_at: null } : c)));
    db.updateCluster(id, { status: "cold", binned_at: null }).catch(fail);
  }
  function binCluster(id: number) {
    const now = new Date().toISOString();
    setClusters((prev) => prev.map((c) => (c.id === id ? { ...c, status: "binned" as const, binned_at: now } : c)));
    db.updateCluster(id, { status: "binned", binned_at: now }).catch(fail);
  }
  function resumeCluster(id: number) {
    setClusters((prev) => {
      const target = prev.find((c) => c.id === id);
      if (!target) return prev;
      const rest = prev.filter((c) => c.id !== id);
      // Give top priority: place at pos: 0 at the beginning of the active board
      const reordered = [{ ...target, status: "active" as const, binned_at: null }, ...rest].map((c, i) => ({ ...c, pos: i }));
      db.batchUpdatePos("clusters", reordered.map((c) => ({ id: c.id, pos: c.pos }))).catch(fail);
      return reordered;
    });
    db.updateCluster(id, { status: "active", binned_at: null }).catch(fail);
  }
  function deleteClusterForeverConfirm(id: number) {
    const c = clusters.find((x) => x.id === id);
    const n = tasks.filter((t) => t.cluster_id === id).length;
    setConfirmState({
      title: "Delete permanently?",
      message: `"${c?.name || "cluster"}"${n ? ` and its ${n} task${n > 1 ? "s" : ""}` : ""} will be gone for good.`,
      onConfirm: () => {
        setClusters((prev) => prev.filter((x) => x.id !== id));
        setTasks((prev) => prev.filter((t) => t.cluster_id !== id));
        db.deleteClusterForever(id).catch(fail);
      },
    });
  }
  function emptyBinForever() {
    setConfirmState({
      title: "Empty the bin?",
      message: "Everything in the Dumping bin will be permanently deleted.",
      onConfirm: () => {
        const goneClusterIds = clusters.filter((c) => c.status === "binned").map((c) => c.id);
        const looseBinnedTaskIds = tasks.filter((t) => t.binned && !goneClusterIds.includes(t.cluster_id as number)).map((t) => t.id);
        setClusters((prev) => prev.filter((c) => c.status !== "binned"));
        setTasks((prev) => prev.filter((t) => !t.binned && !goneClusterIds.includes(t.cluster_id as number)));
        Promise.all([
          ...goneClusterIds.map((id) => db.deleteClusterForever(id)),
          ...looseBinnedTaskIds.map((id) => db.deleteTaskForever(id)),
        ]).catch(fail);
      },
    });
  }
  function taskCountInCluster(clusterId: number) {
    return tasks.filter((t) => t.cluster_id === clusterId).length;
  }
  function taskCountColdInCluster(clusterId: number) {
    return tasks.filter((t) => t.cluster_id === clusterId && !t.binned && !t.cold).length;
  }

  // ---- categories ----
  async function addCategory(name: string) {
    try {
      const row = await db.insertCategory({ name, color: COLORS[categories.length % COLORS.length], pos: categories.length });
      setCategories((prev) => [...prev, row]);
    } catch (e) {
      fail(e);
    }
  }
  function renameCategory(id: number, name: string) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
    db.updateCategory(id, { name }).catch(fail);
  }
  function recolorCategory(id: number, color: string) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, color } : c)));
    db.updateCategory(id, { color }).catch(fail);
  }
  function deleteCategoryConfirm(id: number) {
    const cat = categories.find((c) => c.id === id);
    const n = clusters.filter((c) => c.category_id === id).length;
    setConfirmState({
      title: "Delete category?",
      message: `"${cat?.name}" will be removed.${n ? ` ${n} cluster${n > 1 ? "s" : ""} will lose this label.` : ""}`,
      onConfirm: () => {
        setClusters((prev) => prev.map((c) => (c.category_id === id ? { ...c, category_id: null } : c)));
        setCategories((prev) => prev.filter((c) => c.id !== id));
        if (activeCategory === id) setActiveCategory(null);
        db.deleteCategory(id).catch(fail);
      },
    });
  }

  // ---- sort / export / notify / install / sign out ----
  function toggleSort() {
    const next: SortMode = sortMode === "smart" ? "manual" : "smart";
    setSortMode(next);
    db.saveSortMode(next).catch(fail);
  }
  function exportICS() {
    if (!downloadICS(tasks, clusters)) {
      setConfirmState({ title: "Nothing to export", message: "Add a deadline to at least one task first, then export.", onConfirm: null });
    }
  }
  function exportJSON() {
    downloadJSON({ categories, clusters, tasks });
  }
  const importInputRef = useRef<HTMLInputElement>(null);
  function triggerImport() {
    importInputRef.current?.click();
  }
  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;

    let parsed: { categories?: Category[]; clusters?: Cluster[]; tasks?: Task[] };
    try {
      parsed = await readJSONFile(file);
    } catch (err) {
      fail(err);
      return;
    }
    const importCats = parsed.categories || [];
    const importClusters = parsed.clusters || [];
    const importTasks = parsed.tasks || [];
    if (!importCats.length && !importClusters.length && !importTasks.length) {
      setConfirmState({ title: "Nothing to import", message: "That file doesn't contain any categories, clusters or tasks.", onConfirm: null });
      return;
    }

    setConfirmState({
      title: "Import backup?",
      message: `Adds ${importCats.length} categor${importCats.length === 1 ? "y" : "ies"}, ${importClusters.length} cluster${importClusters.length === 1 ? "" : "s"} and ${importTasks.length} task${importTasks.length === 1 ? "" : "s"} alongside what's already here — it merges, it doesn't replace. Paused/bin state from the backup isn't preserved; everything comes back active.`,
      onConfirm: () => runImport(importCats, importClusters, importTasks),
    });
  }
  async function runImport(importCats: Category[], importClusters: Cluster[], importTasks: Task[]) {
    try {
      const catMap = new Map<number, number>();
      const newCats: Category[] = [];
      for (const c of importCats) {
        const row = await db.insertCategory({ name: c.name, color: c.color, pos: categories.length + newCats.length });
        catMap.set(c.id, row.id);
        newCats.push(row);
      }

      const clusterMap = new Map<number, number>();
      const newClusters: Cluster[] = [];
      for (const c of importClusters) {
        const category_id = c.category_id != null ? (catMap.get(c.category_id) ?? null) : null;
        const row = await db.insertCluster({ name: c.name, color: c.color, category_id, pos: clusters.length + newClusters.length });
        clusterMap.set(c.id, row.id);
        newClusters.push(row);
      }

      const newTasks: Task[] = [];
      for (const t of importTasks) {
        const cluster_id = t.cluster_id != null ? (clusterMap.get(t.cluster_id) ?? null) : null;
        const created = await db.insertTask({ title: t.title, cluster_id, pos: newTasks.length });
        const patch = { priority: t.priority, deadline: t.deadline, notes: t.notes, done: t.done };
        await db.updateTask(created.id, patch);

        const milestones: Milestone[] = [];
        for (const m of t.milestones || []) {
          const msRow = await db.insertMilestone({ task_id: created.id, title: m.title, pos: m.pos });
          if (m.done) await db.updateMilestone(msRow.id, { done: true });
          milestones.push({ ...msRow, done: !!m.done });
        }
        newTasks.push({ ...created, ...patch, milestones });
      }

      setCategories((prev) => [...prev, ...newCats]);
      setClusters((prev) => [...prev, ...newClusters]);
      setTasks((prev) => [...prev, ...newTasks]);
    } catch (e) {
      fail(e);
    }
  }
  function toggleNotify() {
    if (typeof Notification === "undefined") {
      setConfirmState({ title: "Not available", message: "This browser doesn't support reminders. The in-app Deadlines panel still works.", onConfirm: null });
      return;
    }
    if (!notify) {
      Notification.requestPermission().then((p) => setNotify(p === "granted"));
    } else {
      setNotify(false);
    }
  }
  const notifyLabel: "On" | "Off" | "Blocked" = notify ? (typeof Notification !== "undefined" && Notification.permission === "granted" ? "On" : "Blocked") : "Off";

  async function doInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        await deferredPrompt.userChoice;
      } catch {}
      setDeferredPrompt(null);
      return;
    }
    setInstallModalOpen(true);
  }
  async function signOut() {
    await signOutAction();
    router.refresh();
  }

  useDragDrop(clusters, {
    moveTask,
    coldTask,
    binTask,
    reorderClustersLive,
    persistClusterOrder,
    coldCluster,
    binCluster,
    activateCluster: resumeCluster,
    restoreTaskToZone,
    setJustFrozen,
  });

  // Live sync — a collaborator's change lands here as a Postgres change event and gets
  // merged into local state. Server payload wins (last-write-wins), except a row that's
  // currently open in an editing modal is left alone until the modal closes, so a
  // collaborator's edit can't yank a field out from under whoever is mid-type.
  // docChannel rides this same connection for CRDT co-editing of Note.body (kind text/rich) —
  // see TaskNotesModal/NotesPanel/CollaborativeNoteEditor and
  // docs/MIGRATION-PLAN-bff-kong-split.md's Realtime section. Not a second WebSocket.
  const docChannel = useRealtimeBoard(workspaceId, {
    onTaskChange: (type, row) => {
      if (type === "DELETE") {
        setTasks((prev) => prev.filter((t) => t.id !== row.id));
        return;
      }
      if (row.id === editingTaskId) return;
      setTasks((prev) => {
        const existing = prev.find((t) => t.id === row.id);
        const merged = { ...row, milestones: existing?.milestones || [] };
        return existing ? prev.map((t) => (t.id === row.id ? merged : t)) : [...prev, merged];
      });
    },
    onClusterChange: (type, row) => {
      if (type === "DELETE") {
        setClusters((prev) => prev.filter((c) => c.id !== row.id));
        return;
      }
      if (row.id === editingClusterId) return;
      setClusters((prev) => (prev.some((c) => c.id === row.id) ? prev.map((c) => (c.id === row.id ? row : c)) : [...prev, row]));
    },
    onCategoryChange: (type, row) => {
      if (categoryModalOpen) return;
      if (type === "DELETE") {
        setCategories((prev) => prev.filter((c) => c.id !== row.id));
        return;
      }
      setCategories((prev) => (prev.some((c) => c.id === row.id) ? prev.map((c) => (c.id === row.id ? row : c)) : [...prev, row]));
    },
    onNoteChange: (type, row) => {
      if (type === "DELETE") {
        setNotes((prev) => prev.filter((n) => n.id !== row.id));
        return;
      }
      setNotes((prev) => (prev.some((n) => n.id === row.id) ? prev.map((n) => (n.id === row.id ? row : n)) : [...prev, row]));
    },
    onMilestoneChange: (type, row) => {
      if (row.task_id === editingTaskId) return;
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== row.task_id) return t;
          if (type === "DELETE") return { ...t, milestones: t.milestones.filter((m) => m.id !== row.id) };
          const exists = t.milestones.some((m) => m.id === row.id);
          return { ...t, milestones: exists ? t.milestones.map((m) => (m.id === row.id ? row : m)) : [...t.milestones, row] };
        })
      );
    },
  });

  const editingTask = tasks.find((t) => t.id === editingTaskId) || null;
  const editingCluster = editingClusterId != null ? clusters.find((c) => c.id === editingClusterId) || null : null;
  const defaultClusterColor = COLORS[clusters.length % COLORS.length];

  const liveTasks = tasks.filter((t) => isTaskLive(t, clusters));

  const visibleClusters = clusters.filter((c: Cluster) => isClusterActive(c) && (!activeCategory || c.category_id === activeCategory));

  return (
    <>
      <input ref={importInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
      <TopBar
        workspaceId={workspaceId}
        workspaces={workspaces}
        search={search}
        onSearchChange={setSearch}
        sortMode={sortMode}
        onToggleSort={toggleSort}
        calendarOpen={calendarOpen}
        onToggleCalendar={() => setCalendarOpen((v) => !v)}
        onAddCluster={() => openClusterModal(null)}
        onManageCategories={() => setCategoryModalOpen(true)}
        onExportICS={exportICS}
        onExportJSON={exportJSON}
        onImportData={triggerImport}
        onOpenCollaborators={() => setCollaboratorsOpen(true)}
        theme={theme}
        onCycleTheme={cycleTheme}
        notifyState={notifyLabel}
        onToggleNotify={toggleNotify}
        installAvailable={!standalone}
        onInstall={doInstall}
        userEmail={userEmail}
        onSignOut={signOut}
        onPinCalculator={() => setPinnedCalculator(true)}
      />
      <main className="mx-auto max-w-375 p-3.5 sm:p-6 pb-28 md:pb-8">
        <CalendarPanel
          open={calendarOpen}
          tasks={tasks}
          clusters={clusters}
          onClose={() => setCalendarOpen(false)}
          onOpenTask={openTask}
        />
        <DeadlinesPanel tasks={tasks} clusters={clusters} onOpenTask={openTask} />
        <QuickAdd onAdd={addTask} />
        {/* Cold store and the bin sit in a sticky right rail so a drag from anywhere in the
            cluster grid has a drop target on screen without scrolling. */}
        <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-4">
          <div className="min-w-0">
            <Tray
              tasks={tasksIn(tasks, null, search, sortMode)}
              noteCount={noteCountForTask}
              mediaNotes={mediaNotesForTask}
              onToggle={toggleDone}
              onEdit={openTask}
              onEditNotes={setEditingNotesTaskId}
              onDelete={binTask}
              onToggleStar={toggleStar}
            />
            <CategoryFilter categories={categories} clusters={clusters} activeCategory={activeCategory} onSelect={setActiveCategory} />
            <div
              className="board grid items-start gap-3 sm:gap-4"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(320px, 100%), 1fr))" }}
            >
              {visibleClusters.map((c) => {
                const items = tasksIn(tasks, c.id, search, sortMode);
                const openCount = tasks.filter((t) => t.cluster_id === c.id && !t.done && !t.binned).length;
                const category = c.category_id ? categories.find((cat) => cat.id === c.category_id) || null : null;
                const progress = clusterProgress(c.id, tasks);
                return (
                  <ClusterColumn
                    key={c.id}
                    cluster={c}
                    tasks={items}
                    category={category}
                    openCount={openCount}
                    progress={progress}
                    noteCount={noteCountForTask}
                    mediaNotes={mediaNotesForTask}
                    onEdit={() => openClusterModal(c.id)}
                    onMoveLeft={() => moveClusterAdjacent(c.id, -1)}
                    onMoveRight={() => moveClusterAdjacent(c.id, 1)}
                    onCold={() => coldCluster(c.id)}
                    onBin={() => binCluster(c.id)}
                    onRename={(name) => renameCluster(c.id, name)}
                    onToggleTask={toggleDone}
                    onEditTask={openTask}
                    onEditNotesTask={setEditingNotesTaskId}
                    onDeleteTask={binTask}
                    onToggleTaskStar={toggleStar}
                  />
                );
              })}
            </div>
          </div>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-22 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto [&_.stash]:mt-0">
            <ColdStore
              clusters={clusters}
              tasks={tasks}
              categories={categories}
              open={coldOpen}
              justFrozen={justFrozen}
              onToggleOpen={() => setColdOpen((v) => !v)}
              onResumeCluster={resumeCluster}
              onBinCluster={binCluster}
              onResumeTask={resumeTask}
              onBinTask={binTask}
              taskCount={taskCountColdInCluster}
            />
            <DumpBin
              clusters={clusters}
              tasks={tasks}
              open={binOpen}
              onToggleOpen={() => setBinOpen((v) => !v)}
              onRestoreCluster={resumeCluster}
              onDeleteClusterForever={deleteClusterForeverConfirm}
              onRestoreTask={restoreTask}
              onDeleteTaskForever={deleteTaskForeverConfirm}
              onEmptyBin={emptyBinForever}
              taskCount={taskCountInCluster}
            />
          </aside>
        </div>
        <div className="mt-7.5 mb-2 text-center text-xs text-muted-foreground">
          Synced to your Slow Spider account ·{" "}
          <a className="cursor-pointer text-primary hover:underline" onClick={exportJSON}>
            Export a backup
          </a>
        </div>
      </main>

      <TaskModal
        task={editingTask}
        clusters={clusters}
        notes={editingTaskId != null ? notesForTask(editingTaskId) : []}
        currentUserId={userId}
        storageUsed={storageUsed}
        initialEditMode={taskModalDirectEdit}
        onClose={() => setEditingTaskId(null)}
        onSave={handleTaskSave}
        onDelete={handleTaskDeleteFromModal}
        onAddMilestone={addMilestone}
        onToggleMilestone={toggleMilestone}
        onRenameMilestone={renameMilestone}
        onDeleteMilestone={deleteMilestoneRow}
        onAddNote={addNote}
        onDeleteNote={deleteNote}
      />
      <TaskNotesModal
        task={editingNotesTaskId != null ? tasks.find(t => t.id === editingNotesTaskId) || null : null}
        notes={editingNotesTaskId != null ? textNotesForTask(editingNotesTaskId) : []}
        currentUserId={userId}
        storageUsed={storageUsed}
        docChannel={docChannel}
        onClose={() => setEditingNotesTaskId(null)}
        onAddNote={addNote}
        onDeleteNote={deleteNote}
      />
      <ClusterModal
        open={clusterModalOpen}
        cluster={editingCluster}
        categories={categories}
        defaultColor={defaultClusterColor}
        onClose={() => setClusterModalOpen(false)}
        onSave={handleClusterSave}
        onManageCategories={() => setCategoryModalOpen(true)}
      />
      <CategoryModal
        open={categoryModalOpen}
        categories={categories}
        onClose={() => setCategoryModalOpen(false)}
        onAdd={addCategory}
        onRename={renameCategory}
        onRecolor={recolorCategory}
        onDelete={deleteCategoryConfirm}
      />
      <ConfirmModal state={confirmState} onClose={() => setConfirmState(null)} />
      <InstallModal open={installModalOpen} onClose={() => setInstallModalOpen(false)} />
      <CollaboratorsModal open={collaboratorsOpen} onClose={() => setCollaboratorsOpen(false)} currentUserEmail={userEmail} />

      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 10, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 10, x: "-50%" }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-4.5 left-1/2 z-200 rounded-[10px] bg-destructive px-4 py-2.25 text-[13px] text-white shadow-(--sh-3)"
          >
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>
      {pinnedCalculator && (
        <ScientificCalculator
          isPinned={true}
          onTogglePin={() => setPinnedCalculator(false)}
          onClose={() => setPinnedCalculator(false)}
        />
      )}

      <ConstantsConverterModal
        open={researchToolsOpen}
        onClose={() => setResearchToolsOpen(false)}
        onPinCalculator={() => setPinnedCalculator(true)}
      />

      <MobileBottomBar
        onQuickAdd={() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
          const input = document.querySelector('input[placeholder*="Add a task"]') as HTMLInputElement | null;
          input?.focus();
        }}
        onOpenCalendar={() => setCalendarOpen(true)}
        onOpenResearch={() => setResearchToolsOpen(true)}
        onToggleCold={() => setColdOpen(v => !v)}
        onToggleBin={() => setBinOpen(v => !v)}
        coldCount={clusters.filter(c => c.status === "cold").length + tasks.filter(t => t.cold).length}
        binCount={clusters.filter(c => c.status === "binned").length + tasks.filter(t => t.binned).length}
        calendarOpen={calendarOpen}
        coldOpen={coldOpen}
        binOpen={binOpen}
      />
    </>
  );
}
