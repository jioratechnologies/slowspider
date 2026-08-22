import { Injectable, Logger } from "@nestjs/common";
import * as Y from "yjs";
import { SupabaseService } from "../common/services/supabase.service";
import { NatsService } from "../common/services/nats.service";

// CRDT co-editing of Note.body for kind:"text"/"rich" notes (see
// docs/MIGRATION-PLAN-bff-kong-split.md's Realtime section). This service is the backend's
// own authoritative Yjs participant for each currently-open note — not just a dumb relay:
// it applies every client update to an in-memory Y.Doc so it can periodically snapshot the
// merged result (plain-text body + full Yjs state) into Postgres. Deliberately keeps this
// synchronous/local rather than round-tripping through NATS to itself (see
// realtime.gateway.ts's header comment for why): every WS connection on this backend
// instance is handled by this same process, so there's no need to publish-then-subscribe
// back to apply an update to the doc *this* instance already has in memory — NATS is used
// purely to fan the raw update bytes out to *other* connections (this instance's other
// sockets, or another backend instance's, in a multi-instance deployment), never to loop
// updates back into this service. That's the one deliberate simplification here, matching
// the "lowest ops for a solo maintainer" theme the rest of this migration uses (Kong/NATS
// are both single-container, no-cluster setups) — see this file's own note on multi-instance
// snapshot behavior below.
@Injectable()
export class YjsDocService {
  private readonly logger = new Logger(YjsDocService.name);
  private readonly docs = new Map<number, OpenNoteDoc>(); // keyed by noteId

  constructor(
    private readonly supabase: SupabaseService,
    private readonly nats: NatsService
  ) {}

