"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Category, Cluster, Milestone, Note, Task } from "@/lib/types";

type ChangeType = "INSERT" | "UPDATE" | "DELETE";

export interface RealtimeBoardHandlers {
  onTaskChange: (type: ChangeType, row: Task) => void;
  onClusterChange: (type: ChangeType, row: Cluster) => void;
  onCategoryChange: (type: ChangeType, row: Category) => void;
  onMilestoneChange: (type: ChangeType, row: Milestone) => void;
  onNoteChange: (type: ChangeType, row: Note) => void;
}

// Subscribes to live Postgres changes on the four board tables, scoped to one workspace —
// this is what makes a collaborator's edit show up without a manual refresh. Authorization
// for the subscription itself comes from RLS on the browser client's Supabase session, not
// this filter (the filter is just "don't bother sending me rows I can already see anyway
// from other workspaces" — RLS is still what actually stops a non-member's client from
// getting anything at all).
export function useRealtimeBoard(workspaceId: number, handlers: RealtimeBoardHandlers) {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const supabase = createClient();
    const filter = `workspace_id=eq.${workspaceId}`;

    const channel = supabase
      .channel(`workspace-${workspaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter }, (payload) => {
        const row = (payload.eventType === "DELETE" ? payload.old : payload.new) as Task;
        handlersRef.current.onTaskChange(payload.eventType, row);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "clusters", filter }, (payload) => {
        const row = (payload.eventType === "DELETE" ? payload.old : payload.new) as Cluster;
        handlersRef.current.onClusterChange(payload.eventType, row);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "categories", filter }, (payload) => {
        const row = (payload.eventType === "DELETE" ? payload.old : payload.new) as Category;
        handlersRef.current.onCategoryChange(payload.eventType, row);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "milestones", filter }, (payload) => {
        const row = (payload.eventType === "DELETE" ? payload.old : payload.new) as Milestone;
        handlersRef.current.onMilestoneChange(payload.eventType, row);
      })
      // Private notes are filtered out by the notes RLS policy before the change is
      // broadcast, so another member's private note never reaches this client.
      .on("postgres_changes", { event: "*", schema: "public", table: "notes", filter }, (payload) => {
        const row = (payload.eventType === "DELETE" ? payload.old : payload.new) as Note;
        handlersRef.current.onNoteChange(payload.eventType, row);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId]);
}
