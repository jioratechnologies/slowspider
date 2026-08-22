# Migration Plan — Split Frontend / Backend / Android behind Kong

## Current state (baseline)

- Next.js monolith (`src/app`) does SSR/web UI **and** owns `/api/v1/*` REST routes.
- `apps/mobile` (Expo/React Native) already calls those same `/api/v1/*` routes directly (`apps/mobile/src/api.ts`), auth via Bearer token + `x-workspace-id` header.
- DB: Postgres via Supabase pooler, Prisma ORM (`prisma/schema.prisma` — AuthUser, User, Workspace, WorkspaceMember, WorkspaceInvite, Category, Cluster, Task, Milestone, Note, UserSettings).
- Redis: Upstash, used today only for OTP storage (`REDIS_URL`).
- File storage: Supabase Storage (S3-compatible under the hood), signed upload URLs issued by `/api/v1/notes/media` (`src/lib/note-media.ts`, `src/lib/services/board.ts`).
- Auth: NextAuth (Auth.js v5) + own `AuthUser`/JWT (`API_JWT_SECRET`) — not full Supabase Auth.

So there is already a clean REST seam (`/api/v1`) — this is a real advantage. The migration is "extract that seam into its own service," not "invent an API from scratch."

**Decision (recorded, not yet acted on): Android goes Flutter, not React Native.** `apps/mobile` (Expo/RN) stays in the repo untouched for now — no code changes from this decision yet, revisit when ready to actually start the Flutter app (either replace `apps/mobile` or add a new `apps/android` alongside it, TBD at that time). Doesn't affect anything else in this plan: the backend is a plain REST/JSON API behind Kong, client-agnostic — a Flutter client calls the exact same `/v1/**` endpoints the RN app and web app do. iOS timeline/framework is a separate open question (see below).

## Target architecture

```
                        ┌─────────────┐
        Android app ───▶│             │
        (future) iOS ──▶│  Kong (API  │───▶  Backend (NestJS, Node/TS)
                        │  Gateway)   │      - all business logic       ──▶ publishes events
        Web (Next.js) ─▶│             │      - talks to Postgres, Redis, S3      │
        BFF calls   ───▶│             │      - authenticated WS relay ◀──────────┘
                        └─────────────┘        (GET /v1/realtime)  │
                              ▲                                    │ server-to-server only
     Web / Android ── WS through Kong ───────────────────────────▶┘         ▼
     (live updates; auth = same Supabase token + workspace-membership  NATS (internal only,
      check every REST call already goes through)                     not exposed to host)
                                                                    (+ JetStream for durability)

                 shared: Postgres (Supabase) · Redis (Upstash) · S3 (Supabase Storage)
```

- **Backend (NestJS)** — single source of truth for business logic. Owns Prisma client, Redis client, storage client. Exposes REST (keep `/v1` versioning). This is what `/api/v1/*` route handlers become, moved out of Next.js. On every mutation, also publishes a domain event to NATS (see Realtime section). Also the *only* thing that ever speaks to NATS — it terminates the browser's realtime WebSocket connection itself and relays events through, rather than letting browsers reach NATS directly (see Realtime section for why that changed from the original plan).
- **Web (Next.js)** — becomes a thin BFF + SSR/UI layer. Either:
  - (a) calls backend through Kong like every other client, or
  - (b) keeps a couple of Next-only concerns (cookie session, SSR data fetching) as a real BFF that itself calls the backend.
  Given the app already uses Bearer-token auth end-to-end (not cookie sessions calling internal routes), **(a) is simpler** — Next.js stops hosting `/api/v1/*` entirely and just becomes a client of Kong, same as mobile.
- **Android (apps/mobile is Expo/RN, i.e. Android+iOS today)** — offline-first (see Offline section), plus live-update subscriber when online.
- **Kong** — entry point for **all** client traffic, request/response *and* realtime WebSocket alike. Owns: routing to backend service, rate limiting, CORS, JWT/key-auth verification, request logging. The realtime WS endpoint (`GET /v1/realtime`) is proxied through Kong too, same as every other client-facing route — see the realtime-auth-fix writeup at the end of Phase 5 for why this replaced the original "NATS WS bypasses Kong" plan.
- **NATS** — realtime backbone, internal only. Domain-event fanout (task/cluster/note/workspace changes) for live multi-device sync, plus (if CRDT is ever built) update/awareness subjects for co-edited text fields. JetStream gives durable replay so a client that reconnects after a drop catches up instead of missing updates. No longer reachable from outside the Docker network — only `apps/backend` connects to it, both to publish (`NatsService`) and, per browser WS connection, to subscribe on that client's behalf (`RealtimeGateway`).
- **Shared infra** — same Postgres, same Redis, same storage bucket. No data migration needed, only connection-string plumbing into the new backend service.
- **Polyglot-ready**: Kong and NATS are both language-agnostic. A future Python service (e.g. for ML/parsing work) is just another Kong upstream and/or NATS publisher/subscriber — no change to this shape needed when that day comes.

## Repo layout (monorepo)

```
apps/
  web/        # Next.js app — UI + SSR only (Phase 3, done). Server Actions call apps/backend
              # through Kong via src/lib/backend-client.ts; no local Prisma/service layer left.
  backend/    # NestJS service — owns /v1 API, Prisma, Redis, storage
  mobile/     # existing Expo app — src/api.ts points at Kong (:8000), /v1/** paths (Phase 4/3)
packages/
  shared-types/   # DTOs / API contracts shared by web + backend + mobile ✅ wired up (see
                  # note below) — the canonical Task/Cluster/Category/Note/Milestone/
                  # Workspace/BoardPayload/etc types now live here; all three apps import
                  # from @slowspider/shared-types (via a thin re-export barrel at each app's
                  # old import path) instead of hand-copying their own interfaces.
  db/             # optional: Prisma schema + generated client as its own package
  realtime/       # not built as a separate package — NatsService, the RealtimeGateway WS
                  # relay, and now YjsDocService (CRDT co-editing) all live directly in
                  # apps/backend/src/{common,realtime}/, and useRealtimeBoard.ts /
                  # use-collab-note-text.ts directly in apps/web; nothing shared with
                  # apps/mobile yet (out of scope — web-only for now). Would still make sense
                  # once a mobile realtime/CRDT client is actually built.
infra/
  kong/       # kong.yml (declarative config) or deck.yml — routes both REST and the /v1/realtime WS upgrade
  nats/       # nats.conf — JetStream store dir, internal-only (no websocket listener anymore, see Realtime section)
```

`src/app/api/v1/**` route handlers were moved to `apps/backend/src/**` NestJS modules, one module per resource (auth, board, categories, clusters, notes, tasks, workspace, cron) in Phase 1, then deleted from `apps/web` in Phase 3 once Server Actions were cut over to call the backend instead. `src/lib/services/*` and `prisma/` were likewise ported to `apps/backend` in Phase 1 and deleted from `apps/web` in Phase 3. `src/lib/note-media.ts` stayed in `apps/web` — it's pure client-side browser-to-Supabase-Storage code, never part of the in-process data layer being moved. `packages/shared-types` was never built out in this phase — `apps/web`, `apps/backend`, and `apps/mobile` each still defined their own copies of the response/DTO shapes (e.g. `BoardPayload`, `RemoteTask`, `RemoteCluster`) — ✅ **done** in the shared-types follow-up below, after Phase 5.

## Realtime & collaboration (NATS + CRDT)

Two distinct kinds of "realtime" here — keep them separate, don't over-build the second where the first suffices:

**1. Whole-record live sync** (task moved, cluster renamed, note added, workspace membership changed) — the common case for most of the app.
- Backend publishes to a subject namespaced per workspace after every successful mutation, e.g. `ws.<workspaceId>.task.updated`, `ws.<workspaceId>.cluster.created`.
- Clients (web + mobile, when online) receive their active workspace's events and apply the payload directly or trigger a targeted refetch. No CRDT needed for this path — it's broadcast + last-write-wins, which is what's already implied by the existing REST semantics.
- **Transport, as actually built**: clients do *not* subscribe to NATS directly. `apps/backend` exposes `GET /v1/realtime?token=<supabase_access_token>&workspaceId=<id>` — a WebSocket endpoint that verifies the token and workspace membership at connect time, then internally subscribes to that one `ws.<workspaceId>.change` NATS subject (over the backend's own trusted connection) and relays events to that one client connection only. NATS stays the fan-out backbone between backend instances/workers; it's just no longer exposed to anything outside the Docker network. See the realtime-auth-fix writeup at the end of Phase 5 below for the full design and why the original "clients subscribe to NATS directly" plan was replaced.

**2. True concurrent co-editing** (two people typing in the same note body / task title at once) — needs CRDT. ✅ done (`Note.body`, kind `text`/`rich` only — see the CRDT co-editing writeup at the end of Phase 5 below for what was actually built, transport choice, persistence encoding, and verification, including a concrete two-editor convergence test).

**Auth on the realtime path**: scope per workspace so a client can only receive events for
workspaces they're a member of. **Resolved** (see the realtime-auth-fix writeup at the end
of Phase 5 below) — not via NATS's own decentralized JWT auth as originally scoped here, but
by removing the browser's direct connection to NATS entirely and relaying through the
backend's own authenticated WebSocket endpoint instead, reusing the exact Supabase-token +
workspace-membership check every REST call already goes through
(`SupabaseAuthGuard`/`WorkspaceService.isMember`). NATS itself is no longer reachable from
outside the Docker network — only `apps/backend` ever speaks to it now.

**Ops note**: NATS (with JetStream) is a single self-contained binary — much lighter to run/monitor solo than a hand-rolled WebSocket/OT server would be, but it *is* one more stateful service to deploy and back up (JetStream stores data on disk). Budget for that in the deploy story (Phase 5 below).

## Offline-first Android

