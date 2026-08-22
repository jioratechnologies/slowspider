"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import type { NoteDocServerMsg } from "@slowspider/shared-types";
import type { RealtimeDocChannel } from "@/hooks/useRealtimeBoard";
import { base64ToBytes, bytesToBase64 } from "./base64";

// Marks a Y.Doc transaction as originating from *this* client's own textarea input, vs. one
// applied from an incoming doc-sync/doc-update message. Only LOCAL_ORIGIN updates get
// published back out — this is the client-side half of the "don't echo a client's own update
// back to itself" guard (the other half is realtime.gateway.ts tagging each publish with the
// connection id and skipping delivery back to that same connection; belt-and-suspenders, and
// harmless either way since re-applying an already-applied Yjs update is a no-op).
const LOCAL_ORIGIN = "local-edit";
const REMOTE_ORIGIN = "remote";

export interface CollabNoteText {
  /** Current merged plain-text content — the Y.Text's toString(), kept in sync with every
   * local keystroke and every incoming remote update. */
  value: string;
  /** True once the initial doc-sync snapshot has been applied — before this, `value` is
   * whatever the (uninitialized) local Y.Doc happens to hold, not the real note content. */
  ready: boolean;
  /** Set when doc-subscribe was rejected (e.g. this note kind isn't collaboratively
   * editable, or it doesn't exist/isn't visible to this user) — null otherwise. */
  error: string | null;
  /** Call on every textarea keystroke with the textarea's new full value. Diffs against the
   * previous value and applies just the changed range to the local Y.Text inside a
   * LOCAL_ORIGIN transaction, which is what triggers publishing the resulting update. */
  onLocalChange: (next: string) => void;
}

/**
 * Binds one note's `body` to a Yjs CRDT doc over the shared `/v1/realtime` connection (see
 * useRealtimeBoard's RealtimeDocChannel — this does NOT open a second WebSocket). This is the
 * client-side half of the custom Yjs/NATS provider described in
 * docs/MIGRATION-PLAN-bff-kong-split.md's Realtime section: on a local edit, publish a Yjs
 * update; on an incoming doc-sync/doc-update message, apply it via Y.applyUpdate.
 */
// Note: `noteId` is expected to be stable for the lifetime of a given mount of whatever
// component calls this hook (CollaborativeNoteEditor is rendered with `key={noteId}` at its
// call site in NotesPanel, so switching which note is open unmounts/remounts fresh rather
// than reusing this hook's state across notes) — that's what lets the effect below treat
// `ready`/`error`/`value`'s useState defaults as the correct "just opened" state instead of
// needing to reset them itself on every dependency change (calling setState synchronously at
// the top of an effect body is a React anti-pattern; remounting via `key` is the recommended
// fix for "reset local state when an identity changes" instead).
export function useCollabNoteText(noteId: number, docChannel: RealtimeDocChannel): CollabNoteText {
  const docRef = useRef<Y.Doc | null>(null);
  const ytextRef = useRef<Y.Text | null>(null);
  const [value, setValue] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const doc = new Y.Doc();
    const ytext = doc.getText("body");
    docRef.current = doc;
    ytextRef.current = ytext;

    // Fires for both local (LOCAL_ORIGIN) and remote (REMOTE_ORIGIN) transactions — value
    // needs to reflect either; only local ones get published back out (below).
    const onYtextChange = () => setValue(ytext.toString());
    ytext.observe(onYtextChange);

    const onDocUpdateEvent = (update: Uint8Array, origin: unknown) => {
      if (origin !== LOCAL_ORIGIN) return;
      docChannel.sendDoc({ type: "doc-update", noteId, update: bytesToBase64(update) });
    };
    doc.on("update", onDocUpdateEvent);

    const removeDocListener = docChannel.addDocListener(noteId, (msg: NoteDocServerMsg) => {
      if (msg.noteId !== noteId) return;
      if (msg.type === "doc-sync") {
        Y.applyUpdate(doc, base64ToBytes(msg.state), REMOTE_ORIGIN);
        setReady(true);
      } else if (msg.type === "doc-update") {
        Y.applyUpdate(doc, base64ToBytes(msg.update), REMOTE_ORIGIN);
      } else if (msg.type === "doc-error") {
        setError(msg.error);
      }
    });

    // Sends doc-subscribe as soon as the socket is open — immediately if already connected,
    // or on the next (re)connect otherwise. Re-fires on every reconnect: the backend's
    // in-memory Yjs doc for THIS connection is gone the moment the socket drops, so a fresh
    // doc-subscribe (and thus a fresh doc-sync reply) is needed to resume.
    const removeOpenListener = docChannel.addOpenListener(() => {
      docChannel.sendDoc({ type: "doc-subscribe", noteId });
    });

    return () => {
      ytext.unobserve(onYtextChange);
      doc.off("update", onDocUpdateEvent);
      removeDocListener();
      removeOpenListener();
      docChannel.sendDoc({ type: "doc-unsubscribe", noteId });
      doc.destroy();
      docRef.current = null;
      ytextRef.current = null;
    };
  }, [noteId, docChannel]);

  const onLocalChange = useCallback((next: string) => {
    const doc = docRef.current;
    const ytext = ytextRef.current;
    if (!doc || !ytext) return;
    const prev = ytext.toString();
    if (prev === next) return;
    const { start, endPrev, endNext } = diffRange(prev, next);
    doc.transact(() => {
      if (endPrev > start) ytext.delete(start, endPrev - start);
      if (endNext > start) ytext.insert(start, next.slice(start, endNext));
    }, LOCAL_ORIGIN);
  }, []);

  return { value, ready, error, onLocalChange };
}

/** Smallest [start, endPrev) -> [start, endNext) replacement range that turns `a` into `b` —
 * common-prefix/common-suffix diff, the same minimal approach y-textarea itself uses to turn
 * a whole-value textarea onChange into a small Y.Text delete+insert instead of replacing the
 * entire document on every keystroke. Exported for CollaborativeNoteEditor's cursor-position
 * preservation on remotely-applied changes. */
export function diffRange(a: string, b: string): { start: number; endPrev: number; endNext: number } {
  let start = 0;
  const maxStart = Math.min(a.length, b.length);
  while (start < maxStart && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  return { start, endPrev: endA, endNext: endB };
}
