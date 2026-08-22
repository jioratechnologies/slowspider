import { randomUUID } from "crypto";
import { Injectable, Logger } from "@nestjs/common";
import type { IncomingMessage, Server as HttpServer } from "http";
import type { Socket } from "net";
import { WebSocket, WebSocketServer } from "ws";
import type { NoteDocClientMsg, NoteDocServerMsg } from "@slowspider/shared-types";
import { SupabaseService } from "../common/services/supabase.service";
import { WorkspaceService } from "../workspace/workspace.service";
import { NatsService } from "../common/services/nats.service";
import { YjsDocService } from "./yjs-doc.service";

export const REALTIME_PATH = "/v1/realtime";

interface DocUpdateWireMsg {
  update: string;
  originId: string;
}

// Replaces the browser-connects-directly-to-NATS design from Phase 5 (see
// docs/MIGRATION-PLAN-bff-kong-split.md's Realtime section) — that let anyone holding the
// single shared NATS_AUTH_TOKEN subscribe to ANY workspace's subject, not just ones they're
// a member of. This gateway is the fix: the browser now talks to the backend's own
// authenticated WS endpoint instead of NATS, and the backend is the only thing that ever
// speaks NATS (over its existing trusted server-to-server connection, NatsService).
//
// Deliberately NOT a @WebSocketGateway()-decorated class (that abstraction is built around
// socket.io/message-handler patterns; this endpoint used to only ever push server->client,
// and the one thing that actually matters here — rejecting the connection BEFORE the WS
// handshake completes if auth fails — is much more direct to express with a plain `ws`
// server run in `noServer` mode, wired onto Nest's own underlying HTTP server via the
// 'upgrade' event). See realtime.module.ts / main.ts for how this gets attached.
//
// CRDT co-editing (docs/MIGRATION-PLAN-bff-kong-split.md's Realtime section) rides this same
// connection/auth gate rather than a second one: once authenticated for a workspace, a
// client can additionally send `doc-subscribe`/`doc-update`/`doc-unsubscribe`/
// `awareness-update` messages (see @slowspider/shared-types's NoteDoc*Msg types) scoped to
// whichever notes it currently has open in the collaborative editor — not the whole
// workspace's notes, so a workspace with many notes doesn't fan every edit stream out to
// every connected client. This is the one part of this gateway that now reads client-sent
// messages, not just pushes; see onConnection's `ws.on("message", ...)` below.
@Injectable()
export class RealtimeGateway {
  private readonly logger = new Logger(RealtimeGateway.name);
  private wss: WebSocketServer | null = null;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly workspace: WorkspaceService,
    private readonly nats: NatsService,
    private readonly yjsDocs: YjsDocService
  ) {}

  /** Called once from main.ts, after NestFactory.create() and before app.listen(). */
  attach(httpServer: HttpServer): void {
    this.wss = new WebSocketServer({ noServer: true });
    httpServer.on("upgrade", (req: IncomingMessage, socket: Socket, head: Buffer) => {
      void this.handleUpgrade(req, socket, head);
    });
    this.logger.log(`Realtime WS gateway attached at ${REALTIME_PATH}`);
  }

  private reject(socket: Socket, status: number, message: string): void {
    try {
      socket.write(`HTTP/1.1 ${status} ${message}\r\nConnection: close\r\n\r\n`);
    } finally {
      socket.destroy();
    }
  }

  /**
   * Auth handshake, ported from SupabaseAuthGuard's canActivate(): verify the Supabase
   * access token via supabase.auth.getUser(token), then verify the resulting user is
   * actually a member of the requested workspace via WorkspaceService.isMember() — same
   * membership check every REST call's guard indirectly relies on. Either failure rejects
   * the upgrade at the HTTP level (a real 401/403 status, socket destroyed) rather than
   * completing the WS handshake and closing it a moment later.
   *
   * Browsers' native WebSocket API can't set custom headers, so the token and target
   * workspace travel as query params (`?token=...&workspaceId=...`) — a common, accepted
   * pattern for WS auth (same tradeoff cookie-based session auth makes implicitly).
   */
  private async handleUpgrade(req: IncomingMessage, socket: Socket, head: Buffer): Promise<void> {
    const url = new URL(req.url || "", "http://internal");
    // Not this gateway's path — reject cleanly rather than leaving the upgrade hanging (no
    // other 'upgrade' listener exists on this server to pick it up).
    if (url.pathname !== REALTIME_PATH) return this.reject(socket, 404, "Not Found");

    const token = url.searchParams.get("token");
    const workspaceIdRaw = url.searchParams.get("workspaceId");
    const workspaceId = workspaceIdRaw ? Number(workspaceIdRaw) : NaN;

    if (!token) return this.reject(socket, 401, "Unauthorized");
    if (!workspaceIdRaw || !Number.isInteger(workspaceId)) return this.reject(socket, 400, "Bad Request");

    let userId: string;
    try {
      const { data, error } = await this.supabase.anon().auth.getUser(token);
      if (error || !data.user) return this.reject(socket, 401, "Unauthorized");
      userId = data.user.id;
    } catch (err) {
      this.logger.warn(`Realtime auth check errored: ${(err as Error).message}`);
      return this.reject(socket, 401, "Unauthorized");
    }

    const isMember = await this.workspace.isMember(workspaceId, userId).catch((err: Error) => {
      this.logger.warn(`Realtime membership check errored: ${err.message}`);
      return false;
    });
    if (!isMember) return this.reject(socket, 403, "Forbidden");

    this.wss!.handleUpgrade(req, socket, head, (ws) => this.onConnection(ws, workspaceId, userId, token));
  }

  /**
   * On a successful handshake, subscribe (over the backend's own trusted NATS connection)
   * to this one workspace's change subject and relay each event to this one browser
   * connection only. Also wires up the per-note CRDT message protocol on this same
   * connection (see this file's header comment) and unsubscribes/closes every doc this
   * connection had open on disconnect, so no NATS subscription or in-memory Yjs doc outlives
   * its socket.
   */
  private onConnection(ws: WebSocket, workspaceId: number, userId: string, token: string): void {
    const connId = randomUUID(); // tags this connection's own doc/awareness publishes so the
    // relay below can skip echoing them back to the connection that just sent them.
    this.logger.debug(`Realtime WS connected — user=${userId} workspace=${workspaceId}`);

    const unsubscribeChange = this.nats.subscribe(`ws.${workspaceId}.change`, (event) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(event));
    });

    // Per-note doc/awareness NATS subscriptions this connection currently holds — populated
    // by doc-subscribe, torn down by doc-unsubscribe or socket close. Two entries per open
    // note (text updates + awareness), not per workspace, so a workspace with many notes
    // doesn't fan every note's edit stream out to a client that only has one note open.
    const docSubs = new Map<number, { unsubscribeUpdate: () => void; unsubscribeAwareness: () => void }>();

    const send = (msg: NoteDocServerMsg): void => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    };

    const subscribeDoc = async (noteId: number): Promise<void> => {
      if (docSubs.has(noteId)) return; // already subscribed — doc-subscribe is idempotent
      let state: string;
      try {
        state = await this.yjsDocs.open(token, workspaceId, noteId);
      } catch (err) {
        send({ type: "doc-error", noteId, error: (err as Error).message });
        return;
      }
      const unsubscribeUpdate = this.nats.subscribe<DocUpdateWireMsg>(`ws.${workspaceId}.doc.${noteId}.update`, (msg) => {
        if (msg.originId === connId) return; // don't echo a client's own update back to it
        send({ type: "doc-update", noteId, update: msg.update });
      });
      const unsubscribeAwareness = this.nats.subscribe<DocUpdateWireMsg>(`ws.${workspaceId}.doc.${noteId}.awareness`, (msg) => {
        if (msg.originId === connId) return;
        send({ type: "awareness-update", noteId, update: msg.update });
      });
      docSubs.set(noteId, { unsubscribeUpdate, unsubscribeAwareness });
      send({ type: "doc-sync", noteId, state });
    };

    const unsubscribeDoc = (noteId: number): void => {
      const subs = docSubs.get(noteId);
      if (!subs) return;
      subs.unsubscribeUpdate();
      subs.unsubscribeAwareness();
      docSubs.delete(noteId);
      void this.yjsDocs.close(noteId).catch((err) =>
        this.logger.warn(`yjsDocs.close(${noteId}) failed: ${(err as Error).message}`)
      );
    };

    ws.on("message", (raw) => {
      let msg: NoteDocClientMsg;
      try {
        msg = JSON.parse(raw.toString()) as NoteDocClientMsg;
      } catch {
        return; // malformed frame — ignore rather than drop the whole connection over it
      }
      switch (msg.type) {
        case "doc-subscribe":
          void subscribeDoc(msg.noteId);
          break;
        case "doc-unsubscribe":
          unsubscribeDoc(msg.noteId);
          break;
        case "doc-update":
          if (!docSubs.has(msg.noteId)) break; // must doc-subscribe first
          this.yjsDocs.applyUpdate(msg.noteId, msg.update);
          this.nats.publishDocUpdate(workspaceId, msg.noteId, msg.update, connId);
          break;
        case "awareness-update":
          if (!docSubs.has(msg.noteId)) break;
          this.nats.publishAwarenessUpdate(workspaceId, msg.noteId, msg.update, connId);
          break;
      }
    });

    ws.once("close", () => {
      unsubscribeChange();
      for (const noteId of [...docSubs.keys()]) unsubscribeDoc(noteId);
      this.logger.debug(`Realtime WS disconnected — user=${userId} workspace=${workspaceId}`);
    });
  }
}
