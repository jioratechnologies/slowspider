"use client";

import { useEffect, useRef } from "react";
import { connect, StringCodec, type NatsConnection, type Subscription } from "nats.ws";
import type { Category, Cluster, Milestone, Note, Task } from "@/lib/types";

type ChangeType = "INSERT" | "UPDATE" | "DELETE";

export interface RealtimeBoardHandlers {
  onTaskChange: (type: ChangeType, row: Task) => void;
  onClusterChange: (type: ChangeType, row: Cluster) => void;
  onCategoryChange: (type: ChangeType, row: Category) => void;
  onMilestoneChange: (type: ChangeType, row: Milestone) => void;
  onNoteChange: (type: ChangeType, row: Note) => void;
}

type ChangeEvent =
  | { table: "tasks"; type: ChangeType; row: Task }
  | { table: "clusters"; type: ChangeType; row: Cluster }
  | { table: "categories"; type: ChangeType; row: Category }
  | { table: "milestones"; type: ChangeType; row: Milestone }
  | { table: "notes"; type: ChangeType; row: Note };

// KNOWN SIMPLIFICATION (see infra/nats/nats.conf and docs/MIGRATION-PLAN-bff-kong-split.md's
// Phase 5 section): a single shared token gates the NATS socket, not per-workspace
// authorization. It's necessarily public here (NEXT_PUBLIC_-prefixed, shipped to the
// browser) — anyone holding it could subscribe to any workspace's subject, not just ones
// they're a member of. Accepted gap for now (solo maintainer, pre-production).
const NATS_WS_URL = process.env.NEXT_PUBLIC_NATS_WS_URL || "ws://localhost:8080";
const NATS_AUTH_TOKEN = process.env.NEXT_PUBLIC_NATS_AUTH_TOKEN;

const sc = StringCodec();

// Subscribes to live whole-record change events on one workspace's NATS subject
// (`ws.<workspaceId>.change`) — this is what makes a collaborator's edit show up without a
// manual refresh. Replaces the old direct Supabase Realtime `postgres_changes` subscription
// (Phase 5 of docs/MIGRATION-PLAN-bff-kong-split.md — this is the "whole-record live sync"
// half of that section only; no CRDT/Yjs here, that's explicitly out of scope).
//
// The backend (apps/backend/src/common/services/nats.service.ts) publishes one event per
// mutation as `{table, type, row}` right after every successful board/notes DB write; this
// hook just routes each event to the matching on*Change handler by table name — same
// handlers, same call sites in Board.tsx, nothing else changes. Connects directly to NATS's
// websocket listener, bypassing Kong entirely, same reasoning as the Realtime path it
// replaces (Kong routes request/response API traffic only, not this).
export function useRealtimeBoard(workspaceId: number, handlers: RealtimeBoardHandlers) {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    let cancelled = false;
    let nc: NatsConnection | null = null;
    let sub: Subscription | null = null;

    (async () => {
      try {
        nc = await connect({ servers: NATS_WS_URL, token: NATS_AUTH_TOKEN });
        if (cancelled) {
          await nc.close();
          return;
        }

        sub = nc.subscribe(`ws.${workspaceId}.change`);
        for await (const msg of sub) {
          let event: ChangeEvent;
          try {
            event = JSON.parse(sc.decode(msg.data)) as ChangeEvent;
          } catch {
            continue; // malformed payload — skip it rather than take down the whole subscription
          }
          const h = handlersRef.current;
          switch (event.table) {
            case "tasks":
              h.onTaskChange(event.type, event.row);
              break;
            case "clusters":
              h.onClusterChange(event.type, event.row);
              break;
            case "categories":
              h.onCategoryChange(event.type, event.row);
              break;
            case "milestones":
              h.onMilestoneChange(event.type, event.row);
              break;
            case "notes":
              h.onNoteChange(event.type, event.row);
              break;
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error("useRealtimeBoard: NATS connection error", err);
        }
      }
    })();

    return () => {
      cancelled = true;
      sub?.unsubscribe();
      nc?.close();
    };
  }, [workspaceId]);
}
