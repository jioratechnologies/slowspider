# Migration Plan — Split Frontend / Backend / Android behind Kong

## Current state (baseline)

- Next.js monolith (`src/app`) does SSR/web UI **and** owns `/api/v1/*` REST routes.
- `apps/mobile` (Expo/React Native) already calls those same `/api/v1/*` routes directly (`apps/mobile/src/api.ts`), auth via Bearer token + `x-workspace-id` header.
- DB: Postgres via Supabase pooler, Prisma ORM (`prisma/schema.prisma` — AuthUser, User, Workspace, WorkspaceMember, WorkspaceInvite, Category, Cluster, Task, Milestone, Note, UserSettings).
- Redis: Upstash, used today only for OTP storage (`REDIS_URL`).
- File storage: Supabase Storage (S3-compatible under the hood), signed upload URLs issued by `/api/v1/notes/media` (`src/lib/note-media.ts`, `src/lib/services/board.ts`).
- Auth: NextAuth (Auth.js v5) + own `AuthUser`/JWT (`API_JWT_SECRET`) — not full Supabase Auth.

So there is already a clean REST seam (`/api/v1`) — this is a real advantage. The migration is "extract that seam into its own service," not "invent an API from scratch."

## Target architecture

```
                        ┌─────────────┐
        Android app ───▶│             │
        (future) iOS ──▶│  Kong (API  │───▶  Backend (NestJS, Node/TS)
                        │  Gateway)   │      - all business logic       ──▶ publishes events
        Web (Next.js) ─▶│             │      - talks to Postgres, Redis, S3
        BFF calls   ───▶│             │
                        └─────────────┘
                                                                              │
   Web / Android ── direct WS connect (bypasses Kong) ──▶  NATS  ◀───────────┘
   (live updates, presence, CRDT doc sync)          (+ JetStream for durability)

                 shared: Postgres (Supabase) · Redis (Upstash) · S3 (Supabase Storage)
```

- **Backend (NestJS)** — single source of truth for business logic. Owns Prisma client, Redis client, storage client. Exposes REST (keep `/v1` versioning). This is what `/api/v1/*` route handlers become, moved out of Next.js. On every mutation, also publishes a domain event to NATS (see Realtime section).
- **Web (Next.js)** — becomes a thin BFF + SSR/UI layer. Either:
  - (a) calls backend through Kong like every other client, or
  - (b) keeps a couple of Next-only concerns (cookie session, SSR data fetching) as a real BFF that itself calls the backend.
  Given the app already uses Bearer-token auth end-to-end (not cookie sessions calling internal routes), **(a) is simpler** — Next.js stops hosting `/api/v1/*` entirely and just becomes a client of Kong, same as mobile.
- **Android (apps/mobile is Expo/RN, i.e. Android+iOS today)** — offline-first (see Offline section), plus live-update subscriber when online.
- **Kong** — entry point for all *request/response* API traffic. Owns: routing to backend service, rate limiting, CORS, JWT/key-auth verification, request logging. Realtime traffic (NATS WS) connects directly, not through Kong — same reasoning as Supabase Realtime's direct-client-WS pattern, just with a self-run NATS server instead of a managed one.
- **NATS** — realtime backbone. Domain-event fanout (task/cluster/note/workspace changes) for live multi-device sync, plus CRDT update/awareness subjects for co-edited text fields. JetStream gives durable replay so a client that reconnects after a drop catches up instead of missing updates.
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
  shared-types/   # DTOs / API contracts shared by web + backend + mobile (not done yet — see
                  # note below; each client still hand-copies its own response interfaces)
  db/             # optional: Prisma schema + generated client as its own package
  realtime/       # NATS pub/sub helpers + Yjs-NATS CRDT provider, shared by backend + web + mobile
infra/
  kong/       # kong.yml (declarative config) or deck.yml
  nats/       # NATS server config, JetStream stream defs, subject/account auth rules
