# Handover

Task/note/board organizer ("Slow Spider"), mid-migration from a Next.js monolith into a
split frontend/backend/mobile architecture behind a Kong API gateway. This doc is the
fast-orientation summary; `docs/MIGRATION-PLAN-bff-kong-split.md` has the full
phase-by-phase history and design rationale — read that for depth, this for a map.

## Repo layout

```
apps/
  web/        Next.js 16 — UI + SSR only. Server Actions call apps/backend through Kong.
  backend/    NestJS — owns all /v1 REST logic, Postgres (via Supabase-js), Redis, NATS,
              the realtime WebSocket relay. Source of truth for business logic.
  android/    Flutter — the Android client. apps/mobile (Expo/React Native) has been
              deleted — Flutter is now the only Android client, see "Android: RN vs
              Flutter" below for what that means risk-wise.
packages/
  shared-types/   Canonical DTOs (Task, Cluster, Note, Workspace, etc.), consumed by web
                  and backend via npm workspaces (TypeScript only — apps/android is Dart,
                  doesn't consume this package; its own lib/models/models.dart is a
                  separate, manually-kept-in-sync copy).
infra/
  kong/kong.yml       Kong declarative config (DB-less, single file, no admin DB to run).
  nats/nats.conf      NATS server config — fully internal to Docker network, not exposed
                      to the host or browsers.
docker-compose.yml    Runs backend + kong + nats together. This is the whole backend stack.
```

## Running it locally

**Backend stack** (Postgres/Redis/Storage are remote — real Supabase + Upstash, not
containerized; only backend/kong/nats run locally):

```
cd apps/backend      # first time only, if apps/backend/.env doesn't exist yet
cp .env.example .env # then fill in real values, see "Environment variables" below
cd ../..
docker compose up -d --build
```

Kong's proxy is on `http://localhost:8000` — every client (web, android) talks to this,
not directly to the backend's own port.

**Web app**:

```
npm install                 # root — npm workspaces, installs everything incl. shared-types
npm run dev:web              # or: npm run dev -w apps/web
```

Needs `apps/web/.env.local` to exist with real values (see below). Runs on
`http://localhost:3000`.

**Flutter app**:

```
cd apps/android
flutter run -d web-server --web-hostname 127.0.0.1 --web-port 8080
```

Defaults to hitting Kong at `http://localhost:8000` (override with
`--dart-define=API_BASE_URL=...`). Web/Windows-desktop targets work now; a real Android
device/emulator needs the Android SDK installed first (`flutter doctor` will say so).

## Environment variables

Two separate `.env` files, both gitignored (never committed, won't transfer via git —
copy them by hand to wherever you work next):

- `apps/web/.env.local`
- `apps/backend/.env` (template: `apps/backend/.env.example`)

Both point at the same physical Supabase project (Postgres + Auth + Storage) and the same
Upstash Redis instance — no local Postgres/Redis containers, everything is the real remote
service even in dev. `apps/backend/.env.example` has inline comments explaining every key.

**Known stale entries**: `apps/web/.env.local` still has leftover `DATABASE_URL`,
`DIRECT_URL`, `REDIS_URL`, `NEXT_PUBLIC_NATS_WS_URL`, `NEXT_PUBLIC_NATS_AUTH_TOKEN` and a
few others from before the backend split — apps/web doesn't touch the DB/Redis/NATS
directly anymore (all moved to apps/backend), so these are dead. Harmless to leave, safe
to delete if doing cleanup.

## What's built (phase history — see the migration doc for full detail on each)

