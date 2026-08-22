import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { connect, NatsConnection, StringCodec, type ConnectionOptions } from "nats";

export type ChangeType = "INSERT" | "UPDATE" | "DELETE";

// Phase 5 of docs/MIGRATION-PLAN-bff-kong-split.md — "whole-record live sync" half only
// (the CRDT/Yjs half of that section is out of scope, not built here). Replaces the old
// Supabase Realtime `postgres_changes` path apps/web's useRealtimeBoard.ts used to rely on:
// every board/notes mutation below now also fans out a change event over NATS so other
// connected clients on the same workspace pick it up without a manual refresh.
//
// Connects once on startup (mirrors RedisService/SupabaseService's provider pattern, but
// eager rather than lazy since we want a clear boot-time signal — see main.ts's log line —
// of whether live sync is actually wired up). A publish is fire-and-forget: NATS being
// down must never fail the mutation itself, so publishChange only logs on failure.
@Injectable()
export class NatsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NatsService.name);
  private readonly sc = StringCodec();
  private connection: NatsConnection | null = null;

  async onModuleInit(): Promise<void> {
    const servers = process.env.NATS_URL;
    if (!servers) {
      this.logger.warn("NATS_URL is not set — live-sync change events will not be published.");
      return;
    }

    const options: ConnectionOptions = { servers, name: "backend" };
    if (process.env.NATS_AUTH_TOKEN) options.token = process.env.NATS_AUTH_TOKEN;

    try {
      this.connection = await connect(options);
      this.logger.log(`Connected to NATS at ${servers}`);
      void this.connection.closed().then((err) => {
        if (err) this.logger.error(`NATS connection closed with an error: ${err.message}`);
      });
    } catch (err) {
      this.logger.error(
        `Failed to connect to NATS at ${servers}: ${(err as Error).message} — live-sync change events will be dropped.`
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.connection?.drain();
  }

  /**
   * Publishes a whole-record change event on the per-workspace live-sync subject
   * (`ws.<workspaceId>.change`), payload `{table, type, row}`. This is what
   * apps/backend/src/realtime/realtime.gateway.ts subscribes to (server-to-server, over
   * this same trusted connection) and relays out to whichever browser WebSocket
   * connections are authenticated for that workspace — see that file for the exact shape
   * each handler expects off `row` (full row for INSERT/UPDATE, at least `{id}` for DELETE).
   */
  publishChange(workspaceId: number, table: string, type: ChangeType, row: unknown): void {
    this.publishJSON(`ws.${workspaceId}.change`, { table, type, row });
  }

  /**
   * Publishes a Yjs binary update (already base64-encoded by the caller) for one note's
   * collaborative-editing doc, on `ws.<workspaceId>.doc.<noteId>.update` — the CRDT co-editing
   * subject from docs/MIGRATION-PLAN-bff-kong-split.md's Realtime section. `originId` tags
   * which WS connection produced this update so realtime.gateway.ts's per-connection relay can
   * skip forwarding it back to the connection that just sent it (NATS delivers to every
   * subscriber on the subject, including the publisher's own subscription if it has one).
   */
  publishDocUpdate(workspaceId: number, noteId: number, update: string, originId: string): void {
    this.publishJSON(`ws.${workspaceId}.doc.${noteId}.update`, { update, originId });
  }

  /** Same pattern as publishDocUpdate, for Yjs awareness (cursor/presence) payloads — a
   * separate subject so a client can subscribe to text updates without awareness noise or
   * vice versa, though realtime.gateway.ts currently subscribes to both together per note. */
  publishAwarenessUpdate(workspaceId: number, noteId: number, update: string, originId: string): void {
    this.publishJSON(`ws.${workspaceId}.doc.${noteId}.awareness`, { update, originId });
  }

  private publishJSON(subject: string, payload: unknown): void {
    if (!this.connection) return; // not connected — see onModuleInit's warning/error above
    try {
      this.connection.publish(subject, this.sc.encode(JSON.stringify(payload)));
    } catch (err) {
      this.logger.warn(`Failed to publish NATS message on ${subject}: ${(err as Error).message}`);
    }
  }

  /**
   * Subscribes to a subject on the backend's own trusted server-to-server NATS connection
   * and invokes `handler` for each decoded JSON message. Used exclusively by
   * realtime.gateway.ts (whole-record change relay, and now the per-note Yjs update/awareness
   * relay) — never called with client-supplied subjects. Returns an unsubscribe function;
   * safe to call even if NATS never connected (no-op subscription). Generic over the decoded
   * payload shape so the same method serves both the `{table,type,row}` change events and the
   * `{update,originId}` doc/awareness events without a second near-identical method.
   */
  subscribe<T>(subject: string, handler: (event: T) => void): () => void {
    if (!this.connection) {
      this.logger.warn(`Cannot subscribe to ${subject} — not connected to NATS.`);
      return () => {};
    }

    const sub = this.connection.subscribe(subject);
    (async () => {
      for await (const msg of sub) {
        try {
          handler(JSON.parse(this.sc.decode(msg.data)) as T);
        } catch (err) {
          this.logger.warn(`Failed to decode NATS message on ${subject}: ${(err as Error).message}`);
        }
      }
    })();

    return () => sub.unsubscribe();
  }
}
