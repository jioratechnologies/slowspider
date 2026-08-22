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
  web/        # current Next.js app, UI only after migration
  backend/    # new NestJS service — owns /v1 API, Prisma, Redis, storage
  mobile/     # existing Expo app, unchanged except API base URL
packages/
  shared-types/   # DTOs / API contracts shared by web + backend + mobile
  db/             # optional: Prisma schema + generated client as its own package
  realtime/       # NATS pub/sub helpers + Yjs-NATS CRDT provider, shared by backend + web + mobile
infra/
  kong/       # kong.yml (declarative config) or deck.yml
  nats/       # NATS server config, JetStream stream defs, subject/account auth rules
```

Move `src/app/api/v1/**` route handlers → `apps/backend/src/**` NestJS modules, one module per resource (auth, board, categories, clusters, notes, tasks, workspace, cron). Move `src/lib/services/*`, `src/lib/note-media.ts`, `prisma/` into `apps/backend`. `packages/shared-types` holds the response/DTO shapes currently duplicated between `src/lib/api` and `apps/mobile/src/api.ts` (e.g. `BoardPayload`, `RemoteTask`, `RemoteCluster`) so both clients import one definition instead of hand-copying interfaces.

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

Current: NextAuth issues a JWT (`API_JWT_SECRET`), mobile stores it and sends `Authorization: Bearer <token>`. This pattern already works for a gateway setup with no change to the token format.

Two options for where the JWT gets verified:
1. **Kong verifies** (`jwt` plugin) using the same secret/JWKS, rejects invalid tokens before they hit backend — less load on backend, but secret must be shared with Kong config.
2. **Backend verifies** (as it does today), Kong just routes — simpler to keep as a first step, move verification to Kong later once stable.

Recommend starting with (2) — zero auth-logic changes — and only moving verification into Kong once the split is otherwise stable.

## Phased plan

**Phase 0 — prep, no behavior change**
- Extract `packages/shared-types` from the interfaces already duplicated in `src/lib/api` and `apps/mobile/src/api.ts`.
- Confirm which Redis/S3/DB env vars the new backend needs (all already exist in `.env.local`: `DATABASE_URL`, `DIRECT_URL`, `REDIS_URL`, Supabase storage keys).

**Phase 1 — stand up `apps/backend` alongside the monolith**
- Scaffold NestJS in `apps/backend`, move `prisma/` there.
- Port `/api/v1/*` route handlers into NestJS modules 1:1 (same request/response shape, so no client changes needed yet). Port `src/lib/services/*` and `src/lib/note-media.ts` as-is.
- Backend runs on its own port locally; Next.js `/api/v1/*` routes stay in place untouched (parallel, not yet switched over).

**Phase 2 — Kong in front of backend**
- Write `infra/kong/kong.yml`: one service → `apps/backend`, routes matching `/v1/*`, CORS + rate-limit plugins.
- Point `apps/mobile` at Kong (`EXPO_PUBLIC_API_URL`) in a dev/staging build only, verify parity against the old Next.js-hosted API.

**Phase 3 — cut Next.js over**
- Swap Next.js's own data fetching (currently same-process Prisma calls / internal fetches) to call the backend through Kong.
- Delete `src/app/api/v1/**` and the now-unused service files from the web app once backend is verified equivalent.

**Phase 4 — cleanup**
- Remove Prisma/Redis/storage deps from `apps/web`'s `package.json` (it no longer touches them directly).
- Point production mobile build at Kong's production URL.
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
- **Kong deployment**: self-hosted (Docker/K8s) vs. Kong Konnect (managed)? Affects `infra/kong/` setup.
- **NATS deployment**: self-hosted (single VM/container + JetStream volume) vs. a managed NATS provider (e.g. Synadia Cloud) — same solo-maintainer ops tradeoff as Kong.
- **iOS timeline**: not urgent now, but confirms the "one backend, N clients" shape is worth the Kong investment.
- **Storage**: staying on Supabase Storage (S3-compatible) is the lowest-friction option since `note-media.ts` already targets it — only revisit if there's a reason to move to raw AWS S3.
- **Which fields actually need CRDT**: confirm the exact field list (likely `Note.body` at minimum — task title/description TBD) before building the Yjs provider, since scope here directly drives Phase 5 effort.

## Note (unrelated, flagging while in here)

`credentials.txt` at repo root is currently staged for the initial commit (`git status` shows `A  credentials.txt`) and contains a plaintext email/password pair. `.env.local` is correctly gitignored, but this file isn't. Worth confirming it's meant to be committed before that first commit lands.
