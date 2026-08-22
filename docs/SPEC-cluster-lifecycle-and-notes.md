# Spec: Cluster Lifecycle, Calendar, Star, Notes, Storage Quota

Captured 2026-08-16.

## Status

**Built (2026-08-16)** — migrations `20260816000000_stars_notes_and_calendar` and
`20260816000001_lock_down_storage_quota_fn` are applied:

- Star on tasks (`tasks.starred`), sorts above priority in smart order
- `tasks.deadline_time` + calendar panel in the header, with Google Calendar event links
  for tasks that carry a time
- `notes` table: text / rich / code / link / image / video / voice / table, private vs
  workspace visibility enforced by RLS, attached to a task **or** a cluster
- `note-media` storage bucket, per-user 10 GB quota via `user_storage_used()`
- Cold store and Dumping bin moved to a sticky right rail for drag-and-drop
- Expo Android app in `apps/mobile` consuming `/api/v1`

**Still open** — sections 1 and 2 below (auto-sort scoring, the 4-month idle sweep and
priority decay) are specified but not implemented. `clusters.last_used_at` and the
`isClusterStale` / `COLD_IDLE_MS` helpers exist as groundwork; nothing writes or sweeps
them yet.

## 1. Cluster auto-sort

Sort clusters (and likely tasks within) automatically by a blended score:
- usability (how often/recently used)
- priority (see Star, section 3)
- custom/manual weight

Existing `UserSettings.sortMode` (`"smart" | "manual"`) already models a toggle between
auto and manual sort — this spec is the "smart" algorithm. Needs a defined scoring
formula (open question).

## 2. Cold storage lifecycle

- Cluster unused for **4 months** → auto-moves to **cold storage**, gets "zipped"
  (compressed/archived representation, not shown in active memory/board view).
- Cold clusters do not count against active view load.
- **Unfreeze**: user can pull a cold cluster back to active. On unfreeze it gets
  **top priority** temporarily.
- If the unfrozen cluster then goes unused again, it decays — drops in priority and
  eventually cycles back to cold storage (same 4-month idle rule, or possibly faster
  — open question).
- **Floating**: if a cluster has no folder/category to belong to, it goes to a
  **floating** bucket instead of being orphaned.

Existing schema groundwork: `Cluster.status` (`"active" | "cold" | "binned"`) and
`Cluster.binnedAt`, plus `Task.cold` boolean and `Task.binnedAt`. Cold-storage-as-status
concept already exists for clusters; "floating" and the 4-month idle timer / decay job
do not exist yet.

## 3. Star (priority marker)

A star toggle to mark a cluster/task as high priority. Interacts with auto-sort
(section 1) and with unfreeze-boost (section 2).

## 4. Calendar integration

- Add a calendar view/option.
- Only tasks with a tagged date/time show up on the calendar (tasks without a
  deadline/time tag are excluded).
- Sync target: Google Calendar first (or "any one" — i.e. design for one provider,
  structured so others could be added later).
- Existing `Task.deadline` (`DateTime? @db.Date`, date-only) may need a time
  component added if calendar events require time-of-day, not just a date.

## 5. Notes (private / public)

- Notes attach to... (task? cluster? both? — open question, not stated explicitly).
- Visibility: **private** or **public**.
  - Private notes are invisible to every other user, **even if the parent
    task/cluster/workspace is shared** with them. Private is per-author, not
    per-workspace-membership.
- Content types to support:
  - plain text
  - voice notes (audio recording/upload)
  - links, with link preview (title/image/description fetch)
  - photos and videos
  - social media links (special-cased preview? or just links)
  - code (syntax-highlighted blocks)
  - rich text (formatted text, not just markdown-plain)
  - tables

This is a materially new subsystem: new `Note` model, attachment storage, link-preview
fetcher, rich text editor, audio recorder/player, code block renderer.

## 6. Storage quota

- **10 GB per user**, enforced across whatever the user uploads (notes' photos,
  videos, voice notes, etc.).
- Needs: storage backend (Supabase Storage is the natural fit given current stack),
  per-user usage tracking/counter, and enforcement at upload time.

## 7. Platform priorities

- **Mobile is the primary target** — build/design mobile-first.
- **Desktop** is specifically for "the cluttering fixes" — i.e. desktop UI is where
  bulk organization/cleanup workflows (declutter, re-sort, bin management) should live,
  vs. mobile being the everyday capture/use surface.

## Open questions (need answers before implementation)

1. Auto-sort scoring formula — exact weights/inputs for usability vs priority vs custom.
2. Does the cold-storage 4-month timer apply to clusters only, or also individual tasks
   (schema already has `Task.cold` too)?
3. After unfreeze-then-idle-again, is the re-freeze timer still 4 months, or shorter?
4. What writes `clusters.last_used_at` — any task edit inside it, or only opening it?
5. Where does the idle sweep run — extend `purgeBin()` on page load, or a pg_cron job?
6. Calendar is currently a per-event "Add to Google Calendar" link. Two-way OAuth sync
   (per-user connection, token storage, refresh) is a separate build if wanted.
7. "Social media links and all" — link previews use generic OpenGraph tags today; real
   tweet/Instagram embeds would need per-platform handling.

**Answered:** notes attach to a task *or* a cluster (exactly one, DB-enforced); storage
quota hard-blocks the upload at 10 GB with the meter visible in every notes panel.