| Phase             | Status          | What                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0/1               | Done            | Monorepo scaffold, NestJS backend, 1:1 port of all`/v1` routes                                                                                                                                                                                                                                                                                                                                                                        |
| 2                 | Done            | Kong gateway (DB-less),`docker-compose.yml`                                                                                                                                                                                                                                                                                                                                                                                           |
| 3                 | Done            | `apps/web` cut over to call backend through Kong; local Prisma/service layer deleted from web                                                                                                                                                                                                                                                                                                                                         |
| 5                 | Done            | Whole-record live sync (NATS) — task/cluster/note/workspace changes push to other devices                                                                                                                                                                                                                                                                                                                                              |
| Realtime auth fix | Done            | Browsers connect to backend's own authenticated`/v1/realtime` WS, not NATS directly (NATS has zero host-exposed ports)                                                                                                                                                                                                                                                                                                                |
| shared-types      | Done            | `packages/shared-types` is the real DTO source of truth across all three apps                                                                                                                                                                                                                                                                                                                                                         |
| CRDT              | Done            | `Note.body` (text/rich notes) supports real concurrent co-editing via Yjs, riding the same `/v1/realtime` connection                                                                                                                                                                                                                                                                                                                |
| Flutter app       | First pass done | `apps/android` — feature-matched to what `apps/mobile` already has (auth, board, tasks, clusters, categories, notes, attachments, archive, calendar, invites), plus whole-record realtime sync (below). No offline-first SQLite yet, never run on real Android.                                                                                                                                                                    |
| Flutter realtime  | Done            | `apps/android` connects to the same authenticated `GET /v1/realtime` WS (through Kong) as `apps/web` — `lib/core/realtime_client.dart` + wiring in `lib/state/board_provider.dart`. Whole-record broadcast sync only (task/cluster/category/milestone/note create/update/delete); the CRDT/Yjs `Note.body` co-editing protocol on the same connection is deliberately not handled — see "Flutter realtime/offline" below. |

## Known gaps / not done

- **Android: Flutter is now the only client** — `apps/mobile` (RN) has been deleted.
  `apps/android` builds clean and analyzes clean but has never touched a real device — no
  Android SDK on this dev machine. Install it and actually run this before trusting the
  app beyond "it compiles." There is no RN fallback anymore if something's broken.
- **Flutter offline**: not built. `apps/android` still does plain fetch-on-load / pull-to-
  refresh for every REST mutation — no local SQLite mirror, no offline outbox (that's a
  separate, not-yet-started phase for both mobile clients — see
  `docs/MIGRATION-PLAN-bff-kong-split.md`'s Phase 6). **Realtime is done**, though: a
  collaborator's task/cluster/category/milestone/note change now shows up live on Android the
  same way it already did on web, via the same authenticated `GET /v1/realtime` WS through
  Kong (`apps/android/lib/core/realtime_client.dart`, wired into
  `apps/android/lib/state/board_provider.dart`). Reconnects with exponential backoff (unlike
  web's flat 2s retry — mobile networks drop more) and connects/disconnects as auth/workspace
  state changes. The CRDT/Yjs `Note.body` live-text-merging protocol riding the same
  connection on web was explicitly out of scope for this pass and isn't handled here — those
  `doc-*`/`awareness-*` messages are silently ignored (Android's note editor still does a
  plain PATCH-on-save, not live co-editing).
- **CRDT awareness/presence** (live cursors, who's-editing indicator): transport exists,
  no UI built.
- **VPS self-host migration**: blocked, no real server to point at. Currently everything
  is on Supabase (Postgres/Auth/Storage) + Upstash (Redis) — remote managed services, by
  design, until there's a real VPS with real credentials to migrate to.
- **No production deploy anywhere yet.** Everything above is local-dev verified only
  (`docker compose up`, real Supabase project, but no actual hosting/domain/TLS set up).
- **Full browser click-through of the CRDT co-editing UI and the Flutter app**: not done —
  every verification pass in this migration used curl/websocket scripts against the real
  backend, not an actual browser session, because no browser/device was available in the
  environment doing the work. Worth a manual pass before trusting either beyond "the API
  contract is correct."

## Conventions worth knowing

- Backend queries via Supabase-js, not Prisma, at runtime — Prisma is schema/migration
  reference only (`apps/backend/prisma/schema.prisma`). Don't add Prisma Client calls to
  new backend code expecting them to hit the DB; they won't be wired to anything.
- Auth is Supabase Auth end-to-end (Bearer access tokens), not NextAuth — an unused
  `AUTH_SECRET` env var is legacy cruft, ignore it.
- Kong config is declarative (`infra/kong/kong.yml`), no admin DB — edit the file, restart
  the `kong` container, that's the whole deploy story for gateway config changes.
- NATS is fully internal — nothing on the host or the browser side ever talks to it
  directly. If you're debugging realtime and reaching for `nats://localhost:4222`, that
  port isn't published; go through `apps/backend`'s `/v1/realtime` WS instead.
