"use client";

import { useEffect, useRef } from "react";
import type { Cluster } from "@/lib/types";

// Ports the original app's two drag mechanisms almost verbatim, as a single document-level
// delegated listener set (same architecture as the original, just relocated into a React
// effect that runs once on mount):
//
//  1. Native HTML5 drag & drop for task cards only (they're the only elements the old app
//     set `draggable=true` on) — dragging a card onto a cluster / the Floating tray / cold
//     store / the dumping bin.
//  2. Pointer-based "fluid" drag (works on touch, follows the cursor with a ghost element)
//     for reordering clusters via their grip handle, and for pulling items back out of
//     cold store / the dumping bin.

export interface DragDropCallbacks {
  moveTask: (taskId: number, targetClusterId: number | null, overTaskId: number | null) => void;
  coldTask: (taskId: number) => void;
  binTask: (taskId: number) => void;
  reorderClustersLive: (fromId: number, toId: number, after: boolean) => void;
  persistClusterOrder: () => void;
  coldCluster: (clusterId: number) => void;
  binCluster: (clusterId: number) => void;
  activateCluster: (clusterId: number) => void;
  restoreTaskToZone: (taskId: number, targetClusterId: number | null) => void;
  setJustFrozen: (key: string | null) => void;
  setTaskWorkflow?: (taskId: number, workflowId: string) => void;
  setTaskPriority?: (taskId: number, priority: string) => void;
}

