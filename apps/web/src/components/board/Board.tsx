"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as db from "@/lib/board-actions";
import { signOutAction } from "@/lib/auth-actions";
import { downloadICS, downloadJSON, readJSONFile } from "@/lib/ics";
import { uploadMedia } from "@/lib/note-media";
import { COLORS, clusterProgress, deadlineBuckets, isClusterActive, isTaskLive, tasksIn } from "@/lib/board-helpers";
import type { BoardData, Category, Cluster, Milestone, Note, Priority, SortMode, Task } from "@/lib/types";
import type { NewNote } from "@/components/notes/NotesPanel";
import { useDragDrop } from "@/hooks/useDragDrop";
import { useTheme } from "@/hooks/useTheme";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import WorkSummaryPulse from "./WorkSummaryPulse";
import QuickAdd, { type TaskCreationMetadata } from "./QuickAdd";
import ViewSwitcher, { type BoardViewMode } from "./ViewSwitcher";
import CategoryFilter from "./CategoryFilter";
import ClusterColumn from "./ClusterColumn";
import WorkflowColumn from "./WorkflowColumn";

// Drawers
import DeadlinesDrawer from "@/components/drawers/DeadlinesDrawer";
import CalendarDrawer from "@/components/drawers/CalendarDrawer";
import InboxDrawer from "@/components/drawers/InboxDrawer";
import ArchiveDrawer from "@/components/drawers/ArchiveDrawer";
import TaskDetailDrawer, { type TaskPatch } from "@/components/drawers/TaskDetailDrawer";

// Modals
import ClusterModal from "../modals/ClusterModal";
import CategoryModal from "../modals/CategoryModal";
import ConfirmModal, { type ConfirmState } from "../modals/ConfirmModal";
import InstallModal from "../modals/InstallModal";
import CollaboratorsModal from "../modals/CollaboratorsModal";
import ScientificCalculator from "../research/ScientificCalculator";
import ConstantsConverterModal from "../research/ConstantsConverterModal";
import WhiteboardCanvas from "../research/WhiteboardCanvas";
import ExpandedColumnModal from "../modals/ExpandedColumnModal";
import MobileBottomBar from "./MobileBottomBar";

