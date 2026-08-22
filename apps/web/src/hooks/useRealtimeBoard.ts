"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Category, Cluster, Milestone, Note, Task } from "@/lib/types";
import type { NoteDocClientMsg, NoteDocServerMsg } from "@slowspider/shared-types";

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

// A `{table,...}` whole-record change event vs. a `{type: "doc-*"|"awareness-*",...}` CRDT
// message (see @slowspider/shared-types's NoteDocServerMsg) are told apart by which
// discriminant key is present — see onmessage below.
type IncomingMsg = ChangeEvent | NoteDocServerMsg;

/**
 * The subset of the realtime WS connection exposed for CRDT co-editing (see
 * docs/MIGRATION-PLAN-bff-kong-split.md's Realtime section — "True concurrent co-editing").
 * Deliberately rides the *same* WebSocket useRealtimeBoard already owns rather than opening a
 * second connection — see useCollabNoteText (lib/yjs/use-collab-note-text.ts), the sole
 * consumer of this.
 */
export interface RealtimeDocChannel {
  /** Sends a doc-subscribe/doc-update/doc-unsubscribe/awareness-update message. Silently
   * dropped if the socket isn't open right now — onOpen below is how a caller resubscribes
   * after a reconnect. */
  sendDoc: (msg: NoteDocClientMsg) => void;
  /** Registers a listener for server->client doc/awareness messages scoped to one noteId.
   * Returns an unsubscribe function. */
  addDocListener: (noteId: number, listener: (msg: NoteDocServerMsg) => void) => () => void;
  /** Registers a callback fired every time the underlying socket (re)connects — including the
   * first time. This is what lets a currently-open collaborative editor re-send its
   * doc-subscribe after a network blip, since the backend's in-memory Yjs doc state for this
   * connection is gone the moment the socket drops. */
  addOpenListener: (listener: () => void) => () => void;
}

// SECURITY FIX (see docs/MIGRATION-PLAN-bff-kong-split.md's Realtime section): this used to
// connect straight to NATS's websocket listener, gated only by a single shared bearer token
// that was necessarily public (NEXT_PUBLIC_-prefixed) — anyone holding it could subscribe to
// ANY workspace's subject, not just ones they're a member of. NATS is no longer reachable
// from outside the Docker network at all. Instead, the browser connects to the backend's own
// authenticated WS relay (apps/backend/src/realtime/realtime.gateway.ts), which verifies the
// Supabase access token AND that the caller is actually a member of the requested workspace
// before ever completing the handshake, then internally subscribes to that one workspace's
// `ws.<workspaceId>.change` NATS subject (over the backend's own trusted server-to-server
// NatsService connection) and relays events to this connection only.
//
// Browsers' native WebSocket API can't set custom headers, so the access token and target
// workspace travel as query params (`?token=...&workspaceId=...`) — a common, accepted
// pattern for WS auth, same tradeoff cookie-based session auth makes implicitly. The token
// comes from the browser Supabase client's own session (apps/web/src/lib/supabase/client.ts,
// supabase.auth.getSession()) — this hook runs client-side, so it can't use
// backend-client.ts's server-only getAccessToken() (that reads the SSR cookie session).
const REALTIME_WS_URL = process.env.NEXT_PUBLIC_REALTIME_WS_URL || "ws://localhost:8000";
const REALTIME_PATH = "/v1/realtime";
const RECONNECT_DELAY_MS = 2000;

// Subscribes to live whole-record change events on one workspace — this is what makes a
// collaborator's edit show up without a manual refresh. Same `RealtimeBoardHandlers`
// interface, same handler routing by table name, same call site in Board.tsx as the old
// direct-NATS version — only the transport/auth underneath changed.
//
// Also the single owner of the `/v1/realtime` WebSocket, so CRDT co-editing (see
// RealtimeDocChannel above) shares this same connection instead of opening a second one — the
// returned object is how a collaborative note editor mounted elsewhere in the tree reaches it.
export function useRealtimeBoard(workspaceId: number, handlers: RealtimeBoardHandlers): RealtimeDocChannel {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  const wsRef = useRef<WebSocket | null>(null);
  const docListenersRef = useRef<Map<number, Set<(msg: NoteDocServerMsg) => void>>>(new Map());
  const openListenersRef = useRef<Set<() => void>>(new Set());

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    const supabase = createClient();

    async function connect() {
      if (cancelled) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        // No active session yet (e.g. still hydrating auth) — try again shortly rather than
        // giving up permanently.
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
        return;
      }

      const url = new URL(REALTIME_PATH, REALTIME_WS_URL);
      url.searchParams.set("token", session.access_token);
      url.searchParams.set("workspaceId", String(workspaceId));

      const socket = new WebSocket(url);
      ws = socket;
      wsRef.current = socket;

      socket.onopen = () => {
        for (const listener of openListenersRef.current) listener();
      };

      socket.onmessage = (msg) => {
        let event: IncomingMsg;
        try {
          event = JSON.parse(msg.data as string) as IncomingMsg;
        } catch {
          return; // malformed payload — skip it rather than take down the whole connection
        }

        if (!("table" in event)) {
          // CRDT doc/awareness message — dispatch to whichever collaborative editor (if any)
          // currently has this noteId open. No listener registered (nobody has it open right
          // now) is a normal, silent no-op. (Both message families happen to carry a `type`
          // field with disjoint value sets — INSERT/UPDATE/DELETE vs. doc-sync/doc-update/...
          // — so `table` is the only reliable structural discriminant between them.)
          const listeners = docListenersRef.current.get(event.noteId);
          if (listeners) for (const listener of listeners) listener(event);
          return;
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
      };

      socket.onclose = () => {
        if (wsRef.current === socket) wsRef.current = null;
        if (cancelled) return;
        // Connection dropped (network blip, backend restart, rejected/expired token, ...) —
        // reconnect with a fixed delay instead of leaving live sync silently dead until the
        // next full page load. Mirrors the automatic-reconnect behavior the old direct-NATS
        // connection got for free from the nats.ws client library.
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      };

      socket.onerror = (err) => {
        // A WebSocket 'error' event carries no useful detail (browsers don't expose HTTP
        // status/close-reason on it for security reasons); 'close' always follows and is
        // where reconnection is scheduled. Logged here purely as a signal something's wrong.
        console.error("useRealtimeBoard: WebSocket error", err);
      };
    }

    void connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current = null;
      ws?.close();
    };
  }, [workspaceId]);

  const sendDoc = useCallback((msg: NoteDocClientMsg) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  const addDocListener = useCallback((noteId: number, listener: (msg: NoteDocServerMsg) => void) => {
    let set = docListenersRef.current.get(noteId);
    if (!set) {
      set = new Set();
      docListenersRef.current.set(noteId, set);
    }
    set.add(listener);
    return () => {
      set!.delete(listener);
      if (set!.size === 0) docListenersRef.current.delete(noteId);
    };
  }, []);

  const addOpenListener = useCallback((listener: () => void) => {
    openListenersRef.current.add(listener);
    // Already connected by the time this is called (e.g. editor opened well after mount) —
    // fire immediately so the caller doesn't wait for the next reconnect to subscribe.
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) listener();
    return () => {
      openListenersRef.current.delete(listener);
    };
  }, []);

  return useMemo(() => ({ sendDoc, addDocListener, addOpenListener }), [sendDoc, addDocListener, addOpenListener]);
}