function prefersReduce(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function flipClusters(mutate: () => void) {
  if (prefersReduce()) {
    mutate();
    return;
  }
  const board = document.querySelector<HTMLElement>(".board");
  if (!board) {
    mutate();
    return;
  }
  const first: Record<string, DOMRect> = {};
  board.querySelectorAll<HTMLElement>(".cluster").forEach((el) => {
    first[el.dataset.cluster!] = el.getBoundingClientRect();
  });
  mutate();
  requestAnimationFrame(() => {
    document.querySelectorAll<HTMLElement>(".board .cluster").forEach((el) => {
      const f = first[el.dataset.cluster!];
      if (!f) return;
      const l = el.getBoundingClientRect();
      const dx = f.left - l.left;
      const dy = f.top - l.top;
      if (dx || dy) {
        el.style.transition = "none";
        el.style.transform = `translate(${dx}px,${dy}px)`;
        el.getBoundingClientRect();
        requestAnimationFrame(() => {
          el.style.transition = "";
          el.style.transform = "";
        });
      }
    });
  });
}

export function useDragDrop(clusters: Cluster[], callbacks: DragDropCallbacks) {
  const ctxRef = useRef({ clusters, callbacks });
  useEffect(() => {
    ctxRef.current = { clusters, callbacks };
  });

  useEffect(() => {
    let dragId: number | null = null; // task being natively dragged

    function overZone(target: EventTarget | null): HTMLElement | null {
      const el = target as HTMLElement;
      return (
        el?.closest<HTMLElement>(".cluster") ||
        el?.closest<HTMLElement>("[data-workflow-column]") ||
        el?.closest<HTMLElement>("[data-priority-column]") ||
        el?.closest<HTMLElement>(".dnd-zone") ||
        el?.closest<HTMLElement>(".tray") ||
        el?.closest<HTMLElement>("#coldStore,#dumpBin,[data-drop='coldStore'],[data-drop='dumpBin']")
      );
    }

    function onDragStart(e: DragEvent) {
      const card = (e.target as HTMLElement)?.closest<HTMLElement>(".card[data-id]");
      if (!card) return;
      dragId = Number(card.dataset.id);
      card.classList.add("dragging");
      // Reveals the floating Freeze/Bin drop rail (CSS: body[data-dnd] .dnd-rail).
      document.body.setAttribute("data-dnd", "task");
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        try {
          e.dataTransfer.setData("text/plain", String(dragId));
        } catch {}
      }
    }
    function onDragEnd(e: DragEvent) {
      const card = (e.target as HTMLElement)?.closest<HTMLElement>(".card");
      card?.classList.remove("dragging");
      dragId = null;
      document.body.removeAttribute("data-dnd");
      document.querySelectorAll(".dragover").forEach((el) => el.classList.remove("dragover"));
    }
    function onDragOver(e: DragEvent) {
      if (dragId == null) return;
      const zone = overZone(e.target);
      if (!zone) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      document.querySelectorAll(".dragover").forEach((el) => {
        if (el !== zone) el.classList.remove("dragover");
      });
      zone.classList.add("dragover");
    }
    function onDragLeave(e: DragEvent) {
      if (dragId == null) return;
      const zone = overZone(e.target);
      if (zone && !zone.contains(e.relatedTarget as Node)) zone.classList.remove("dragover");
    }
    function onDrop(e: DragEvent) {
      if (dragId == null) return;
      const zone = overZone(e.target);
      if (!zone) return;
      e.preventDefault();
      zone.classList.remove("dragover");
      const { callbacks } = ctxRef.current;
      const id = dragId;
      dragId = null;
      if (zone.id === "coldStore" || zone.getAttribute("data-drop") === "coldStore") {
        callbacks.coldTask(id);
        return;
      }
      if (zone.id === "dumpBin" || zone.getAttribute("data-drop") === "dumpBin") {
        callbacks.binTask(id);
        return;
      }
      const workflowCol = zone.getAttribute("data-workflow-column");
      if (workflowCol && callbacks.setTaskWorkflow) {
        callbacks.setTaskWorkflow(id, workflowCol);
        return;
      }
      const priorityCol = zone.getAttribute("data-priority-column");
      if (priorityCol && callbacks.setTaskPriority) {
        callbacks.setTaskPriority(id, priorityCol);
        return;
      }
      const targetCluster = zone.classList.contains("tray") ? null : zone.dataset.cluster ? Number(zone.dataset.cluster) : null;
      const overCard = (e.target as HTMLElement)?.closest<HTMLElement>(".card[data-id]");
      const overTaskId = overCard && Number(overCard.dataset.id) !== id ? Number(overCard.dataset.id) : null;
      callbacks.moveTask(id, targetCluster, overTaskId);
    }

    // ---- pointer-based fluid cluster reorder ----
    let cdrag: { id: number; ghost: HTMLElement; offX: number; offY: number; dropStash: string | null } | null =
      null;

    function onPointerDownCluster(e: PointerEvent) {
      const grip = (e.target as HTMLElement)?.closest<HTMLElement>(".cluster-grip");
      if (!grip) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const col = grip.closest<HTMLElement>(".cluster");
      if (!col) return;
      e.preventDefault();
      const r = col.getBoundingClientRect();
      const ghost = col.cloneNode(true) as HTMLElement;
      ghost.classList.add("cluster-ghost");
      ghost.style.cssText =
        `position:fixed;left:0;top:0;width:${r.width}px;margin:0;pointer-events:none;z-index:9999;` +
        `box-shadow:var(--sh-3);opacity:.97;transition:none;transform:translate(${r.left}px,${r.top}px) rotate(1.4deg)`;
      document.body.appendChild(ghost);
      col.classList.add("cluster-dragging");
      document.body.style.userSelect = "none";
      try {
        window.getSelection()?.removeAllRanges();
      } catch {}
      cdrag = { id: Number(col.dataset.cluster), ghost, offX: e.clientX - r.left, offY: e.clientY - r.top, dropStash: null };
      document.body.setAttribute("data-dnd", "cluster");
      try {
        grip.setPointerCapture(e.pointerId);
      } catch {}
    }
    function onPointerMoveCluster(e: PointerEvent) {
      if (!cdrag) return;
      cdrag.ghost.style.transform = `translate(${e.clientX - cdrag.offX}px,${e.clientY - cdrag.offY}px) rotate(1.4deg)`;
      const stack = document.elementsFromPoint(e.clientX, e.clientY);
      let stash: HTMLElement | null = null;
      for (const n of stack) {
        const s = (n as HTMLElement).closest?.("#coldStore,#dumpBin,[data-drop='coldStore'],[data-drop='dumpBin']") as HTMLElement | null;
        if (s) {
          stash = s;
          break;
        }
      }
      cdrag.dropStash = stash ? (stash.id || stash.getAttribute("data-drop")) : null;
      document.querySelectorAll("#coldStore,[data-drop='coldStore']").forEach((el) => el.classList.toggle("dragover", cdrag?.dropStash === "coldStore"));
      document.querySelectorAll("#dumpBin,[data-drop='dumpBin']").forEach((el) => el.classList.toggle("dragover", cdrag?.dropStash === "dumpBin"));
      if (stash) return;
      let over: HTMLElement | null = null;
      for (const n of stack) {
        const c = (n as HTMLElement).closest?.(".cluster") as HTMLElement | null;
        if (c && !c.classList.contains("cluster-ghost") && Number(c.dataset.cluster) !== cdrag.id) {
          over = c;
          break;
        }
      }
      if (!over) return;
      const { clusters, callbacks } = ctxRef.current;
      const fromIdx = clusters.findIndex((c) => c.id === cdrag!.id);
      const overIdx = clusters.findIndex((c) => c.id === Number(over!.dataset.cluster));
      if (fromIdx < 0 || overIdx < 0) return;
      const r = over.getBoundingClientRect();
      const sameRow = e.clientY >= r.top && e.clientY <= r.bottom;
      const after = sameRow ? e.clientX > r.left + r.width / 2 : e.clientY > r.top + r.height / 2;
      let insert = overIdx + (after ? 1 : 0);
      if (insert > fromIdx) insert--;
      if (insert < 0) insert = 0;
      if (insert === fromIdx) return;
      const toCluster = clusters[insert];
      flipClusters(() => callbacks.reorderClustersLive(cdrag!.id, toCluster.id, insert > fromIdx));
      requestAnimationFrame(() => {
        document
          .querySelectorAll<HTMLElement>(".cluster")
          .forEach((c) => {
            if (Number(c.dataset.cluster) === cdrag?.id) c.classList.add("cluster-dragging");
          });
      });
    }
    function endCDrag() {
      if (!cdrag) return;
      const { drop, id } = { drop: cdrag.dropStash, id: cdrag.id };
      cdrag.ghost.remove();
      document
        .querySelectorAll<HTMLElement>(".cluster")
        .forEach((c) => c.classList.remove("cluster-dragging"));
      document.querySelectorAll("#coldStore,#dumpBin,[data-drop='coldStore'],[data-drop='dumpBin']").forEach((s) => s.classList.remove("dragover"));
      document.body.style.userSelect = "";
      document.body.removeAttribute("data-dnd");
      cdrag = null;
      const { callbacks } = ctxRef.current;
      if (drop === "coldStore") callbacks.coldCluster(id);
      else if (drop === "dumpBin") callbacks.binCluster(id);
      else callbacks.persistClusterOrder();
    }

    // ---- pointer-based fluid stash drag (pull tasks/clusters out of cold store & bin) ----
    let sdrag: {
      kind: "cluster" | "task";
      id: number;
      place: string;
      item: HTMLElement;
      startX: number;
      startY: number;
      ghost: HTMLElement | null;
      dropZone: HTMLElement | null;
      active: boolean;
      offX: number;
      offY: number;
    } | null = null;

    function onPointerDownStash(e: PointerEvent) {
      if (cdrag) return;
      if ((e.target as HTMLElement)?.closest(".stash-btn")) return;
      const item = (e.target as HTMLElement)?.closest<HTMLElement>(".stash-item[data-sid]");
      if (!item || !item.dataset.sid) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      sdrag = {
        kind: item.dataset.skind as "cluster" | "task",
        id: Number(item.dataset.sid),
        place: item.dataset.splace || "",
        item,
        startX: e.clientX,
        startY: e.clientY,
        ghost: null,
        dropZone: null,
        active: false,
        offX: 0,
        offY: 0,
      };
    }
    function onPointerMoveStash(e: PointerEvent) {
      if (!sdrag) return;
      if (!sdrag.active) {
        if (Math.abs(e.clientX - sdrag.startX) < 6 && Math.abs(e.clientY - sdrag.startY) < 6) return;
        sdrag.active = true;
        const r = sdrag.item.getBoundingClientRect();
        const ghost = sdrag.item.cloneNode(true) as HTMLElement;
        ghost.classList.add("stash-ghost");
        ghost.querySelector(".si-actions")?.remove();
        ghost.style.cssText =
          `position:fixed;left:0;top:0;width:${r.width}px;margin:0;pointer-events:none;z-index:9999;` +
          `box-shadow:var(--sh-3);opacity:.97;background:var(--panel);border:1px solid var(--line);transition:none;` +
          `transform:translate(${r.left}px,${r.top}px) rotate(1.2deg)`;
        document.body.appendChild(ghost);
        sdrag.ghost = ghost;
        sdrag.offX = e.clientX - r.left;
        sdrag.offY = e.clientY - r.top;
        sdrag.item.classList.add("sdragging");
        document.body.style.userSelect = "none";
        try {
          window.getSelection()?.removeAllRanges();
        } catch {}
        try {
          sdrag.item.setPointerCapture(e.pointerId);
        } catch {}
      }
      e.preventDefault();
      sdrag.ghost!.style.transform = `translate(${e.clientX - sdrag.offX}px,${e.clientY - sdrag.offY}px) rotate(1.2deg)`;
      const stack = document.elementsFromPoint(e.clientX, e.clientY);
      let zone: HTMLElement | null = null;
      for (const n of stack) {
        const z = (n as HTMLElement).closest?.("#coldStore,#dumpBin,[data-drop='coldStore'],[data-drop='dumpBin'],.cluster,.tray") as HTMLElement | null;
        if (z && !z.classList.contains("cluster-ghost")) {
          zone = z;
          break;
        }
      }
      document.querySelectorAll(".dragover").forEach((el) => {
        if (el !== zone) el.classList.remove("dragover");
      });
      sdrag.dropZone = zone;
      zone?.classList.add("dragover");
    }
    function endSDrag() {
      if (!sdrag) return;
      const s = sdrag;
      sdrag = null;
      if (!s.active) return;
      s.ghost?.remove();
      s.item.classList.remove("sdragging");
      const zone = s.dropZone;
      document.querySelectorAll(".dragover").forEach((el) => el.classList.remove("dragover"));
      document.body.style.userSelect = "";
      if (!zone) return;
      const { callbacks } = ctxRef.current;
      const zid = zone.id || zone.getAttribute("data-drop");
      if (s.kind === "cluster") {
        if (zid === "coldStore") {
          if (s.place !== "cold") callbacks.coldCluster(s.id);
        } else if (zid === "dumpBin") {
          if (s.place !== "bin") callbacks.binCluster(s.id);
        } else {
          callbacks.activateCluster(s.id);
        }
        return;
      }
      if (zid === "coldStore") {
        if (s.place !== "cold") callbacks.coldTask(s.id);
      } else if (zid === "dumpBin") {
        if (s.place !== "bin") callbacks.binTask(s.id);
      } else {
        const targetCluster = zone.classList.contains("tray") ? null : Number(zone.dataset.cluster) || null;
        callbacks.restoreTaskToZone(s.id, targetCluster);
      }
    }

    document.addEventListener("dragstart", onDragStart);
    document.addEventListener("dragend", onDragEnd);
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("dragleave", onDragLeave);
    document.addEventListener("drop", onDrop);
    document.addEventListener("pointerdown", onPointerDownCluster);
    document.addEventListener("pointermove", onPointerMoveCluster);
    document.addEventListener("pointerup", endCDrag);
    document.addEventListener("pointercancel", endCDrag);
    document.addEventListener("pointerdown", onPointerDownStash);
    document.addEventListener("pointermove", onPointerMoveStash);
    document.addEventListener("pointerup", endSDrag);
    document.addEventListener("pointercancel", endSDrag);

    return () => {
      document.body.removeAttribute("data-dnd");
      document.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("dragend", onDragEnd);
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("dragleave", onDragLeave);
      document.removeEventListener("drop", onDrop);
      document.removeEventListener("pointerdown", onPointerDownCluster);
      document.removeEventListener("pointermove", onPointerMoveCluster);
      document.removeEventListener("pointerup", endCDrag);
      document.removeEventListener("pointercancel", endCDrag);
      document.removeEventListener("pointerdown", onPointerDownStash);
      document.removeEventListener("pointermove", onPointerMoveStash);
      document.removeEventListener("pointerup", endSDrag);
      document.removeEventListener("pointercancel", endSDrag);
    };
  }, []);
}