- Local SQLite mirror of the workspace's board data (tasks, clusters, categories, notes) via `expo-sqlite` or `op-sqlite` — same shape as `BoardPayload` already returned by `/api/v1/board`.
- Mutations made offline are appended to a local outbox table (mutation type + payload + client timestamp) and applied optimistically to the local SQLite copy immediately, so the UI never blocks on network.
- On reconnect, outbox drains against the backend REST API (through Kong) in order; each record carries `updated_at` so the backend can apply last-write-wins per record and return the authoritative version, which overwrites the local optimistic copy.
- When online, the app also subscribes to the NATS live-sync subjects (above) so it gets push updates instead of polling — offline capability and realtime capability share the same pull-on-reconnect fallback path, so a missed NATS message while briefly disconnected is self-healed by the next full sync rather than needing special-cased gap detection.
- CRDT fields (Note.body, etc.) are the one place last-write-wins doesn't apply — the local Yjs doc's pending updates queue in the outbox the same way and merge automatically (that's the point of CRDTs: offline edits merge without conflict) once reconnected.

## Infra target: remote-managed now, own VPS later

No production DB/bucket of your own today, so Supabase (Postgres + Storage) and Upstash (Redis) stay as-is for now — remote managed services, not self-hosted. Plan is to move to a self-owned VPS (own Postgres, own S3-compatible bucket e.g. MinIO, own Redis) once that's stood up. Design so that move is a config swap, not a rewrite:

| Piece | Today | Portability status |
|---|---|---|
| DB | Supabase Postgres, accessed via Prisma | **Already portable** — Prisma talks standard Postgres wire protocol. Moving to VPS Postgres later = change `DATABASE_URL`/`DIRECT_URL`, `pg_dump`/restore the data. No code change. |
| Redis | Upstash, via `ioredis`/`REDIS_URL` | **Already portable** — generic Redis protocol client. VPS-hosted Redis later = change `REDIS_URL` only. |
| Auth | NextAuth + own `AuthUser` table/JWT | **Already portable** — not on Supabase Auth, no lock-in here. |
| Storage | Supabase Storage, via `@supabase/supabase-js` storage client directly in `note-media.ts`/`board.ts` | **Not portable yet** — calls the Supabase SDK directly. |
| Realtime | ~~Supabase Realtime, via client-side `createClient()` in `useRealtimeBoard.ts`~~ Replaced in Phase 5 — `useRealtimeBoard.ts` connects to `apps/backend`'s own authenticated `GET /v1/realtime` WS endpoint (through Kong), which relays events off a self-hosted, internal-only NATS server. Session bits in `src/app/page.tsx` are unrelated (a different Supabase client, still in use — see Auth section). | **Portable already** — self-hosted NATS behind the backend's own endpoint, no managed-provider lock-in, and no client (web or future mobile) needs to know NATS exists at all. |

Action for Phase 1 (backend extraction): wrap storage behind a small internal interface in the backend — `getUploadUrl()`, `getFileUrl()`, `deleteFile()` — implemented against Supabase Storage today. MinIO and most self-hosted object stores speak the S3 API, so swapping the implementation later (point the S3-compatible client at the VPS's MinIO endpoint) doesn't touch any caller. This is a small amount of extra structure now that avoids a rewrite later — don't skip it just because "Supabase Storage works fine today."

No urgency to build the VPS path now — just don't hardcode Supabase-specific behavior into callers while doing the Phase 1 extraction, since that's the one piece here that isn't already swap-safe.

## Auth across the gateway

Correction from earlier draft: this app authenticates via **Supabase Auth**, not NextAuth (`AUTH_SECRET`/`API_JWT_SECRET` in `.env.local` are unused leftovers). `apps/web/src/lib/api/handler.ts`'s `withApiAuth` verifies the Bearer token via `supabase.auth.getUser(token)` — mobile stores the Supabase session tokens it gets back from `/v1/auth/login`. `apps/backend`'s `SupabaseAuthGuard` ports this exact logic.

Two options for where the token gets verified:
1. **Kong verifies** (Kong's own `jwt` plugin can't validate opaque Supabase tokens directly, but Supabase does expose a JWKS endpoint for its JWT-format access tokens — would need Kong's `jwt` or `openid-connect` plugin configured against it) — less load on backend, more Kong config to maintain.
2. **Backend verifies** (as it does today), Kong just routes — simpler, zero auth-logic changes.

Went with (2) for Phase 2 — Kong is a pure router/CORS/rate-limit layer right now, backend still does the real `auth.getUser()` call. Revisit moving verification into Kong only if backend auth load actually becomes a bottleneck.

## Phased plan

**Phase 0 — prep, no behavior change**
- Extract `packages/shared-types` from the interfaces already duplicated in `src/lib/api` and `apps/mobile/src/api.ts`.
- Confirm which Redis/S3/DB env vars the new backend needs (all already exist in `.env.local`: `DATABASE_URL`, `DIRECT_URL`, `REDIS_URL`, Supabase storage keys).

**Phase 1 — stand up `apps/backend` alongside the monolith** ✅ done
- Monorepo scaffolded (npm workspaces: `apps/web`, `apps/backend`, `packages/shared-types`; `apps/mobile` deliberately left out of the workspace array — Expo/Metro doesn't play well with hoisted workspace `node_modules`).
- `apps/backend` is a hand-scaffolded NestJS app (no network-dependent `nest new`) — all 29 `/v1/*` routes + the cron route ported 1:1, same `{ok,data}`/`{ok,error}` envelope, same `SupabaseAuthGuard` logic, `StorageService` wrapping Supabase Storage per the portability section above.
- `apps/web` kept its own copies of `prisma/`, `src/lib/services/*`, etc. — untouched, still does the real work. Verified both apps build/boot; backend curl-tested live against real Supabase/Postgres/Redis (401 unauthenticated, real "wrong password" from an actual `auth.getUser`/credential check — confirms live DB/Supabase connectivity, not just a clean boot).

**Phase 2 — Kong in front of backend** ✅ done
- `infra/kong/kong.yml` — DB-less declarative config (no separate Kong Postgres to run/back up — single container, single YAML file, lowest-ops option for a solo maintainer). One service → `backend:3001`, routes for `/v1/*` and `/cron/*`, CORS + a generous `rate-limiting` plugin (300/min, local policy) as a basic gateway-level guard on top of the app's own Redis-based login rate limit.
- `docker-compose.yml` at repo root runs `backend` (built from `apps/backend/Dockerfile`, multi-stage Node 22) + `kong` (image `kong:3.9`), Kong's proxy on `:8000`, admin API bound to `127.0.0.1:8001` only. `docker compose up -d --build` — verified live: `curl http://localhost:8000/v1/board` → `401 Not signed in.`, `curl -X POST http://localhost:8000/v1/auth/login` with bad creds → real `400 Wrong email or password.` from Supabase, proving the whole path (Kong → backend → Supabase) works end to end.
- `apps/mobile` pointed at Kong (`EXPO_PUBLIC_API_URL` default + `/v1/**` paths, dropping the `/api` prefix) alongside Phase 3 — see Phase 3 below. Not yet done: an actual dev/staging build parity check running the Expo app against it (out of scope for the sandboxed environment Phase 3 was done in — no mobile toolchain available there).

**Phase 3 — cut Next.js over** ✅ done
- Added `apps/web/src/lib/backend-client.ts` — a small `fetch` wrapper around `GATEWAY_URL` (default `http://localhost:8000`) that mirrors `apps/mobile/src/api.ts`'s `request()`: bearer token + `x-workspace-id` header for authenticated calls, no auth for login/signup/reset, parses the same `{ok,data}`/`{ok,error}` envelope and throws on `ok:false`. Token comes from the same SSR cookie session `src/lib/supabase/server.ts` already manages (`supabase.auth.getSession()`).
- Rewired every Server Action in `auth-actions.ts`, `board-actions.ts`, `workspace-actions.ts`, and `src/app/page.tsx` (the SSR board load) to call `apps/backend`'s `/v1/**` routes through `backend-client.ts` instead of the in-process `src/lib/services/*`. Login/signup/reset no longer do their own local Redis rate-limit check — the backend's `AuthController` already enforces the identical Redis-keyed limit, so the local pre-check was dropped as redundant rather than kept as a duplicate. `completeSignup` no longer calls `createDefaultWorkspace` separately either — the backend's `/v1/auth/signup/complete` already does that server-side.
- `apps/backend`'s `WorkspaceService.listPendingInvitesForEmail` / `declineInvite` existed since Phase 1 but, per their own comments, were never wired to a route. Added `GET /v1/workspace/my-invites` and `POST /v1/workspace/my-invites/:id/decline` to `WorkspaceController` to close that gap, since `workspace-actions.ts`'s `listMyPendingInvites`/`declineMyInvite` needed them.
- `src/lib/note-media.ts` was **kept**, not deleted — despite being named for deletion in the original plan, it's pure client-side code (browser → Supabase Storage directly via the browser's own session, no Next.js server hop, no Prisma/service-layer involvement) and is still used by `TaskAttachmentsSection.tsx`, `NoteMedia.tsx`, `NotesPanel.tsx`, and `Board.tsx`. Deleting it would have broken working upload UI for no reason — it was never part of the in-process data layer this phase removes.
- Deleted `src/app/api/v1/**`, `src/app/api/cron/**`, `src/lib/services/*`, `src/lib/api/handler.ts`, `src/lib/rate-limit.ts`, `src/lib/db.ts`, `src/lib/redis.ts`, `src/lib/queries.ts` (superseded by `GET /v1/board`, which already does the same purge-bin + board-data + sort-mode fetch server-side), `src/lib/email.ts` + `src/lib/otp.ts` (only ever used by the now-deleted `services/account.ts`/`services/workspace.ts`), `apps/web/prisma/`, `apps/web/prisma.config.ts`, and `apps/web/scripts/` (one-off Prisma migration/fix scripts, already broken by the `db.ts` deletion).
- `apps/mobile/src/api.ts`'s `BASE` default changed from `http://localhost:3000` to `http://localhost:8000` (Kong) and every route path dropped the `/api` prefix (`/api/v1/board` → `/v1/board`, etc.) — the backend and Kong serve `/v1/**`, not `/api/v1/**`. Not run/tested — no mobile toolchain in this environment, per scope.
- Removed `@prisma/client`, `prisma`, `ioredis`, `resend`, `dotenv` from `apps/web/package.json` (verified each had zero remaining references first) and the now-meaningless `db:*` scripts; kept `server-only` (still used by `backend-client.ts` and `supabase/server.ts`). Ran `npm install` at the workspace root to update the lockfile — `apps/backend` still depends on all of those, so they remain hoisted, just no longer as `apps/web`'s own dependencies.
- Verified live: `apps/web` (`next build`) and `apps/backend` (`nest build`) both build clean, `tsc --noEmit` clean on both, `eslint` clean on every changed file. Built and ran the worktree's own `apps/backend` image standalone against real Supabase (`GET /v1/board` unauthenticated → real `401 Not signed in.`; bad-password login → real `400 Wrong email or password.` from `auth.getUser`/`signInWithPassword`; the two new `my-invites` routes correctly reach `SupabaseAuthGuard` — `401`/`Invalid or expired token.` for a bogus bearer, not a 404), then repeated the same checks through the worktree's actual `docker compose up` Kong container on `:8000` — full `Kong → backend → Supabase` chain live. Started `apps/web`'s real `next dev` server and confirmed `GET /` renders the real `SignIn` page (200) — proving the rewritten `page.tsx` executes cleanly end-to-end for the unauthenticated path. Could not exercise a *successful* authenticated login/board/mutation flow — no browser in this environment and no test-account credentials available (`credentials.txt` was removed from git in Phase 2 and no other test credentials exist in this worktree) — so the happy-path login → session → board fetch → mutation chain is verified by code-level trace against the live-tested backend endpoints, not by an actual successful login.

**Phase 4 — cleanup**
- ~~Remove Prisma/Redis/storage deps from `apps/web`'s `package.json`~~ done as part of Phase 3 above.
- Point production mobile build at Kong's production URL (local dev default done in Phase 3 — this is the prod/staging URL specifically).
- Decide whether to move JWT verification into Kong (see Auth section).

**Phase 5 — realtime, whole-record live sync only** ✅ done (CRDT/Yjs half of this section — true concurrent co-editing — deliberately not attempted; see below)
- `infra/nats/nats.conf` — single self-hosted `nats:2-alpine` container, same "lowest ops for
  a solo maintainer" shape as `infra/kong/kong.yml`: one binary, one config file, no
  clustering, no separate admin DB. JetStream enabled (`store_dir` on a named Docker volume,
  `nats-data`, so a container restart doesn't lose replay history) and a `websocket` listener
  (`no_tls: true` — local dev only) for direct browser connections, since NATS traffic
  bypasses Kong the same way Supabase Realtime always did. `docker-compose.yml` runs it as a
  `nats` service alongside `backend`/`kong`, exposing `4222` (client protocol, for
  debugging/scripts), `8080` (websocket — what `apps/web` actually connects to), and `8222`
  (HTTP monitoring) to the host.
  - **Auth — known, deliberately-accepted simplification at the time.** `infra/nats/nats.conf`
    gated the whole socket with a single shared bearer token (`authorization { token:
    $NATS_AUTH_TOKEN }`, sourced from `apps/backend/.env` for both the `nats` and `backend`
    docker-compose services). This was **not** the per-workspace "NATS decentralized JWT
    auth" originally scoped at the top of this Realtime section — it stopped the socket being
    wide open to the internet, but anyone holding the token could subscribe to *any*
    workspace's `ws.<id>.change` subject, not just ones they're a member of. Flagged
    prominently rather than papered over at the time, and **closed in the realtime-auth-fix
    follow-up below** — not by building NATS's own per-connection authorization, but by
    removing the browser's direct connection to NATS entirely.
  - One nats.conf gotcha worth recording: `token: "$NATS_AUTH_TOKEN"` (quoted) does **not**
    get environment-variable-substituted by nats-server — it's taken as the literal string
    `$NATS_AUTH_TOKEN`. Unquoted (`token: $NATS_AUTH_TOKEN`) is required for substitution to
    work. Cost some time to track down via nats-server's own `[ERR] ... authentication error`
    log line.
- `apps/backend`: added the `nats` npm package and `NatsService`
  (`src/common/services/nats.service.ts`, registered in `CommonModule` alongside
  `RedisService`/`SupabaseService`, same pattern). Connects once on startup (`NATS_URL` +
  `NATS_AUTH_TOKEN`, both added to `.env.example`) and logs clearly whether that succeeded —
  a publish is fire-and-forget from the caller's side (NATS being down must never fail a
  mutation), so this startup log is the signal for "is live sync actually wired up," not
  anything a request will surface. Exposes one method, `publishChange(workspaceId, table,
  type, row)`, publishing JSON `{table, type, row}` to `ws.<workspaceId>.change`.
  - Wired into every INSERT/UPDATE/DELETE in `board.service.ts` (tasks, milestones, clusters,
    categories — including the `batchUpdatePos` reorder path, which fires one event per
    affected row to match what Postgres Realtime used to do per-row regardless of how the
    write was issued) and `notes.controller.ts`'s note create/update/delete (also served by
    `board.service.ts`, per the existing `insertNote`/`updateNote`/`deleteNote` there). Also
    wired into the cron sweep (`runDailyColdStorageCron` — auto-archive and bin-purge), since
    it mutates the same tables across every workspace and would have fired Realtime events
    too under the old system.
  - `update*`/`delete*` methods that used to return `void` now chain `.select()` onto the
    same Supabase call (PostgREST's `Prefer: return=representation`) to get the affected row
    back for the event payload — not an extra round trip, just a wider response on the same
    query. `updateMilestone`/`deleteMilestone` gained a `workspaceId` parameter (threaded from
    `ctx.workspaceId` in `tasks.controller.ts`, which already had it) since the event subject
    needs it and the original signatures didn't carry it.
- `apps/web`: added `nats.ws` and rewrote `useRealtimeBoard.ts` to connect to
  `NEXT_PUBLIC_NATS_WS_URL` (default `ws://localhost:8080`) with `NEXT_PUBLIC_NATS_AUTH_TOKEN`
  (necessarily public — see the auth caveat above), subscribe to `ws.<workspaceId>.change`,
  and dispatch each `{table, type, row}` message to the matching `on*Change` handler. Same
  `RealtimeBoardHandlers` interface, same handler bodies, same call site in `Board.tsx` —
  zero changes needed there, exactly as scoped. The old `createClient()`/`postgres_changes`
  Supabase Realtime path is fully removed from this file; `apps/web/src/lib/supabase/client.ts`
  itself was **not** touched or removed — it's still used by `note-media.ts` for direct
  browser-to-Storage uploads, and `supabase/server.ts` is still used for the SSR auth session
  (a separate Supabase client instantiation from the one this hook used to use).
  **Superseded by the realtime-auth-fix follow-up below**: `nats.ws` was removed again,
  `useRealtimeBoard.ts` no longer imports it or talks to NATS directly, and neither
  `NEXT_PUBLIC_NATS_WS_URL` nor `NEXT_PUBLIC_NATS_AUTH_TOKEN` exist anywhere in the app
  anymore.
- Verified live end-to-end, not just code review (a mismatched subject name or payload shape
  would otherwise fail silently at the frontend with no build-time error): `docker compose up
  -d --build` against real Supabase/Postgres/Redis; `nats` container logs confirm JetStream +
  websocket both started cleanly; `apps/backend` logs `[NatsService] Connected to NATS at
  nats://nats:4222` on boot (not retrying/erroring); `apps/backend` (`nest build`) and
  `apps/web` (`next build` + `tsc --noEmit`) both build clean. Created a throwaway test
  account through the live stack (`POST /v1/auth/signup/{otp,verify,complete}` through Kong,
  `AUTH_MODE=dev` so the OTP is `123456`, no email needed) to get a real bearer token and
  workspace id, then drove a throwaway Node script (the `nats` package) subscribed to
  `ws.<id>.change` while issuing real mutations through Kong (`POST/PATCH/DELETE
  /v1/{tasks,clusters,categories,notes,tasks/:id/milestones}`, plus `/v1/clusters/reorder`)
  with `curl`/PowerShell. Confirmed every table × change-type combination arrives with the
  exact `{table, type, row}` shape `useRealtimeBoard.ts` expects: tasks INSERT/UPDATE/DELETE,
  clusters INSERT/UPDATE/DELETE (including a `batchUpdatePos` reorder producing a
  per-row UPDATE event), categories INSERT/DELETE, milestones INSERT/UPDATE/DELETE, notes
  INSERT/UPDATE/DELETE. Test board rows and the throwaway auth account were left in place /
  cleaned up (test rows deleted; the throwaway `@example.com` test auth account was left,
  harmless) — no production or real user data touched. `docker compose down` afterward.
  Not verified: an actual browser (`apps/web`'s `next dev`) round-tripping a live event into
  rendered UI — no browser available in this environment; the hook's connect/subscribe logic
  was verified via `tsc --noEmit`/`next build` type-checking against the real `nats.ws`
  types and via the equivalent Node-side (`nats` package) test above, which exercises the
  identical wire protocol and payload shape, but not React state updates in an actual page.

**Phase 5 follow-up — realtime auth fix (browser no longer talks to NATS directly)** ✅ done

Closes the gap flagged above: a single shared `NATS_AUTH_TOKEN`, necessarily shipped to every
browser (`NEXT_PUBLIC_`-prefixed), let anyone holding it subscribe to *any* workspace's
`ws.<id>.change` subject. Rather than building NATS's own per-connection authorization
(NKeys, JWT auth callout — real cryptographic machinery to learn and maintain solo), the fix
reuses the auth the backend already has for every REST call
(`SupabaseAuthGuard`/`WorkspaceService`): the browser now talks to the backend's own
authenticated WebSocket endpoint, and only the backend ever talks to NATS.

- **`apps/backend/src/realtime/realtime.gateway.ts`** (new) — `RealtimeGateway`, a plain
  `Injectable` (not a `@WebSocketGateway()`-decorated class). Deliberately built on the raw
  `ws` package (`ws: ^8.18.0` added to `apps/backend/package.json`, `@types/ws` as a
  dev dep) run in `noServer` mode, wired onto Nest's own underlying HTTP server via its
  `'upgrade'` event (`attach(httpServer)`, called once from `apps/backend/src/main.ts` —
  `app.get(RealtimeGateway).attach(app.getHttpServer())` — right after `NestFactory.create()`
  and before `app.listen()`). Considered `@nestjs/websockets` + `@nestjs/platform-ws` (the
  officially-supported route for a plain-`ws` Nest gateway) but went with a hand-wired
  `noServer` server instead: the one thing that actually matters here — rejecting the
  connection **before** the WS handshake completes if auth fails, with a real HTTP status
  (401/400/403/404), not accepting the handshake and closing a moment later — is far more
  direct to express against Node's `'upgrade'` event than through the gateway abstraction
  (which is built around socket.io/message-handler patterns this endpoint doesn't use; it
  only ever pushes server→client). No new Nest package needed as a result.
  - **Handshake** (`handleUpgrade`): parses `?token=<supabase_access_token>&workspaceId=<id>`
    from the upgrade request's URL (browsers' native `WebSocket` API can't set custom
    headers, so these travel as query params — a common, accepted pattern for WS auth, same
    tradeoff cookie-based session auth makes implicitly). Missing token → `401`. Missing/non-
    integer `workspaceId` → `400`. Token verified via `supabase.anon().auth.getUser(token)` —
    the exact call `SupabaseAuthGuard.canActivate()` makes for every REST request — failure
    or error → `401`. Resulting user then checked against the requested workspace via a new
    **`WorkspaceService.isMember(workspaceId, userId)`** (extracted from the existing private
    `requireMember()`, which now just calls it and throws — reused, not reimplemented, per
    the brief) → not a member → `403`. Any non-matching path → `404`. Only once every check
    passes does `wss.handleUpgrade()` run and the socket start receiving events.
  - **Relay**: on a successful connection, subscribes (over the backend's own trusted
    server-to-server NATS connection) to that one workspace's `ws.<workspaceId>.change`
    subject and forwards each `{table, type, row}` message to that one browser connection
    only; unsubscribes on socket close. This uses a new **`NatsService.subscribe(subject,
    handler)`** method (`apps/backend/src/common/services/nats.service.ts`) returning an
    unsubscribe function — the publish side (`publishChange`, wired into
    `board.service.ts`/`notes.controller.ts` since Phase 5 above) is unchanged.
  - **`apps/backend/src/realtime/realtime.module.ts`** (new) — imports `WorkspaceModule` for
    `WorkspaceService`; `SupabaseService`/`NatsService` come from the already-`@Global()`
    `CommonModule`. Registered in `app.module.ts`'s `imports`.
- **`apps/web/src/hooks/useRealtimeBoard.ts`** — rewritten to use the browser's native
  `WebSocket` API against the backend's `GET /v1/realtime` endpoint instead of `nats.ws`
  against NATS directly. Same `RealtimeBoardHandlers` interface, same table-name→handler
  routing, same call site in `Board.tsx` — nothing there changed, exactly as scoped. Gets the
  Supabase access token from the *browser* client's own session
  (`apps/web/src/lib/supabase/client.ts`'s `createClient()`, `supabase.auth.getSession()`) —
  this hook is `"use client"` and can't use `backend-client.ts`'s server-only
  `getAccessToken()` (that reads the SSR cookie session via a different, server-side Supabase
  client). Reconnects on close with a fixed 2s delay, since a raw `WebSocket` has no built-in
  reconnect the way `nats.ws`'s `connect()` did — without this, a network blip would leave
  live sync silently dead until the next full page load, a regression from the old behavior.
  `nats.ws` removed from `apps/web/package.json` (no longer used anywhere in the app).
- **`infra/nats/nats.conf`** — removed the `websocket {}` listener entirely; browsers never
  connect to NATS now. Kept the `authorization { token: $NATS_AUTH_TOKEN }` block as
  defense-in-depth even though it's no longer the security boundary (see the file's own
  updated comments) — cheap to keep, and the socket is fully internal now regardless.
- **`docker-compose.yml`** — the `nats` service no longer publishes `4222` (client protocol)
  or `8080` (websocket) to the host at all; nothing outside the Docker network can reach NATS.
  Kept `8222` (HTTP monitoring) bound to `127.0.0.1` only, same pattern as Kong's admin API,
  for local ops visibility.
- **`infra/kong/kong.yml`** — tried Kong first, as scoped, and it worked with one real piece
  of friction: added a `backend-realtime` route (`paths: [/v1/realtime]`, more specific than
  the existing `/v1` route, so Kong's router picks it for this path) with **no** `cors` or
  `rate-limiting` plugins (browsers don't send a CORS preflight for `wss://` connections in
  the first place, and the rate-limiting policy is tuned for bursty REST calls, not one
  long-lived connection — the connect-time auth check is the real guard here) — moved the
  existing `cors`/`rate-limiting` plugins from service-level onto the two REST routes
  explicitly so they don't also apply here. **The friction**: Kong/nginx's default
  `read_timeout`/`write_timeout` (60s) would otherwise silently kill an idle WebSocket
  connection — no bytes flowing between change events doesn't mean the connection is dead —
  and force a reconnect loop every minute. Fixed by raising both to `3600000` (1 hour) at the
  `backend` service level; harmless for the REST routes too, since a slow REST call should
  time out for its own reasons long before that. No other Kong-specific websocket plugin was
  needed — Kong's core proxy forwards the `Upgrade`/`Connection` headers transparently for
  ordinary `http`/`https`-protocol routes.

**Verified, with one real gap — see below.** `docker compose config`/`up -d --build` initially
failed outright: `apps/backend/.env` does not exist in this worktree (confirmed via direct
`ls`; no real Supabase/Postgres/Redis/Resend credentials are available anywhere in this
worktree — checked `credentials.txt` at the repo root, which prior phases record as removed
from git in Phase 2, and it is in fact absent here too). Per this task's own instruction to
STOP and report rather than fabricate a result, the full real-account signup → bearer token →
workspace id → live-mutation-over-WS flow (this phase's own verification standard, matching
every prior phase's discipline) **was not run** and cannot be claimed as verified.

What *was* verified, using a clearly-labeled, non-functional placeholder `apps/backend/.env`
(fake Supabase URL/keys, gitignored, deleted again after testing — created solely to satisfy
`docker compose`'s required `env_file:` and let the containers boot for infra-wiring checks):
- `apps/backend` (`nest build`) and `apps/web` (`next build` + `tsc --noEmit`) both build
  clean after the changes above (this part needed no credentials at all).
- `docker compose up -d --build` — all three containers (`nats`, `backend`, `kong`) built and
  started clean. `nats` logs show JetStream + client listener starting with **no**
  `websocket` listener line (confirms the removed listener actually took effect, not just in
  the config file). `backend` logs `[NatsService] Connected to NATS at nats://nats:4222` and
  `Nest application successfully started` — the new `RealtimeModule`/`RealtimeGateway` wiring
  doesn't break boot. `kong` reports healthy.
- **The actual security-fix negative path — real Kong→backend network round trips**, via a
  throwaway Node `ws`-package script hitting `ws://localhost:8000/v1/realtime` (Kong's public
  proxy port):
  - No `token`, no `workspaceId` → HTTP `401` before the handshake completed.
  - No `token`, `workspaceId=1` → HTTP `401`.
  - `token=not-a-real-token`, `workspaceId=1` → HTTP `401` (the `auth.getUser()` call against
    the placeholder Supabase URL fails — as it must with no real Supabase reachable — and
    that failure is treated as an auth failure, i.e. the code fails closed rather than open).
  - `token` set, no `workspaceId` → HTTP `400`.
  - A request to `/v1/realtime` with a mismatched path → HTTP `404` — caught one real rough
    edge in the first pass of this testing (a non-matching-path upgrade fell through with no
    response at all and hung until the client gave up), fixed by rejecting it explicitly
    (`realtime.gateway.ts`'s `handleUpgrade`) rather than leaving the socket open with nothing
    ever writing to it.
  - None of the five cases ever reached `WebSocket`'s `open` event — every rejection happened
    before the handshake completed, confirmed by listening for `'unexpected-response'`
    (fires only pre-handshake, with the real HTTP status) rather than `'close'`.
  - This proves Kong correctly proxies the WS upgrade to the backend, and that the
    fail-closed connect-time auth gate works over the real network path (missing/invalid
    token, missing workspace, wrong path — all rejected). **What this does *not* prove**: the
    specific "valid token, but for a workspace the user isn't a member of" case from this
    task's step 4, or the full happy-path event relay from step 3 — both need a real
    Supabase-issued access token and a real `workspace_members` row, which this environment
    doesn't have. That gap is structural (missing credentials), not a gap in the
    implementation's logic — `isMember()` is the exact same query `requireMember()` already
    relies on for every REST call that needs it (`listMembers`, `removeMember`, etc.).
  - `docker compose down` afterward; the placeholder `.env` was deleted, not committed
    (gitignored regardless).
- **Not verified** (same class of gap as Phase 5's own "not verified" note above): an actual
  browser round-tripping a live event into rendered UI, and the real end-to-end
  signup-to-mutation-to-WS-delivery flow this task's own verification section asks for. Both
  need a real Supabase project's credentials in `apps/backend/.env`, supplied by whoever runs
  this next — the code paths involved (`RealtimeGateway`'s auth checks, `useRealtimeBoard.ts`'s
  connect logic) are otherwise identical to the ones exercised above, just with a working
  Supabase project standing behind `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` instead of a
  placeholder domain.

**Not built in this phase (explicitly out of scope): CRDT/Yjs co-editing.** The second half
of the Realtime section above — Yjs docs, per-document NATS subjects, awareness, periodic
snapshot persistence — was not touched. No Yjs dependency was added anywhere. Whole-record
live sync (this phase) already covers most of the app (task moved, cluster renamed, note
added/edited/deleted, etc. all broadcast and land as last-write-wins); true concurrent
co-editing of a single field by two people at once remains a distinct follow-up phase.
Built in the follow-up below.

**Phase 5 follow-up — CRDT co-editing of `Note.body` (Yjs)** ✅ done (text sync + persistence;
awareness/presence skipped — see below)

Scope, per the field-list open question at the end of this doc: `Note.body`, and only for
`kind: "text"` and `kind: "rich"` notes (the long-form written fields) — not task
title/description, and not any other note kind. `body` today is a plain string column edited
via a plain `<textarea>`/`contenteditable` in `apps/web` (no existing structured rich-text
editor), so the CRDT model is a single `Y.Text` per note, not a `Y.XmlFragment` — building a
richer CRDT schema for a field that's currently just a string would have been solving a
problem the app doesn't have yet.

- **Transport — rides the existing `/v1/realtime` connection, no second WebSocket.** Per this
  section's own corrected framing above (browsers talk to `apps/backend`'s authenticated relay,
  never to NATS directly), CRDT sync had to go through that same connection/auth gate rather
  than inventing a parallel NATS-facing auth story. `apps/backend/src/realtime/realtime.gateway.ts`
  now also reads client-sent messages (previously push-only) — a small JSON envelope
  (`@slowspider/shared-types`'s `NoteDoc*Msg` types) distinguishes `doc-subscribe`/
  `doc-update`/`doc-unsubscribe`/`awareness-update` (client→server) and `doc-sync`/`doc-update`/
  `doc-error`/`awareness-update` (server→client) from the existing `{table,type,row}` change
  events by the presence of a `table` key. Subscriptions are per-note, not per-workspace: a
  client only receives another note's update stream if it has that note open (`doc-subscribe`),
  so a workspace with many notes doesn't fan every edit out to every connected client — each
  open note gets its own NATS subject, `ws.<workspaceId>.doc.<noteId>.update` (text) and
  `ws.<workspaceId>.doc.<noteId>.awareness` (presence), both relayed by the same per-connection
  subscribe/forward pattern the whole-record change relay already used.
- **Custom Yjs/NATS provider, as scoped — one module.**
  `apps/backend/src/realtime/yjs-doc.service.ts` (`YjsDocService`) is the backend's own
  authoritative Yjs participant per open note (in-memory `Map<noteId, Y.Doc>`, refcounted
  across however many connections currently have that note open). It's not a dumb relay: it
  applies every client update to its own doc (synchronously, in-process — see below) so it can
  periodically snapshot the merged result into Postgres. `NatsService` gained
  `publishDocUpdate`/`publishAwarenessUpdate` and its `subscribe()` was generalized (`subscribe<T>`)
  to serve both the existing change events and the new doc/awareness payloads without a second
  near-identical method.
  - **Echo guard, per this doc's own question.** Two independent guards, belt-and-suspenders:
    (1) each WS connection gets a random `connId` at connect time; every `doc-update`/
    `awareness-update` it publishes is tagged with that id, and the per-connection NATS
    subscribe callback skips forwarding a message back to the connection whose id matches —
    so a client never receives its own edit echoed back. (2) Client-side
    (`apps/web/src/lib/yjs/use-collab-note-text.ts`), every locally-applied Yjs transaction is
    tagged with a local origin marker, and the doc's `update` event only publishes when the
    origin matches — an update applied via an incoming `doc-sync`/`doc-update` (tagged
    `"remote"`) is never re-published. Either guard alone would be sufficient (re-applying an
    already-applied Yjs update is a no-op — CRDT updates are idempotent — so a missed guard
    would be wasteful, not incorrect), but both were cheap to add and make the intent explicit.
  - **Why the backend doesn't loop its own publishes back through NATS to update its own doc**
    (a real alternative design, and the one a naive "everything is a NATS peer" reading of the
    spec above would suggest): `YjsDocService.applyUpdate()` is called directly and
    synchronously from the gateway's message handler, in-process — not via subscribing to its
    own NATS publish. Every WS connection on a `docker-compose` deployment (this repo's actual
    shape — one `backend` service, not horizontally scaled) is handled by the same process, so
    there's no need to round-trip through NATS just to apply an update to a doc this instance
    already has in memory. NATS is used purely to fan the raw update bytes out to *other*
    connections. Documented as a deliberate, disclosed simplification in `yjs-doc.service.ts`'s
    own header comment, including why it stays correct (not just "works for now") even with
    more than one backend instance: every instance that has a given note open applies the same
    set of updates via the NATS relay, and Yjs updates are commutative/idempotent, so every
    instance's independent debounced flush writes equivalent content — the only race is "whose
    write lands last," which is harmless here.
- **Persistence encoding.** `notes.yjs_state` — a new nullable `text` column (migration
  `add_notes_yjs_state`, applied directly against the live Supabase project via the Supabase
  MCP, since this backend's Prisma is schema-reference-only per this doc's own baseline notes;
  `prisma/schema.prisma` updated to match, schema-reference-only as everywhere else). Holds
  base64-encoded `Y.encodeStateAsUpdate(doc)` — base64 over a `text` column rather than `bytea`,
  since Supabase-js/PostgREST round-trips `bytea` as an awkward hex string by default and this
  avoids that entirely. **`body` stays the plain-text mirror** (`Y.Text.toString()`), written in
  the same snapshot — this was a deliberate reading of "write it into `Note.body`" in this
  section's original scoping: overloading `body` itself with the binary/base64 state would have
  broken every existing reader of `body` (other note kinds' rendering, `apps/mobile`, a plain
  `GET /v1/board` response) the moment this shipped, so `yjs_state` is a new, purely additive
  field instead (added to `packages/shared-types`'s `Note` interface as expected — see that
  package's own note on why it's `yjs_state?: string | null`, optional rather than required, so
  `apps/mobile`'s existing `Note`-shaped literals don't need updating for a feature this pass
  doesn't touch there). Snapshots are debounced (1.5s after the last update) and always flushed
  immediately when the last connection editing a note closes ("every note-close," per this
  section's own phrasing) — also republishes the merged row on the *existing* whole-record
  `notes` change subject (`NatsService.publishChange`), so a note preview/card elsewhere in the
  UI picks up the merged text too, for free, without a second event type.
- **Backward compatibility (seed from existing plain-text `body`).** `YjsDocService.open()`
  checks `yjs_state` first; if null (every note that existed before this shipped, and every
  note that's never been opened in the collaborative editor since), it seeds the new `Y.Text`
  from the note's current `body` instead. Opening a pre-existing note without editing it leaves
  it completely untouched (the in-memory doc is never marked dirty, so the debounced flush never
  fires) — verified concretely, see below.
- **Awareness: transport built, client UI skipped — lower priority than correct text merging,
  per this task's own instruction.** The relay half of awareness exists end-to-end
  (`awareness-update` message type, `ws.<workspaceId>.doc.<noteId>.awareness` NATS subject,
  same per-connection subscribe/forward/echo-guard pattern as text updates) and is exercised by
  the same gateway code path the text-sync test below drives. What's **not** built: the
  client-side `y-protocols/awareness` state (cursor position, who's-editing presence) and any
  UI for it — `apps/web` never sends or listens for `awareness-update` today. Skipped, not
  attempted-and-failed: correct text merging was verified first and thoroughly (below), and
  awareness would have been additional, lower-priority scope on top of that per this task's own
  framing. Wiring it up is a bounded follow-up (the hard part — auth-gated, per-note-scoped
  transport — already exists).
- **Frontend.** `apps/web/src/hooks/useRealtimeBoard.ts` now doubles as the owner of a shared
  `RealtimeDocChannel` (`sendDoc`/`addDocListener`/`addOpenListener`) alongside its existing
  whole-record-change job, so CRDT sync rides the one connection it already owns — returned
  from the hook and threaded down through `Board.tsx` → `TaskNotesModal` → `NotesPanel` as a
  prop (matching this codebase's existing prop-drilling style; no new Context introduced).
  `apps/web/src/lib/yjs/use-collab-note-text.ts` is the client half of the custom provider
  (local edit → encode → send; incoming message → `Y.applyUpdate`), using a small
  common-prefix/common-suffix diff (same minimal approach `y-textarea` itself uses) to turn a
  whole-value textarea `onChange` into a small `Y.Text` delta instead of replacing the entire
  doc on every keystroke. `apps/web/src/components/notes/CollaborativeNoteEditor.tsx` binds
  this to a plain shadcn `Textarea` — explicitly **not** a rich-text editor framework
  (TipTap/ProseMirror/Slate), matching how `body` is actually edited today and this task's own
  explicit scope guard — plus best-effort caret-position preservation when a remote update
  rewrites the text while focused (shift the caret by the same edit the text itself underwent,
  rather than letting the browser default it to the end). Wired into `NotesPanel.tsx`'s
  `NoteRow`: existing notes previously had no edit affordance at all (the composer only ever
  created new notes) — a pencil icon on `text`/`rich` notes now toggles the live collaborative
  editor in place of the read-only render.
- **`packages/shared-types`**: `Note` gained `yjs_state`, and a new
  `NoteDocSubscribeMsg`/`NoteDocUnsubscribeMsg`/`NoteDocUpdateMsg`/`NoteDocSyncMsg`/
  `NoteDocErrorMsg`/`NoteAwarenessUpdateMsg` message union (`NoteDocClientMsg`/`NoteDocServerMsg`)
  so `apps/web` and `apps/backend` share one definition of the wire envelope instead of
  hand-duplicating it, per this package's own stated purpose.
- **Known limitation, not solved here (documented, not silently accepted):** a REST client that
  `PATCH`es a note's `body` directly (`PATCH /v1/notes/:id` — unchanged by this pass) writes
  `body` without touching `yjs_state`. The next collaborative-editor session for that note
  resumes from the older `yjs_state` (if one exists), which would silently not reflect that
  direct-PATCH edit. Not currently reachable from `apps/web`'s UI (the only body-editing path
  now goes through the collaborative editor once a note exists), so no user-facing regression
  today, but worth flagging for anything that talks to the REST API directly (a future mobile
  client, scripts, etc.) — solving it properly (e.g. comparing `updated_at`, or invalidating
  `yjs_state` on a direct PATCH) was out of scope for this pass.

**Verified — concretely, not just "the code looks right."** Both apps build/typecheck clean
(`next build`+`tsc --noEmit` on `apps/web`, `nest build` on `apps/backend`, `tsc` on
`packages/shared-types`; `apps/mobile`'s own `tsc --noEmit` unaffected — `yjs_state` is
optional specifically so this stays true — modulo the same pre-existing, environment-only
failures prior phases already recorded there, e.g. missing native module type declarations).

This environment has the same credentials gap prior phases flagged (no
`SUPABASE_SERVICE_ROLE_KEY`/`REDIS_URL` for a real `apps/backend/.env`) — but unlike prior
phases, a real Supabase project (`slowspider`, via the Supabase MCP) was reachable for
DB-level work, and that materially changed what could actually be proven:

- **Schema migration** (`add_notes_yjs_state`) applied directly to the live project.
- **The actual concurrent-edit convergence test — the entire point of using a CRDT — run for
  real**, using an integration harness (not a unit test of one function) that imports and runs
  the real compiled `RealtimeGateway`, `YjsDocService`, and `NatsService` classes, a real
  `nats:2-alpine` container (Docker), real `ws` WebSocket client connections, and the real
  `yjs` package end to end — not mocked. The only stubbed pieces, both isolated to the
  pre-existing Phase-5 auth dependency this pass didn't change: `SupabaseService.anon().auth.getUser()`
  (fixed fake users for two fixed test tokens, instead of verifying a real Supabase-issued JWT
  — obtaining one requires either `SUPABASE_SERVICE_ROLE_KEY`, which isn't available here, or
  writing directly to `auth.users`, which this environment's own safety rules correctly refused
  as out of bounds) and `WorkspaceService.isMember()` (stubbed true — unrelated, unchanged
  code). Concretely: client **A** (`token-a`) and client **B** (`token-b`) both opened the same
  pre-existing plain-text note (`body: "Hello world"`, no `yjs_state` yet — exercising the
  seed-from-body path in the same run). **A** inserted `"[A-said-hi] "` at position 0; **B**
  inserted `" [B-said-bye]"` at the end; fired back-to-back with no coordination between them.
  After propagation, both clients' independent local `Y.Doc`s converged to the identical string
  `"[A-said-hi] Hello world [B-said-bye]"` — both edits present, original text intact, neither
  clobbered the other (the last-write-wins path this whole section exists to avoid would have
  kept only one side's insert). After the debounce window, the harness's in-memory note store
  (standing in for Postgres in this run) showed `body` had been snapshotted to that exact
  merged string.
- **The Postgres round-trip specifically, against the real live database** (separate from the
  harness run above, to close the gap the harness's fake note store couldn't): inserted a real
  `notes` row (`body: "Hello world"`, `yjs_state: null` — i.e. exactly the shape of any note
  that predates this feature) into the live project via the Supabase MCP, then wrote the *exact*
  `body`/`yjs_state` values `YjsDocService.flush()` had produced in the harness run above
  (the real base64 `Y.encodeStateAsUpdate` bytes, not a synthetic stand-in) via a real `UPDATE`,
  then read it back with a real `SELECT`. Independently re-decoded the retrieved `yjs_state`
  with the real `yjs` package in a fresh process (`Y.applyUpdate` into a brand-new `Y.Doc`) —
  confirms the stored base64 is genuine, correctly-encoded Yjs state, not just a string that
  happens to match, and that it decodes back to the identical merged text. Test row deleted
  afterward; no other rows touched.
- **Backward compatibility**, same harness run: a client opening a *different*,
  never-before-touched pre-existing note (plain `body`, `yjs_state: null`) correctly seeded its
  local doc from that plain text; closing without editing left the stored row completely
  unchanged (`body` identical, `yjs_state` still `null`) — opening a note in the collaborative
  editor is not itself a mutation.
- **Kind guard**: `doc-subscribe` against a `kind: "link"` note was rejected with a `doc-error`
  (`"Note kind \"link\" doesn't support collaborative editing."`), never reaching a
  `doc-sync` — confirms the `text`/`rich`-only scope is enforced server-side, not just assumed
  client-side.
- **What was *not* run, honestly**: the full real signup-through-Kong-through-browser happy
  path this task's verification section describes (dev OTP `123456`, two real browser tabs)
  — blocked by the same missing `SUPABASE_SERVICE_ROLE_KEY`/`REDIS_URL` gap prior phases
  already hit (`WorkspaceService.isMember()`, used by `RealtimeGateway`'s connect-time auth
  gate, requires the service-role client; `AccountService.completeSignup` requires it too, plus
  Redis for OTP storage). That auth gate is unchanged, pre-existing Phase-5 code, not something
  this pass modified — the integration test above deliberately isolated the actually-new code
  (the CRDT sync/persistence path) from that pre-existing, still-unverified-live gap rather than
  letting one block testing the other. `docker compose` was not brought up in this pass (no
  functional `apps/backend/.env` to bring it up with, per the same gap) — nothing to
  `docker compose down`; the standalone `nats:2-alpine` test container used for the harness
  above was stopped and removed after the run.

**`packages/shared-types` follow-up — actually wiring it up** ✅ done

Closes the gap flagged since Phase 0: `packages/shared-types` existed but wasn't a real
dependency of any app — `apps/web`'s `src/lib/types.ts`, `apps/backend`'s
`src/common/types.ts`, and `apps/mobile`'s `src/api.ts` each carried their own copy of
`Task`/`Cluster`/`Category`/`Note`/`Milestone`/`BoardPayload`/etc, and had already drifted:
`apps/mobile`'s `RemoteTask`/`RemoteCluster`/etc (the shapes `shared-types/src/index.ts` had
been seeded from in Phase 0) were a *slimmer* subset than what `apps/backend`'s
`board.service.ts` actually returns — it mostly does `.select("*")` / `.select().single()`
against Postgres and hands the full row back over the wire (`workspace_id`, `created_by`,
etc included), not the trimmed shape Phase 0's extraction had assumed. `apps/web` had it
worse: `src/lib/types.ts` and `apps/backend/src/common/types.ts` were an intentional 1:1 port
of each other (per each file's own header comment) — a *third* independent copy, kept in sync
by hand — and `apps/web/src/app/page.tsx` additionally had its own fourth, one-off
`interface BoardPayload extends BoardData {...}`. `Workspace`/`WorkspaceRef`/`MemberRow`/
`InviteRow`/`PendingInviteForUser` were likewise hand-duplicated between `apps/web`'s
`workspace-actions.ts` and `apps/backend`'s `workspace.service.ts`.

- **Reconciliation**: for every type, the full DB-row shape (`apps/web`'s/`apps/backend`'s
  version, matching what the backend's controllers actually return — the ground truth) became
  canonical in `packages/shared-types/src/index.ts`; `apps/mobile`'s original `Remote*` names
  (`RemoteTask`, `RemoteCluster`, `RemoteCategory`, `RemoteNote`, `RemoteMilestone`,
  `RemoteWorkspace`) are kept as type aliases onto those same canonical interfaces, not
  separate structural types, so its ~13 files importing those names didn't need a rename. The
  one deliberate behavior-preserving choice: `Task.milestones` stays a *required* `Milestone[]`
  (not the optional field `apps/mobile`'s version had) because `apps/web`'s `Board.tsx` accesses
  it unconditionally (`t.milestones.map(...)`, no `?.`) in several places — matching
  `apps/mobile`'s laxer optionality there would have broken `apps/web`'s typecheck for no
  reason, since no client ever actually receives a `Task`-typed value missing that field (the
  one backend path that omits it, `updateTask`'s return row, is discarded by
  `tasks.controller.ts`, which responds `{updated:true}` instead of the row).
- **Wiring**: `packages/shared-types` is a real npm-workspaces package
  (`@slowspider/shared-types`) with a build step (`tsc` → CommonJS + `.d.ts` in `dist/`) —
  shipping raw `.ts` source directly (as originally set up) works fine for `apps/web`
  (Turbopack) and `apps/mobile` (Metro/Babel), both of which inline-compile any `.ts` reachable
  from their module graph regardless of where it lives, but not for `apps/backend`: NestJS's
  `nest build` only emits compiled JS for its own `src/**`, never for `node_modules` (which is
  where a workspace dependency resolves from), so the plain `node dist/main.js` runtime would
  have tried to `require()` raw `.ts` directly and failed (`node:22-slim`, the base image, has
  no built-in TypeScript support). `apps/web` and `apps/backend` get it via the root npm
  workspace (`packages/*` was already in the root `workspaces` array); `apps/mobile` is
  deliberately excluded from that array (Phase 1: Expo/Metro doesn't play well with hoisted
  workspace `node_modules`), so it depends on it via a plain `"file:../../packages/shared-types"`
  entry in its own `package.json` instead, and gets its own `apps/mobile/metro.config.js` (new
  file — none existed before) adding `watchFolders`/`resolver.nodeModulesPaths`/
  `resolver.unstable_enableSymlinks` so Metro can see and resolve the symlinked package outside
  its own project root.
- **`apps/backend/Dockerfile` + `docker-compose.yml`**: the backend's Docker build context was
  `./apps/backend` alone, which stopped working the moment it gained a real dependency living
  at `../../packages/shared-types` — Docker can't `COPY` anything from outside its build
  context. Moved the context to the repo root (`docker-compose.yml`: `context: .`, `dockerfile:
  apps/backend/Dockerfile`) and rewrote the Dockerfile to explicitly `COPY` only
  `apps/backend`/`packages/shared-types` (plus the root manifests) rather than the whole
  monorepo, install with `npm install --workspace=apps/backend --workspace=packages/shared-types`
  (the root `postinstall` script then builds `shared-types`'s `dist/`), and copy both compiled
  `dist/` outputs into the lean runtime stage. Added a root `.dockerignore` to keep
  `apps/web`/`apps/mobile`/every `node_modules` out of the build context. One real bug caught
  building this: a stale local `apps/backend/tsconfig.build.tsbuildinfo` (incremental-build
  cache, already gitignored via `*.tsbuildinfo` but not dockerignored) got copied into the image
  without its matching `dist/` output, and `nest build` — trusting the cache — silently emitted
  nothing; fixed by adding `**/*.tsbuildinfo` to `.dockerignore`.
- **Verified**: `apps/web` (`next build` + `tsc --noEmit`, zero warnings — an initial version
  re-exporting shared-types via `export * from` triggered a Turbopack "unexpected export *"
  warning on the CommonJS output, fixed by re-exporting named bindings explicitly instead) and
  `apps/backend` (`nest build`) both build clean; `apps/mobile` (`tsc --noEmit`, no typecheck
  script exists in its `package.json` so this was run directly) is clean except for one
  **pre-existing, unrelated** error — `BoardScreen.tsx:210`, `Property 'clusters' does not
  exist on type 'Category'` — confirmed present before this change too (that file was never
  touched here, and `Category`/the old `RemoteCategory` never had a `clusters` field either);
  left alone per this task's own "don't touch business logic" scope rather than papered over
  with a fake field. Root `npm install` (builds `apps/web`+`apps/backend`+`packages/shared-types`)
  and a separate `apps/mobile`-scoped `npm install` (its own lockfile, outside the root
  workspace) both correctly symlink `@slowspider/shared-types` to `packages/shared-types`. Built
  the real `apps/backend/Dockerfile` via `docker compose build backend` (succeeded after the
  tsbuildinfo fix above) and ran the full `docker compose up -d` stack (`nats`+`backend`+`kong`)
  against a clearly-labeled, non-functional placeholder `apps/backend/.env` (gitignored, deleted
  after testing — no real Supabase/Postgres/Redis project is available in this worktree, same
  gap every prior phase's own verification section already flags): `backend` boots clean,
  connects to NATS, and maps every route; `curl http://localhost:8000/v1/board` through Kong
  still returns `401 {"ok":false,"error":"Not signed in."}`, unchanged from every prior phase —
  confirming the type-consolidation and Docker rewrite didn't change runtime behavior. `docker
  compose down` afterward.

**Phase 6 — Android offline-first**
- Add local SQLite mirror + outbox table to `apps/mobile`.
- Switch mutation calls to write-local-then-queue instead of direct request/response.
- Add reconnect drain logic + NATS subscription for push updates when online.

Phases 5 and 6 can run in parallel with each other (and largely independent of Phase 3/4) once Phase 2 (Kong + backend) is stable, since both build on the backend's REST API existing behind Kong.

## Open questions to resolve before Phase 1

- **NestJS project conventions**: module-per-resource vs. feature-based folders — pick one before porting 20+ route files.
- ~~**Kong deployment**: self-hosted (Docker/K8s) vs. Kong Konnect (managed)?~~ Resolved: self-hosted, DB-less declarative config via `docker-compose.yml` — lowest ops for a solo maintainer, no Kong admin DB to run/back up.
- ~~**NATS deployment**: self-hosted (single VM/container + JetStream volume) vs. a managed NATS provider (e.g. Synadia Cloud) — same solo-maintainer ops tradeoff as Kong.~~ Resolved in Phase 5: self-hosted, single `nats:2-alpine` container + JetStream volume via `docker-compose.yml`, same reasoning as Kong. ~~**Still open**: per-workspace NATS subject authorization~~ Resolved in the Phase 5 follow-up (realtime auth fix): not via NATS's own decentralized JWT auth, but by removing browser access to NATS entirely and relaying through the backend's own authenticated `GET /v1/realtime` WebSocket endpoint instead — see that writeup for the full design and its verification gap (no real Supabase credentials were available in the environment that built it; the connect-time reject-on-bad-auth path was verified over a real Kong→backend network round trip, but the full real-account happy path was not).
- **iOS timeline**: not urgent now, but confirms the "one backend, N clients" shape is worth the Kong investment.
- **Storage**: staying on Supabase Storage (S3-compatible) is the lowest-friction option since `note-media.ts` already targets it — only revisit if there's a reason to move to raw AWS S3.
- ~~**Which fields actually need CRDT**: confirm the exact field list (likely `Note.body` at minimum — task title/description TBD) before building the Yjs provider, since scope here directly drives Phase 5 effort.~~ Resolved in the CRDT co-editing follow-up at the end of Phase 5: `Note.body` only, and only for `kind: "text"`/`"rich"` notes — task title/description confirmed out of scope.

## Note (unrelated, flagging while in here)

~~`credentials.txt` at repo root is currently staged for the initial commit...~~ resolved: removed from the repo in the Phase 2 commit. No longer present.