```

`src/app/api/v1/**` route handlers were moved to `apps/backend/src/**` NestJS modules, one module per resource (auth, board, categories, clusters, notes, tasks, workspace, cron) in Phase 1, then deleted from `apps/web` in Phase 3 once Server Actions were cut over to call the backend instead. `src/lib/services/*` and `prisma/` were likewise ported to `apps/backend` in Phase 1 and deleted from `apps/web` in Phase 3. `src/lib/note-media.ts` stayed in `apps/web` — it's pure client-side browser-to-Supabase-Storage code, never part of the in-process data layer being moved. `packages/shared-types` was never built out — `apps/web`, `apps/backend`, and `apps/mobile` each still define their own copies of the response/DTO shapes (e.g. `BoardPayload`, `RemoteTask`, `RemoteCluster`); still a real opportunity for a follow-up phase, not attempted here.

## Realtime & collaboration (NATS + CRDT)

Two distinct kinds of "realtime" here — keep them separate, don't over-build the second where the first suffices:

**1. Whole-record live sync** (task moved, cluster renamed, note added, workspace membership changed) — the common case for most of the app.
- Backend publishes to a subject namespaced per workspace after every successful mutation, e.g. `ws.<workspaceId>.task.updated`, `ws.<workspaceId>.cluster.created`.
- Clients (web + mobile, when online) subscribe to `ws.<workspaceId>.>` for their active workspace and apply the payload directly or trigger a targeted refetch. No CRDT needed for this path — it's broadcast + last-write-wins, which is what's already implied by the existing REST semantics.

**2. True concurrent co-editing** (two people typing in the same note body / task title at once) — needs CRDT.
- Use **Yjs** for the document model. Each collaborative field (e.g. `Note.body`) gets a Yjs doc.
- Yjs updates are binary deltas — publish them to a per-document NATS subject (e.g. `ws.<workspaceId>.doc.<noteId>.update`) and apply on receipt. There's no official Yjs-NATS provider, so this is a small custom provider (subscribe → `Y.applyUpdate`, local change → publish encoded update) — expect ~1 focused module, not a big lift, since the pattern is identical to existing `y-websocket`/`y-redis` providers, just swapping transport.
- Awareness (live cursors/who's-editing-what) rides a companion subject the same way, using Yjs's `awareness` protocol.
- **Persistence**: JetStream retains recent updates for replay to reconnecting clients, but keep a periodic snapshot of each Yjs doc's state (`Y.encodeStateAsUpdate`) written to Postgres (or Redis) so a fresh client doesn't need full history and JetStream retention can stay short.
- Scope this to the specific fields that need it (note body, maybe task title/description) — not every field in the schema. Most of the schema (positions, colors, booleans, dates) is fine as whole-record last-write-wins.

**Auth on NATS subjects**: scope per workspace so a client can only subscribe/publish to workspaces they're a member of — NATS decentralized JWT auth (or account/subject permissions keyed off the same JWT the backend already issues) enforces this at the NATS server, not just in app code.

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
| Realtime | Supabase Realtime, via client-side `createClient()` in `useRealtimeBoard.ts` (and session bits in `src/app/page.tsx`) | **Being replaced anyway** — Phase 5's NATS work removes this Supabase coupling as a side effect. |

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

**Phase 5 — realtime (NATS + CRDT)**
- Stand up NATS (with JetStream) in `infra/nats/`, define subject namespace and auth rules per workspace.
- Add event publish calls to backend mutation handlers (whole-record events first — this alone gets multi-device live sync working for most of the app).
- Web subscribes to workspace subjects, applies updates to client state.
- Add Yjs + custom NATS provider (`packages/realtime`) for the specific co-editable fields identified; wire into the note/task editor components.
- Add periodic Yjs snapshot persistence job.

**Phase 6 — Android offline-first**
- Add local SQLite mirror + outbox table to `apps/mobile`.
- Switch mutation calls to write-local-then-queue instead of direct request/response.
- Add reconnect drain logic + NATS subscription for push updates when online.

Phases 5 and 6 can run in parallel with each other (and largely independent of Phase 3/4) once Phase 2 (Kong + backend) is stable, since both build on the backend's REST API existing behind Kong.

## Open questions to resolve before Phase 1

- **NestJS project conventions**: module-per-resource vs. feature-based folders — pick one before porting 20+ route files.
- ~~**Kong deployment**: self-hosted (Docker/K8s) vs. Kong Konnect (managed)?~~ Resolved: self-hosted, DB-less declarative config via `docker-compose.yml` — lowest ops for a solo maintainer, no Kong admin DB to run/back up.
- **NATS deployment**: self-hosted (single VM/container + JetStream volume) vs. a managed NATS provider (e.g. Synadia Cloud) — same solo-maintainer ops tradeoff as Kong.
- **iOS timeline**: not urgent now, but confirms the "one backend, N clients" shape is worth the Kong investment.
- **Storage**: staying on Supabase Storage (S3-compatible) is the lowest-friction option since `note-media.ts` already targets it — only revisit if there's a reason to move to raw AWS S3.
- **Which fields actually need CRDT**: confirm the exact field list (likely `Note.body` at minimum — task title/description TBD) before building the Yjs provider, since scope here directly drives Phase 5 effort.

## Note (unrelated, flagging while in here)

~~`credentials.txt` at repo root is currently staged for the initial commit...~~ resolved: removed from the repo in the Phase 2 commit. No longer present.