import { CheckCircle2, Clock, Flame, GitPullRequest, Layers, Snowflake, Star, Trash2 } from "lucide-react";
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
  const [pinnedCanvas, setPinnedCanvas] = useState(false);
  const [canvasModalOpen, setCanvasModalOpen] = useState(false);

  const [categories, setCategories] = useState(initialData.categories);
  const [clusters, setClusters] = useState(initialData.clusters);
  const [tasks, setTasks] = useState(initialData.tasks);
  const [notes, setNotes] = useState(initialData.notes);
  const [storageUsed, setStorageUsed] = useState(initialData.storageUsed);
  const [sortMode, setSortMode] = useState<SortMode>(initialSortMode);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<number | null>(null);

  // View Mode: Clusters, Workflow, or Priority
  const [viewMode, setViewMode] = useState<BoardViewMode>("clusters");

  // Contextual Drawers
  const [deadlinesDrawerOpen, setDeadlinesDrawerOpen] = useState(false);
  const [calendarDrawerOpen, setCalendarDrawerOpen] = useState(false);
  const [inboxDrawerOpen, setInboxDrawerOpen] = useState(false);
  const [archiveDrawerOpen, setArchiveDrawerOpen] = useState(false);
  const [archiveInitialTab, setArchiveInitialTab] = useState<"cold" | "bin">("cold");

  // Task Detail Drawer
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);

  const [justFrozen, setJustFrozen] = useState<string | null>(null);
  const [clusterModalOpen, setClusterModalOpen] = useState(false);
  const [editingClusterId, setEditingClusterId] = useState<number | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [expandedColumn, setExpandedColumn] = useState<{
    type: "cluster" | "workflow" | "priority";
    id: string | number;
    title: string;
    subtitle?: string;
    color?: string;
    categoryName?: string;
    tasks: Task[];
    clusterId?: number | null;
  } | null>(null);
  const [researchToolsOpen, setResearchToolsOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<{ prompt: () => void; userChoice: Promise<unknown> } | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [notify, setNotify] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("slowspider.nav") === "collapsed") setNavCollapsed(true);
    const savedMode = localStorage.getItem("slowspider.viewMode") as BoardViewMode;
    if (savedMode && ["clusters", "workflow", "priority"].includes(savedMode)) {
      setViewMode(savedMode);
    }
  }, []);

  function handleViewModeChange(mode: BoardViewMode) {
    setViewMode(mode);
    localStorage.setItem("slowspider.viewMode", mode);
  }

  function toggleNav() {
    setNavCollapsed((v) => {
      localStorage.setItem("slowspider.nav", v ? "expanded" : "collapsed");
      return !v;
    });
  }

  function openInboxDrawer() {
    setDeadlinesDrawerOpen(false);
    setCalendarDrawerOpen(false);
    setArchiveDrawerOpen(false);
    setInboxDrawerOpen(true);
  }

  function toggleInboxDrawer() {
    setDeadlinesDrawerOpen(false);
    setCalendarDrawerOpen(false);
    setArchiveDrawerOpen(false);
    setInboxDrawerOpen((v) => !v);
  }

  function openDeadlinesDrawer() {
    setInboxDrawerOpen(false);
    setCalendarDrawerOpen(false);
    setArchiveDrawerOpen(false);
    setDeadlinesDrawerOpen(true);
  }

  function toggleDeadlinesDrawer() {
    setInboxDrawerOpen(false);
    setCalendarDrawerOpen(false);
    setArchiveDrawerOpen(false);
    setDeadlinesDrawerOpen((v) => !v);
  }

  function openCalendarDrawer() {
    setInboxDrawerOpen(false);
    setDeadlinesDrawerOpen(false);
    setArchiveDrawerOpen(false);
    setCalendarDrawerOpen(true);
  }

  function toggleCalendarDrawer() {
    setInboxDrawerOpen(false);
    setDeadlinesDrawerOpen(false);
    setArchiveDrawerOpen(false);
    setCalendarDrawerOpen((v) => !v);
  }

  function openArchiveDrawer(tab: "cold" | "bin" = "cold") {
    setInboxDrawerOpen(false);
    setDeadlinesDrawerOpen(false);
    setCalendarDrawerOpen(false);
    setArchiveInitialTab(tab);
    setArchiveDrawerOpen(true);
  }

  function toggleArchiveDrawer(tab: "cold" | "bin" = "cold") {
    setInboxDrawerOpen(false);
    setDeadlinesDrawerOpen(false);
    setCalendarDrawerOpen(false);
    setArchiveInitialTab(tab);
    setArchiveDrawerOpen((v) => !v);
  }

  // Keyboard navigation & shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        (activeEl as HTMLElement)?.isContentEditable;

      // Global Ctrl+I / Cmd+I (without Shift) opens Inbox
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
        toggleInboxDrawer();
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleNav();
      }

      if (!isInput) {
        if (e.key === "1") {
          e.preventDefault();
          handleViewModeChange("clusters");
        } else if (e.key === "2") {
          e.preventDefault();
          handleViewModeChange("workflow");
        } else if (e.key === "3") {
          e.preventDefault();
          handleViewModeChange("priority");
        } else if (e.key.toLowerCase() === "d") {
          e.preventDefault();
          toggleDeadlinesDrawer();
        } else if (e.key.toLowerCase() === "i" && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          toggleInboxDrawer();
        } else if (e.key.toLowerCase() === "c") {
          e.preventDefault();
          const input = document.querySelector('input[placeholder*="Add task"]') as HTMLInputElement | null;
          input?.focus();
        }
      }

      if (e.key === "Escape") {
        setMobileNavOpen(false);
        setDeadlinesDrawerOpen(false);
        setCalendarDrawerOpen(false);
        setInboxDrawerOpen(false);
        setArchiveDrawerOpen(false);
        setEditingTaskId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  // ---- Task Handlers ----
  async function addTask(title: string, files?: File[], metadata?: TaskCreationMetadata): Promise<Task | null> {
    const targetClusterId = metadata?.cluster_id ?? null;
    const siblings = tasks.filter((t) => t.cluster_id === targetClusterId);
    const maxPos = siblings.reduce((m, t) => Math.max(m, t.pos || 0), 0);
    try {
      const row = await db.insertTask({
        title,
        cluster_id: targetClusterId,
        priority: metadata?.priority || "none",
        deadline: metadata?.deadline || null,
        deadline_time: metadata?.deadline_time || null,
        pos: maxPos + 1,
      });
      setTasks((prev) => (prev.some((t) => t.id === row.id) ? prev.map((t) => (t.id === row.id ? row : t)) : [...prev, row]));

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
              pos: notesForTask(row.id).length,
            });
          } catch (err) {
            fail(err);
          }
        }
      }
      return row;
    } catch (e) {
      fail(e);
      return null;
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
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, cold: true } : t)));
    db.updateTask(id, { cold: true }).catch(fail);
  }

  function resumeTask(id: number) {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    const targetClusterExists = t.cluster_id != null && clusters.some((c) => c.id === t.cluster_id && c.status === "active");
    const targetClusterId = targetClusterExists ? t.cluster_id : null;
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

  function setTaskPriority(taskId: number, priority: Priority) {
    setTasks((prev) => prev.map((x) => (x.id === taskId ? { ...x, priority } : x)));
    db.updateTask(taskId, { priority }).catch(fail);
  }

  function handleTaskDeleteFromDrawer() {
    if (editingTaskId == null) return;
    binTask(editingTaskId);
    setEditingTaskId(null);
  }

  // ---- Notes ----
  async function addNote(input: NewNote) {
    const row = await db.insertNote(input);
    setNotes((prev) => (prev.some((n) => n.id === row.id) ? prev.map((n) => (n.id === row.id ? row : n)) : [...prev, row]));
    setStorageUsed((n) => n + (row.size_bytes || 0));
  }

  function deleteNote(id: number) {
    const gone = notes.find((n) => n.id === id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setStorageUsed((n) => Math.max(0, n - (gone?.size_bytes || 0)));
    db.deleteNote(id).catch(fail);
  }

  function editNote(id: number, patch: Partial<Note>) {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
    db.updateNote(id, patch).catch(fail);
  }

  // ---- Milestones ----
  function addMilestone(title: string) {
    if (editingTaskId == null) return;
    const t = tasks.find((x) => x.id === editingTaskId);
    const maxPos = (t?.milestones || []).reduce((m, s) => Math.max(m, s.pos || 0), 0);
    db.insertMilestone({ task_id: editingTaskId, title, pos: maxPos + 1 })
      .then((row) => {
        setTasks((prev) =>
          prev.map((x) => {
            if (x.id !== editingTaskId) return x;
            const ms = x.milestones || [];
            if (ms.some((m) => m.id === row.id)) {
              return { ...x, milestones: ms.map((m) => (m.id === row.id ? row : m)) };
            }
            return { ...x, milestones: [...ms, row] };
          })
        );
      })
      .catch(fail);
  }

  function toggleMilestone(id: number) {
    if (editingTaskId == null) return;
    const t = tasks.find((x) => x.id === editingTaskId);
    const m = t?.milestones?.find((x) => x.id === id);
    if (!m) return;
    const done = !m.done;
    setTasks((prev) =>
      prev.map((x) =>
        x.id === editingTaskId
          ? { ...x, milestones: x.milestones.map((s) => (s.id === id ? { ...s, done } : s)) }
          : x
      )
    );
    db.updateMilestone(id, { done }).catch(fail);
  }

  function renameMilestone(id: number, title: string) {
    if (editingTaskId == null) return;
    setTasks((prev) =>
      prev.map((x) =>
        x.id === editingTaskId
          ? { ...x, milestones: x.milestones.map((s) => (s.id === id ? { ...s, title } : s)) }
          : x
      )
    );
    db.updateMilestone(id, { title }).catch(fail);
  }

  function deleteMilestoneRow(id: number) {
    if (editingTaskId == null) return;
    setTasks((prev) =>
      prev.map((x) =>
        x.id === editingTaskId
          ? { ...x, milestones: x.milestones.filter((s) => s.id !== id) }
          : x
      )
    );
    db.deleteMilestone(id).catch(fail);
  }

  // ---- Clusters ----
  function openClusterModal(id: number | null) {
    setEditingClusterId(id);
    setClusterModalOpen(true);
  }

  function handleClusterSave(data: { name: string; color: string; category_id: number | null }) {
    if (editingClusterId == null) {
      const maxPos = clusters.reduce((m, c) => Math.max(m, c.pos || 0), 0);
      db.insertCluster({ ...data, pos: maxPos + 1 })
        .then((row) => setClusters((prev) => (prev.some((c) => c.id === row.id) ? prev.map((c) => (c.id === row.id ? row : c)) : [...prev, row])))
        .catch(fail);
    } else {
      setClusters((prev) => prev.map((c) => (c.id === editingClusterId ? { ...c, ...data } : c)));
      db.updateCluster(editingClusterId, data).catch(fail);
    }
  }

  function renameCluster(id: number, name: string) {
    setClusters((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
    db.updateCluster(id, { name }).catch(fail);
  }

  function moveClusterAdjacent(id: number, dir: -1 | 1) {
    const actives = clusters.filter((c) => c.status === "active").sort((a, b) => (a.pos || 0) - (b.pos || 0));
    const idx = actives.findIndex((c) => c.id === id);
    if (idx === -1) return;
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= actives.length) return;
    const target = actives[targetIdx];
    const newPos = target.pos;
    const oldPos = actives[idx].pos;
    setClusters((prev) =>
      prev.map((c) => {
        if (c.id === id) return { ...c, pos: newPos };
        if (c.id === target.id) return { ...c, pos: oldPos };
        return c;
      })
    );
    Promise.all([db.updateCluster(id, { pos: newPos }), db.updateCluster(target.id, { pos: oldPos })]).catch(fail);
  }

  function coldCluster(id: number) {
    setJustFrozen(`cluster:${id}`);
    setClusters((prev) => prev.map((c) => (c.id === id ? { ...c, status: "cold" } : c)));
    db.updateCluster(id, { status: "cold" }).catch(fail);
  }

  function binCluster(id: number) {
    const now = new Date().toISOString();
    setClusters((prev) => prev.map((c) => (c.id === id ? { ...c, status: "binned", binned_at: now } : c)));
    db.updateCluster(id, { status: "binned", binned_at: now }).catch(fail);
  }

  function resumeCluster(id: number) {
    const actives = clusters.filter((c) => c.status === "active");
    const minPos = actives.length ? Math.min(...actives.map((c) => c.pos || 0)) - 1 : 0;
    const patch = { status: "active" as const, pos: minPos, binned_at: null };
    setClusters((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    db.updateCluster(id, patch).catch(fail);
  }

  function deleteClusterForeverConfirm(id: number) {
    const c = clusters.find((x) => x.id === id);
    setConfirmState({
      title: "Delete cluster forever?",
      message: `"${c?.name}" and all of its tasks will be permanently removed.`,
      onConfirm: () => {
        setClusters((prev) => prev.filter((x) => x.id !== id));
        setTasks((prev) => prev.filter((t) => t.cluster_id !== id));
        db.deleteClusterForever(id).catch(fail);
      },
    });
  }

  function emptyBinForever() {
    setConfirmState({
      title: "Empty the dumping bin?",
      message: "Every binned cluster and task will be permanently deleted.",
      onConfirm: () => {
        const binnedClusters = clusters.filter((c) => c.status === "binned");
        const binnedTasks = tasks.filter((t) => t.binned);
        setClusters((prev) => prev.filter((c) => c.status !== "binned"));
        setTasks((prev) => prev.filter((t) => !t.binned));
        Promise.all([
          ...binnedClusters.map((c) => db.deleteClusterForever(c.id)),
          ...binnedTasks.map((t) => db.deleteTaskForever(t.id)),
        ]).catch(fail);
      },
    });
  }

  // ---- Categories ----
  function addCategory(name: string) {
    const color = COLORS[categories.length % COLORS.length] || "#1E1C17";
    const maxPos = categories.reduce((m, c) => Math.max(m, c.pos || 0), 0);
    db.insertCategory({ name, color, pos: maxPos + 1 })
      .then((row) => setCategories((prev) => (prev.some((c) => c.id === row.id) ? prev.map((c) => (c.id === row.id ? row : c)) : [...prev, row])))
      .catch(fail);
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
    setConfirmState({
      title: "Delete category?",
      message: `Clusters assigned to "${cat?.name}" will become uncategorized.`,
      onConfirm: () => {
        setCategories((prev) => prev.filter((c) => c.id !== id));
        setClusters((prev) => prev.map((c) => (c.category_id === id ? { ...c, category_id: null } : c)));
        db.deleteCategory(id).catch(fail);
      },
    });
  }

  // ---- Sort Mode ----
  function toggleSort() {
    const next: SortMode = sortMode === "smart" ? "manual" : "smart";
    setSortMode(next);
    db.saveSortMode(next).catch(fail);
  }

  // ---- Realtime WebSocket Sync ----
  const docChannel = useRealtimeBoard(workspaceId, {
    onTaskChange: (type, row) => {
      setTasks((prev) => {
        if (type === "DELETE") return prev.filter((t) => t.id !== row.id);
        const idx = prev.findIndex((t) => t.id === row.id);
        if (idx === -1) return [...prev, row];
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...row };
        return copy;
      });
    },
    onClusterChange: (type, row) => {
      setClusters((prev) => {
        if (type === "DELETE") return prev.filter((c) => c.id !== row.id);
        const idx = prev.findIndex((c) => c.id === row.id);
        if (idx === -1) return [...prev, row];
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...row };
        return copy;
      });
    },
    onCategoryChange: (type, row) => {
      setCategories((prev) => {
        if (type === "DELETE") return prev.filter((c) => c.id !== row.id);
        const idx = prev.findIndex((c) => c.id === row.id);
        if (idx === -1) return [...prev, row];
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...row };
        return copy;
      });
    },
    onMilestoneChange: (type, row) => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== row.task_id) return t;
          const ms = t.milestones || [];
          if (type === "DELETE") return { ...t, milestones: ms.filter((m) => m.id !== row.id) };
          const idx = ms.findIndex((m) => m.id === row.id);
          if (idx === -1) return { ...t, milestones: [...ms, row] };
          const copy = [...ms];
          copy[idx] = { ...copy[idx], ...row };
          return { ...t, milestones: copy };
        })
      );
    },
    onNoteChange: (type, row) => {
      setNotes((prev) => {
        if (type === "DELETE") return prev.filter((n) => n.id !== row.id);
        const idx = prev.findIndex((n) => n.id === row.id);
        if (idx === -1) return [...prev, row];
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...row };
        return copy;
      });
    },
  });

  // ---- Drag & Drop wiring ----
  useDragDrop(clusters, {
    moveTask,
    coldTask,
    binTask,
    reorderClustersLive: (fromId, toId, after) => {
      setClusters((prev) => {
        const fromIdx = prev.findIndex((c) => c.id === fromId);
        const toIdx = prev.findIndex((c) => c.id === toId);
        if (fromIdx < 0 || toIdx < 0) return prev;
        const copy = [...prev];
        const [moved] = copy.splice(fromIdx, 1);
        let insert = toIdx + (after ? 1 : 0);
        if (insert > fromIdx) insert--;
        copy.splice(insert, 0, moved);
        return copy.map((c, i) => ({ ...c, pos: i + 1 }));
      });
    },
    persistClusterOrder: () => {
      clusters.forEach((c, i) => {
        db.updateCluster(c.id, { pos: i + 1 }).catch(fail);
      });
    },
    coldCluster,
    binCluster,
    activateCluster: resumeCluster,
    restoreTaskToZone,
    setJustFrozen,
  });

  // Export / Import
  function exportJSON() {
    downloadJSON({ categories, clusters, tasks, notes, version: 1, exported_at: new Date().toISOString() });
  }

  function triggerImport() {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "application/json";
    fileInput.onchange = async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        const data = await readJSONFile<any>(file);
        if (!data) return;
        setConfirmState({
          title: "Import data?",
          message: "This will merge categories, clusters, tasks, and notes into your workspace.",
          onConfirm: () => {
            if (data.categories) setCategories(data.categories);
            if (data.clusters) setClusters(data.clusters);
            if (data.tasks) setTasks(data.tasks);
            if (data.notes) setNotes(data.notes);
          },
        });
      } catch (err) {
        fail(err);
      }
    };
    fileInput.click();
  }

  function exportICS() {
    downloadICS(tasks, clusters);
  }

  function doInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => setDeferredPrompt(null));
    } else {
      setInstallModalOpen(true);
    }
  }

  function toggleNotify() {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      Notification.requestPermission().then((p) => setNotify(p === "granted"));
    } else if (Notification.permission === "granted") {
      setNotify((v) => !v);
    }
  }

  async function signOut() {
    await signOutAction();
    router.refresh();
  }

  const notifyLabel =
    typeof Notification === "undefined"
      ? "Off"
      : Notification.permission === "denied"
      ? "Blocked"
      : notify && Notification.permission === "granted"
      ? "On"
      : "Off";

  // Helpers
  const uniqueNotes = useMemo(() => {
    const map = new Map<number, Note>();
    notes.forEach((n) => map.set(n.id, n));
    return Array.from(map.values());
  }, [notes]);

  const noteCountForTask = (taskId: number) => uniqueNotes.filter((n) => n.task_id === taskId).length;
  const mediaNotesForTask = (taskId: number) => uniqueNotes.filter((n) => n.task_id === taskId);
  const taskCountInCluster = (clusterId: number) => tasks.filter((t) => t.cluster_id === clusterId && !t.binned).length;
  const taskCountColdInCluster = (clusterId: number) => tasks.filter((t) => t.cluster_id === clusterId && t.cold && !t.binned).length;
  const notesForTask = (taskId: number) => uniqueNotes.filter((n) => n.task_id === taskId);

  const visibleClusters = clusters
    .filter((c) => isClusterActive(c))
    .filter((c) => (activeCategory == null ? true : c.category_id === activeCategory))
    .sort((a, b) => (a.pos || 0) - (b.pos || 0));

  const editingCluster = editingClusterId != null ? clusters.find((c) => c.id === editingClusterId) || null : null;
  const editingTask = editingTaskId != null ? tasks.find((t) => t.id === editingTaskId) || null : null;
  const defaultClusterColor = COLORS[clusters.length % COLORS.length] || "#1E1C17";

  const liveTasks = tasks.filter((t) => !t.binned && !t.cold);
  const inboxCount = tasks.filter((t) => t.cluster_id === null && !t.done && !t.binned && !t.cold).length;
  const { overdue, soon, upcoming } = deadlineBuckets(tasks, clusters);

  // Workflow Columns computation
  const backlogTasks = liveTasks.filter((t) => !t.done && t.cluster_id === null);
  const inProgressTasks = liveTasks.filter((t) => !t.done && t.cluster_id !== null && !t.starred);
  const reviewTasks = liveTasks.filter((t) => !t.done && t.starred);
  const doneTasks = liveTasks.filter((t) => t.done);

  // Priority Columns computation
  const highPriorityTasks = liveTasks.filter((t) => !t.done && t.priority === "high");
  const medPriorityTasks = liveTasks.filter((t) => !t.done && t.priority === "med");
  const lowPriorityTasks = liveTasks.filter((t) => !t.done && t.priority === "low");
  const unsetPriorityTasks = liveTasks.filter((t) => !t.done && (t.priority === "none" || !t.priority));

  return (
    <>
      <div className="flex min-h-dvh bg-(bg)">
        <Sidebar
          workspaceId={workspaceId}
          workspaces={workspaces}
          onOpenCollaborators={() => setCollaboratorsOpen(true)}
          counts={{
            board: liveTasks.length,
            calendar: tasks.filter((t) => t.deadline && !t.binned && !t.cold).length,
            deadlines: overdue.length + soon.length,
            cold: clusters.filter((c) => c.status === "cold").length + tasks.filter((t) => t.cold && !t.binned).length,
            bin: clusters.filter((c) => c.status === "binned").length + tasks.filter((t) => t.binned).length,
            inbox: inboxCount,
          }}
          viewMode={viewMode}
          onChangeView={handleViewModeChange}
          calendarOpen={calendarDrawerOpen}
          deadlinesOpen={deadlinesDrawerOpen}
          inboxOpen={inboxDrawerOpen}
          archiveOpen={archiveDrawerOpen}
          theme={theme}
          notifyState={notifyLabel}
          installAvailable={!standalone}
          userEmail={userEmail}
          storageUsed={storageUsed}
          collapsed={navCollapsed}
          mobileOpen={mobileNavOpen}
          onToggleCollapse={toggleNav}
          onCloseMobile={() => setMobileNavOpen(false)}
          onOpenDeadlines={openDeadlinesDrawer}
          onToggleCalendar={toggleCalendarDrawer}
          onToggleInbox={toggleInboxDrawer}
          onToggleArchive={() => toggleArchiveDrawer("cold")}
          onAddCluster={() => openClusterModal(null)}
          onManageCategories={() => setCategoryModalOpen(true)}
          onOpenResearch={() => setResearchToolsOpen(true)}
          onCycleTheme={cycleTheme}
          onToggleNotify={toggleNotify}
          onInstall={doInstall}
          onExportJSON={exportJSON}
          onImportData={triggerImport}
          onExportICS={exportICS}
          onSignOut={signOut}
        />

        <div className={cn("flex min-w-0 flex-1 flex-col transition-all duration-300", inboxDrawerOpen && "lg:mr-[460px]")}>
          <TopBar
            search={search}
            onSearchChange={setSearch}
            sortMode={sortMode}
            onToggleSort={toggleSort}
            onMenu={() => setMobileNavOpen(true)}
          />

          <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 sm:px-6 py-4 pb-28 md:pb-8">
            {/* Top 3-Second Work Summary Pulse */}
            <WorkSummaryPulse
              tasks={tasks}
              clusters={clusters}
              onOpenDeadlines={openDeadlinesDrawer}
              onOpenCalendar={openCalendarDrawer}
              onOpenInbox={openInboxDrawer}
            />

            {/* Smart NLP Quick Capture */}
            <QuickAdd
              onAdd={addTask}
              clusters={clusters}
              onOpenCanvas={() => setCanvasModalOpen(true)}
            />

            {/* View Mode Switcher */}
            <ViewSwitcher
              viewMode={viewMode}
              onChangeView={handleViewModeChange}
              totalTasks={liveTasks.length}
            />

            {/* Main Dynamic Kanban Canvas */}
            {viewMode === "clusters" && (
              <div className="min-w-0 flex flex-col gap-3">
                <CategoryFilter
                  categories={categories}
                  clusters={clusters}
                  activeCategory={activeCategory}
                  onSelect={setActiveCategory}
                />

                <div
                  className="board grid items-start gap-3.5"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(290px, 100%), 1fr))" }}
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
                        onExpand={() =>
                          setExpandedColumn({
                            type: "cluster",
                            id: c.id,
                            title: c.name,
                            color: c.color,
                            categoryName: category?.name,
                            tasks: items,
                            clusterId: c.id,
                          })
                        }
                        onEdit={() => openClusterModal(c.id)}
                        onMoveLeft={() => moveClusterAdjacent(c.id, -1)}
                        onMoveRight={() => moveClusterAdjacent(c.id, 1)}
                        onCold={() => coldCluster(c.id)}
                        onBin={() => binCluster(c.id)}
                        onRename={(name) => renameCluster(c.id, name)}
                        onToggleTask={toggleDone}
                        onEditTask={(id) => setEditingTaskId(id)}
                        onEditNotesTask={(id) => setEditingTaskId(id)}
                        onDeleteTask={binTask}
                        onToggleTaskStar={toggleStar}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {viewMode === "workflow" && (
              <div
                className="board grid items-start gap-3.5"
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(290px, 100%), 1fr))" }}
              >
                <WorkflowColumn
                  id="backlog"
                  title="Backlog"
                  count={backlogTasks.length}
                  color="#6366F1"
                  tasks={backlogTasks}
                  onToggleTask={toggleDone}
                  onEditTask={(id) => setEditingTaskId(id)}
                  onEditNotesTask={(id) => setEditingTaskId(id)}
                  onDeleteTask={binTask}
                  onToggleTaskStar={toggleStar}
                  onExpand={() =>
                    setExpandedColumn({
                      type: "workflow",
                      id: "backlog",
                      title: "Backlog",
                      color: "#6366F1",
                      tasks: backlogTasks,
                    })
                  }
                  noteCount={noteCountForTask}
                  mediaNotes={mediaNotesForTask}
                />
                <WorkflowColumn
                  id="in_progress"
                  title="In Progress"
                  count={inProgressTasks.length}
                  color="#F59E0B"
                  tasks={inProgressTasks}
                  onToggleTask={toggleDone}
                  onEditTask={(id) => setEditingTaskId(id)}
                  onEditNotesTask={(id) => setEditingTaskId(id)}
                  onDeleteTask={binTask}
                  onToggleTaskStar={toggleStar}
                  onExpand={() =>
                    setExpandedColumn({
                      type: "workflow",
                      id: "in_progress",
                      title: "In Progress",
                      color: "#F59E0B",
                      tasks: inProgressTasks,
                    })
                  }
                  noteCount={noteCountForTask}
                  mediaNotes={mediaNotesForTask}
                />
                <WorkflowColumn
                  id="review"
                  title="Starred / Priority"
                  count={reviewTasks.length}
                  color="#EC4899"
                  tasks={reviewTasks}
                  onToggleTask={toggleDone}
                  onEditTask={(id) => setEditingTaskId(id)}
                  onEditNotesTask={(id) => setEditingTaskId(id)}
                  onDeleteTask={binTask}
                  onToggleTaskStar={toggleStar}
                  onExpand={() =>
                    setExpandedColumn({
                      type: "workflow",
                      id: "review",
                      title: "Starred / Priority",
                      color: "#EC4899",
                      tasks: reviewTasks,
                    })
                  }
                  noteCount={noteCountForTask}
                  mediaNotes={mediaNotesForTask}
                />
                <WorkflowColumn
                  id="done"
                  title="Done"
                  count={doneTasks.length}
                  color="#10B981"
                  tasks={doneTasks}
                  onToggleTask={toggleDone}
                  onEditTask={(id) => setEditingTaskId(id)}
                  onEditNotesTask={(id) => setEditingTaskId(id)}
                  onDeleteTask={binTask}
                  onToggleTaskStar={toggleStar}
                  onExpand={() =>
                    setExpandedColumn({
                      type: "workflow",
                      id: "done",
                      title: "Done",
                      color: "#10B981",
                      tasks: doneTasks,
                    })
                  }
                  noteCount={noteCountForTask}
                  mediaNotes={mediaNotesForTask}
                />
              </div>
            )}

            {viewMode === "priority" && (
              <div
                className="board grid items-start gap-3.5"
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(290px, 100%), 1fr))" }}
              >
                <WorkflowColumn
                  id="high"
                  title="High Priority"
                  count={highPriorityTasks.length}
                  color="#EF4444"
                  tasks={highPriorityTasks}
                  onToggleTask={toggleDone}
                  onEditTask={(id) => setEditingTaskId(id)}
                  onEditNotesTask={(id) => setEditingTaskId(id)}
                  onDeleteTask={binTask}
                  onToggleTaskStar={toggleStar}
                  onQuickSetPriority={setTaskPriority}
                  onExpand={() =>
                    setExpandedColumn({
                      type: "priority",
                      id: "high",
                      title: "High Priority",
                      color: "#EF4444",
                      tasks: highPriorityTasks,
                    })
                  }
                  noteCount={noteCountForTask}
                  mediaNotes={mediaNotesForTask}
                />
                <WorkflowColumn
                  id="medium"
                  title="Medium Priority"
                  count={medPriorityTasks.length}
                  color="#F59E0B"
                  tasks={medPriorityTasks}
                  onToggleTask={toggleDone}
                  onEditTask={(id) => setEditingTaskId(id)}
                  onEditNotesTask={(id) => setEditingTaskId(id)}
                  onDeleteTask={binTask}
                  onToggleTaskStar={toggleStar}
                  onQuickSetPriority={setTaskPriority}
                  onExpand={() =>
                    setExpandedColumn({
                      type: "priority",
                      id: "medium",
                      title: "Medium Priority",
                      color: "#F59E0B",
                      tasks: medPriorityTasks,
                    })
                  }
                  noteCount={noteCountForTask}
                  mediaNotes={mediaNotesForTask}
                />
                <WorkflowColumn
                  id="low"
                  title="Low Priority"
                  count={lowPriorityTasks.length}
                  color="#3B82F6"
                  tasks={lowPriorityTasks}
                  onToggleTask={toggleDone}
                  onEditTask={(id) => setEditingTaskId(id)}
                  onEditNotesTask={(id) => setEditingTaskId(id)}
                  onDeleteTask={binTask}
                  onToggleTaskStar={toggleStar}
                  onQuickSetPriority={setTaskPriority}
                  onExpand={() =>
                    setExpandedColumn({
                      type: "priority",
                      id: "low",
                      title: "Low Priority",
                      color: "#3B82F6",
                      tasks: lowPriorityTasks,
                    })
                  }
                  noteCount={noteCountForTask}
                  mediaNotes={mediaNotesForTask}
                />
                <WorkflowColumn
                  id="unset"
                  title="Unset Priority"
                  count={unsetPriorityTasks.length}
                  color="#64748B"
                  tasks={unsetPriorityTasks}
                  onToggleTask={toggleDone}
                  onEditTask={(id) => setEditingTaskId(id)}
                  onEditNotesTask={(id) => setEditingTaskId(id)}
                  onDeleteTask={binTask}
                  onToggleTaskStar={toggleStar}
                  onQuickSetPriority={setTaskPriority}
                  onExpand={() =>
                    setExpandedColumn({
                      type: "priority",
                      id: "unset",
                      title: "Unset Priority",
                      color: "#64748B",
                      tasks: unsetPriorityTasks,
                    })
                  }
                  noteCount={noteCountForTask}
                  mediaNotes={mediaNotesForTask}
                />
              </div>
            )}

            <div className="mt-8 mb-2 text-center text-[11px] text-(ink3)">
              Synced to your Slow Spider account ·{" "}
              <a className="cursor-pointer text-(ink) hover:underline" onClick={exportJSON}>
                Export a backup
              </a>
            </div>
          </main>
        </div>
      </div>

      {/* Contextual Drawers */}
      <DeadlinesDrawer
        open={deadlinesDrawerOpen}
        tasks={tasks}
        clusters={clusters}
        onClose={() => setDeadlinesDrawerOpen(false)}
        onOpenTask={(id) => {
          setDeadlinesDrawerOpen(false);
          setEditingTaskId(id);
        }}
        onToggleDone={toggleDone}
      />

      <CalendarDrawer
        open={calendarDrawerOpen}
        tasks={tasks}
        clusters={clusters}
        onClose={() => setCalendarDrawerOpen(false)}
        onOpenTask={(id) => {
          setCalendarDrawerOpen(false);
          setEditingTaskId(id);
        }}
      />

      <InboxDrawer
        open={inboxDrawerOpen}
        tasks={tasks}
        clusters={clusters}
        noteCount={noteCountForTask}
        onClose={() => setInboxDrawerOpen(false)}
        onOpenTask={(id) => {
          setInboxDrawerOpen(false);
          setEditingTaskId(id);
        }}
        onToggleDone={toggleDone}
        onToggleStar={toggleStar}
        onDeleteTask={binTask}
        onMoveToCluster={(tId, cId) => {
          moveTask(tId, cId, null);
        }}
        onQuickAddInbox={(title) => {
          addTask(title);
        }}
      />

      <ArchiveDrawer
        open={archiveDrawerOpen}
        initialTab={archiveInitialTab}
        clusters={clusters}
        tasks={tasks}
        categories={categories}
        onClose={() => setArchiveDrawerOpen(false)}
        onResumeCluster={resumeCluster}
        onBinCluster={binCluster}
        onResumeTask={resumeTask}
        onBinTask={binTask}
        onRestoreCluster={resumeCluster}
        onDeleteClusterForever={deleteClusterForeverConfirm}
        onRestoreTask={(id) => {
          restoreTask(id);
        }}
        onDeleteTaskForever={deleteTaskForeverConfirm}
        onEmptyBin={emptyBinForever}
        taskCount={taskCountInCluster}
      />

      {/* Task Detail Drawer */}
      <TaskDetailDrawer
        task={editingTask}
        clusters={clusters}
        notes={editingTaskId != null ? notesForTask(editingTaskId) : []}
        currentUserId={userId}
        storageUsed={storageUsed}
        docChannel={docChannel}
        onClose={() => setEditingTaskId(null)}
        onSave={handleTaskSave}
        onToggleDone={toggleDone}
        onDelete={handleTaskDeleteFromDrawer}
        onFreeze={(id) => coldTask(id)}
        onAddMilestone={addMilestone}
        onToggleMilestone={toggleMilestone}
        onRenameMilestone={renameMilestone}
        onDeleteMilestone={deleteMilestoneRow}
        onAddNote={addNote}
        onUpdateNote={editNote}
        onDeleteNote={deleteNote}
      />

      {/* Auxiliary Modals */}
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

      {expandedColumn && (
        <ExpandedColumnModal
          open={true}
          onClose={() => setExpandedColumn(null)}
          title={expandedColumn.title}
          subtitle={expandedColumn.subtitle}
          color={expandedColumn.color}
          categoryName={expandedColumn.categoryName}
          tasks={
            expandedColumn.type === "cluster"
              ? tasksIn(tasks, expandedColumn.clusterId ?? null, search, sortMode)
              : expandedColumn.id === "backlog"
              ? backlogTasks
              : expandedColumn.id === "in_progress"
              ? inProgressTasks
              : expandedColumn.id === "review"
              ? reviewTasks
              : expandedColumn.id === "done"
              ? doneTasks
              : expandedColumn.id === "high"
              ? highPriorityTasks
              : expandedColumn.id === "medium"
              ? medPriorityTasks
              : expandedColumn.id === "low"
              ? lowPriorityTasks
              : unsetPriorityTasks
          }
          onToggleTask={toggleDone}
          onEditTask={(id) => setEditingTaskId(id)}
          onEditNotesTask={(id) => setEditingTaskId(id)}
          onDeleteTask={binTask}
          onToggleTaskStar={toggleStar}
          onQuickSetPriority={setTaskPriority}
          onAddTask={(title) => {
            if (expandedColumn.type === "cluster") {
              addTask(title, undefined, { cluster_id: expandedColumn.clusterId ?? null });
            } else if (expandedColumn.type === "priority") {
              const p = expandedColumn.id === "high" || expandedColumn.id === "medium" || expandedColumn.id === "low"
                ? (expandedColumn.id === "medium" ? "med" : expandedColumn.id as Priority)
                : "none";
              addTask(title, undefined, { priority: p });
            } else {
              addTask(title);
            }
          }}
          noteCount={noteCountForTask}
          mediaNotes={mediaNotesForTask}
        />
      )}

      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 10, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 10, x: "-50%" }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-5 left-1/2 z-200 -translate-x-1/2 border border-(ink) bg-(bg) px-4 py-2 text-[13px] text-(ink)"
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

      {(pinnedCanvas || canvasModalOpen) && (
        <div className={pinnedCanvas ? "" : "fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"}>
          <div className={pinnedCanvas ? "" : "w-full max-w-[640px]"}>
            <WhiteboardCanvas
              isPinned={pinnedCanvas}
              onTogglePin={() => {
                setPinnedCanvas((v) => !v);
                if (!pinnedCanvas) setCanvasModalOpen(false);
              }}
              onClose={() => {
                setPinnedCanvas(false);
                setCanvasModalOpen(false);
              }}
              onSaveImage={async (blob) => {
                try {
                  const file = new File([blob], `sketch_${Date.now()}.png`, { type: "image/png" });
                  const path = await uploadMedia(file, file.name, storageUsed);
                  const newTask = await addTask("Canvas Sketch Note", undefined, { priority: "none" });
                  if (newTask) {
                    await addNote({
                      task_id: newTask.id,
                      cluster_id: null,
                      kind: "image",
                      visibility: "workspace",
                      url: path,
                      body: file.name,
                      size_bytes: file.size,
                      mime: file.type,
                      duration_ms: null,
                      pos: 0,
                    });
                  }
                  setCanvasModalOpen(false);
                } catch (e) {
                  setErrorMsg(e instanceof Error ? e.message : "Failed to save sketch.");
                }
              }}
            />
          </div>
        </div>
      )}

      <ConstantsConverterModal
        open={researchToolsOpen}
        onClose={() => setResearchToolsOpen(false)}
        onPinCalculator={() => setPinnedCalculator(true)}
        onPinCanvas={() => setPinnedCanvas(true)}
      />
      {/* Floating Smart DnD Targets on drag */}
      <div className="dnd-rail" aria-hidden>
        <div className="dnd-rail-group">
          <span className="dnd-rail-label">Workflow</span>
          <div className="dnd-zone dnd-zone-workflow" data-workflow-column="backlog" title="Drop into Backlog">
            <GitPullRequest className="size-4 text-indigo-400" />
            <span>Backlog</span>
          </div>
          <div className="dnd-zone dnd-zone-workflow" data-workflow-column="in_progress" title="Drop into In Progress">
            <Clock className="size-4 text-amber-400" />
            <span>In Prog</span>
          </div>
          <div className="dnd-zone dnd-zone-workflow" data-workflow-column="review" title="Drop into Starred / Review">
            <Star className="size-4 text-pink-400" />
            <span>Starred</span>
          </div>
          <div className="dnd-zone dnd-zone-workflow" data-workflow-column="done" title="Drop into Done">
            <CheckCircle2 className="size-4 text-emerald-400" />
            <span>Done</span>
          </div>
        </div>

        <div className="dnd-rail-group">
          <span className="dnd-rail-label">Priority</span>
          <div className="dnd-zone dnd-zone-priority" data-priority-column="high" title="Drop into High Priority">
            <Flame className="size-4 text-rose-500" />
            <span>High</span>
          </div>
          <div className="dnd-zone dnd-zone-priority" data-priority-column="med" title="Drop into Medium Priority">
            <Layers className="size-4 text-amber-500" />
            <span>Medium</span>
          </div>
        </div>

        <div className="dnd-rail-group">
          <span className="dnd-rail-label">Archive</span>
          <div className="dnd-zone" data-drop="coldStore" title="Drop to freeze">
            <Snowflake className="size-4 text-cyan-400" strokeWidth={1.75} />
            <span>Freeze</span>
          </div>
          <div className="dnd-zone dnd-zone-danger" data-drop="dumpBin" title="Drop to bin">
            <Trash2 className="size-4 text-rose-400" strokeWidth={1.75} />
            <span>Bin</span>
          </div>
        </div>
      </div>

      <MobileBottomBar
        onQuickAdd={() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
          const input = document.querySelector('input[placeholder*="Add task"]') as HTMLInputElement | null;
          input?.focus();
        }}
        onOpenCalendar={openCalendarDrawer}
        onOpenResearch={() => setResearchToolsOpen(true)}
        onToggleCold={() => toggleArchiveDrawer("cold")}
        onToggleBin={() => toggleArchiveDrawer("bin")}
        coldCount={clusters.filter((c) => c.status === "cold").length + tasks.filter((t) => t.cold).length}
        binCount={clusters.filter((c) => c.status === "binned").length + tasks.filter((t) => t.binned).length}
        calendarOpen={calendarDrawerOpen}
        coldOpen={archiveDrawerOpen && archiveInitialTab === "cold"}
        binOpen={archiveDrawerOpen && archiveInitialTab === "bin"}
      />
    </>
  );
}