  /**
   * Opens (or joins, if another connection already has it open) the Yjs doc for one note.
   * On a genuinely first open (nothing in memory, no persisted `yjs_state` yet), seeds the
   * doc's Y.Text from the note's current plain-text `body` — this is what keeps shipping
   * this feature from wiping every pre-existing note's content the moment a client opens it.
   * Reads via a per-token RLS-scoped client (same as every other notes read/write in
   * board.service.ts) so a private note's visibility rule is enforced by Postgres RLS, not
   * re-implemented here — an unauthorized open just looks like "note not found".
   *
   * Returns the doc's full merged state as a base64 `Y.encodeStateAsUpdate` snapshot, for the
   * caller to send back as a `doc-sync` message so the client can bootstrap without needing
   * full update-history replay.
   */
  async open(token: string, workspaceId: number, noteId: number): Promise<string> {
    let entry = this.docs.get(noteId);
    if (entry) {
      entry.refCount++;
      entry.token = token; // keep a reasonably fresh token on hand for the next flush() write
      return bytesToBase64(Y.encodeStateAsUpdate(entry.doc));
    }

    const client = this.supabase.forToken(token);
    const { data, error } = await client
      .from("notes")
      .select("id, workspace_id, kind, body, yjs_state")
      .eq("id", noteId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const row = data as NoteRow | null;
    if (!row) throw new Error("Note not found.");
    if (!COLLAB_KINDS.has(row.kind)) throw new Error(`Note kind "${row.kind}" doesn't support collaborative editing.`);

    const doc = new Y.Doc();
    const ytext = doc.getText("body");
    if (row.yjs_state) {
      // Not the first open ever — resume from the last persisted snapshot.
      Y.applyUpdate(doc, base64ToBytes(row.yjs_state));
    } else if (row.body) {
      // First open of a pre-existing plain-text note: seed, don't wipe.
      ytext.insert(0, row.body);
    }

    entry = { doc, ytext, refCount: 1, workspaceId, token, dirty: false, flushTimer: null };
    this.docs.set(noteId, entry);
    return bytesToBase64(Y.encodeStateAsUpdate(doc));
  }

  /** Applies an incoming base64 Yjs update (from a client's local edit) to the note's
   * authoritative server-side doc and schedules a debounced Postgres snapshot. No-op if the
   * note isn't currently open (client sent an update without subscribing first, or after the
   * server already evicted it). */
  applyUpdate(noteId: number, updateBase64: string): void {
    const entry = this.docs.get(noteId);
    if (!entry) return;
    Y.applyUpdate(entry.doc, base64ToBytes(updateBase64));
    entry.dirty = true;
    this.scheduleFlush(noteId, entry);
  }

  /** Called when one connection stops editing a note (doc-unsubscribe, or socket close while
   * subscribed). Decrements the refcount; once nothing on this backend instance has the note
   * open any more, flushes any pending change immediately (rather than waiting out the
   * debounce — "every note-close" from the spec) and evicts the in-memory doc. */
  async close(noteId: number): Promise<void> {
    const entry = this.docs.get(noteId);
    if (!entry) return;
    entry.refCount--;
    if (entry.refCount > 0) return;

    if (entry.flushTimer) {
      clearTimeout(entry.flushTimer);
      entry.flushTimer = null;
    }
    if (entry.dirty) {
      await this.flush(noteId).catch((err) =>
        this.logger.warn(`Yjs snapshot flush on close failed for note ${noteId}: ${(err as Error).message}`)
      );
    }
    this.docs.delete(noteId);
  }

  private scheduleFlush(noteId: number, entry: OpenNoteDoc): void {
    if (entry.flushTimer) return; // a flush is already pending — this update will ride along
    entry.flushTimer = setTimeout(() => {
      entry.flushTimer = null;
      this.flush(noteId).catch((err) => this.logger.warn(`Yjs snapshot flush failed for note ${noteId}: ${(err as Error).message}`));
    }, FLUSH_DEBOUNCE_MS);
  }

  /**
   * Snapshots the merged doc into Postgres: `body` becomes the plain-text mirror
   * (`Y.Text.toString()`) so every existing reader of `body` (REST responses, other note
   * kinds' rendering, mobile) stays correct with zero changes on their end, and `yjs_state`
   * becomes the full `Y.encodeStateAsUpdate` snapshot so the next open() can resume instead
   * of replaying history. Also republishes the row on the existing whole-record `notes`
   * change subject (`NatsService.publishChange`) — reuses the sync path every other note
   * mutation already goes through, so a note card/preview elsewhere in the UI picks up the
   * merged text too, without inventing a second "note body changed" event type.
   *
   * Multi-instance note: with more than one backend instance, more than one instance could
   * have this note open (each with its own in-memory doc, kept convergent by the NATS
   * doc-update relay) and each independently flushes on its own debounce timer. That's safe,
   * not just tolerated — every instance's doc has applied the same set of updates (Yjs
   * updates are commutative/idempotent), so every flush writes the same merged `body`/
   * `yjs_state`; the only actual race is "which instance's UPDATE lands last", which is
   * harmless here since they'd write equivalent content. Documented rather than solved with
   * e.g. distributed locking — a single-instance `docker-compose` deployment (this repo's
   * actual shape) never hits this path at all.
   */
  private async flush(noteId: number): Promise<void> {
    const entry = this.docs.get(noteId);
    if (!entry || !entry.dirty) return;
    entry.dirty = false;

    const body = entry.ytext.toString();
    const yjsState = bytesToBase64(Y.encodeStateAsUpdate(entry.doc));
    const client = this.supabase.forToken(entry.token);
    const { data, error } = await client
      .from("notes")
      .update({ body, yjs_state: yjsState, updated_at: new Date().toISOString() })
      .eq("id", noteId)
      .eq("workspace_id", entry.workspaceId)
      .select()
      .single();
    if (error) {
      this.logger.warn(`Yjs snapshot write failed for note ${noteId}: ${error.message}`);
      entry.dirty = true; // couldn't persist — leave dirty so the next update/close retries
      return;
    }
    this.nats.publishChange(entry.workspaceId, "notes", "UPDATE", data);
  }
}

const FLUSH_DEBOUNCE_MS = 1500;
const COLLAB_KINDS = new Set(["text", "rich"]);

interface NoteRow {
  id: number;
  workspace_id: number;
  kind: string;
  body: string;
  yjs_state: string | null;
}

interface OpenNoteDoc {
  doc: Y.Doc;
  ytext: Y.Text;
  refCount: number;
  workspaceId: number;
  /** Most recently seen access token from any connection that has this note open — used to
   * write the periodic snapshot via a per-token RLS-scoped client, same pattern as every
   * other notes write in board.service.ts. */
  token: string;
  dirty: boolean;
  flushTimer: ReturnType<typeof setTimeout> | null;
}

export function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

export function base64ToBytes(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}
