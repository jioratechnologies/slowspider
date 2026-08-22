import { Injectable, Logger } from "@nestjs/common";
import type { IncomingMessage, Server as HttpServer } from "http";
import type { Socket } from "net";
import { WebSocket, WebSocketServer } from "ws";
import { SupabaseService } from "../common/services/supabase.service";
import { WorkspaceService } from "../workspace/workspace.service";
import { NatsService } from "../common/services/nats.service";

export const REALTIME_PATH = "/v1/realtime";

// Replaces the browser-connects-directly-to-NATS design from Phase 5 (see
// docs/MIGRATION-PLAN-bff-kong-split.md's Realtime section) — that let anyone holding the
// single shared NATS_AUTH_TOKEN subscribe to ANY workspace's subject, not just ones they're
// a member of. This gateway is the fix: the browser now talks to the backend's own
// authenticated WS endpoint instead of NATS, and the backend is the only thing that ever
// speaks NATS (over its existing trusted server-to-server connection, NatsService).
//
// Deliberately NOT a @WebSocketGateway()-decorated class (that abstraction is built around
// socket.io/message-handler patterns; this endpoint only ever pushes server->client, and
// the one thing that actually matters here — rejecting the connection BEFORE the WS
// handshake completes if auth fails — is much more direct to express with a plain `ws`
// server run in `noServer` mode, wired onto Nest's own underlying HTTP server via the
// 'upgrade' event). See realtime.module.ts / main.ts for how this gets attached.
@Injectable()
export class RealtimeGateway {
  private readonly logger = new Logger(RealtimeGateway.name);
  private wss: WebSocketServer | null = null;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly workspace: WorkspaceService,
    private readonly nats: NatsService
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

    this.wss!.handleUpgrade(req, socket, head, (ws) => this.onConnection(ws, workspaceId, userId));
  }

  /**
   * On a successful handshake, subscribe (over the backend's own trusted NATS connection)
   * to this one workspace's change subject and relay each event to this one browser
   * connection only. Unsubscribe on disconnect so no NATS subscription outlives its socket.
   */
  private onConnection(ws: WebSocket, workspaceId: number, userId: string): void {
    this.logger.debug(`Realtime WS connected — user=${userId} workspace=${workspaceId}`);

    const unsubscribe = this.nats.subscribe(`ws.${workspaceId}.change`, (event) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(event));
    });

    ws.once("close", () => {
      unsubscribe();
      this.logger.debug(`Realtime WS disconnected — user=${userId} workspace=${workspaceId}`);
    });
  }
}
