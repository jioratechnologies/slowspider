-- Collaboration: move ownership from a single user_id to a workspace with members, and
-- switch identity to Supabase Auth (auth.users) so RLS + Realtime can actually authorize
-- against a real Supabase JWT — NextAuth's cookie session never could.
--
-- Existing accounts: run scripts/migrate-users-to-supabase-auth.ts once after this migration
-- to create matching auth.users rows, a personal workspace per user, and backfill
-- workspace_id on their existing rows. Until that script runs, existing categories/
-- clusters/tasks/milestones rows have no workspace_id and are invisible under RLS — expected,
-- they become visible again the moment the script backfills them.
--
-- This migration deliberately keeps the legacy bigint user_id columns and the renamed
-- users_legacy table around — the backfill script still needs to read them. Once that
-- script has run and been verified, run `npx prisma migrate dev --name finalize_workspace_cleanup`:
-- prisma/schema.prisma already describes the final shape without any of this legacy state,
-- so Prisma will diff the live DB against it and generate the drop-everything-legacy
-- migration automatically.

-- ---- profile table, recreated keyed by the Supabase Auth uuid ----
-- Renaming a table does NOT rename its indexes/constraints in Postgres — the old table's
-- implicitly-named pkey/unique/index would otherwise collide with the new table's identically-
-- named ones below, so they're explicitly renamed out of the way first.
alter table public.users rename to users_legacy;
alter table public.users_legacy rename constraint users_pkey to users_legacy_pkey;
alter table public.users_legacy rename constraint users_email_key to users_legacy_email_key;
alter index public.users_email_idx rename to users_legacy_email_idx;
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);
create index users_email_idx on public.users (lower(email));

-- Auto-create a profile row whenever a new auth.users row appears (covers both
-- supabase.auth.admin.createUser() during our OTP-gated signup, and any future direct
-- Supabase Auth signup path).
create function public.handle_new_auth_user()
returns trigger as $$
begin
  insert into public.users (id, email) values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---- workspaces ----
create table public.workspaces (
  id bigint generated always as identity primary key,
  name text not null default 'My Workspace',
  owner_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor')),
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_id_idx on public.workspace_members (user_id);

create table public.workspace_invites (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  email text not null,
  invited_by uuid not null references public.users(id) on delete cascade,
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days')
);
create index workspace_invites_token_idx on public.workspace_invites (token);
create index workspace_invites_workspace_id_idx on public.workspace_invites (workspace_id);

-- ---- board tables: move from user-owned to workspace-owned ----
alter table public.categories
  add column workspace_id bigint references public.workspaces(id) on delete cascade,
  add column created_by uuid references public.users(id) on delete set null;
alter table public.clusters
  add column workspace_id bigint references public.workspaces(id) on delete cascade,
  add column created_by uuid references public.users(id) on delete set null;
alter table public.tasks
  add column workspace_id bigint references public.workspaces(id) on delete cascade,
  add column created_by uuid references public.users(id) on delete set null;
alter table public.milestones
  add column workspace_id bigint references public.workspaces(id) on delete cascade;

create index categories_workspace_id_idx on public.categories (workspace_id);
create index clusters_workspace_id_idx on public.clusters (workspace_id);
create index tasks_workspace_id_idx on public.tasks (workspace_id);
create index milestones_workspace_id_idx on public.milestones (workspace_id);

-- ---- user_settings: per person, per workspace ----
-- Surrogate id PK instead of a composite one, so this table doesn't sit without a usable
-- primary key between now and the finalize migration — also gives saveSortMode's
-- upsert(..., { onConflict: "user_id,workspace_id" }) a real unique constraint to target
-- immediately, not just after a later manual step.
alter table public.user_settings drop constraint user_settings_pkey;
alter table public.user_settings
  drop column user_id,
  add column id bigint generated always as identity,
  add column user_id uuid references public.users(id) on delete cascade,
  add column workspace_id bigint references public.workspaces(id) on delete cascade;
alter table public.user_settings add primary key (id);
create unique index user_settings_user_workspace_uniq on public.user_settings (user_id, workspace_id);

-- ---- RLS: the real enforcement boundary now ----
alter table public.users enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;

create policy "self or workspace-mates readable" on public.users
  for select using (
    id = auth.uid()
    or exists (
      select 1 from public.workspace_members wm1
      join public.workspace_members wm2 on wm1.workspace_id = wm2.workspace_id
      where wm1.user_id = auth.uid() and wm2.user_id = public.users.id
    )
  );

create policy "members can read their workspaces" on public.workspaces
  for select using (
    exists (select 1 from public.workspace_members where workspace_id = workspaces.id and user_id = auth.uid())
  );
create policy "owner can update workspace" on public.workspaces
  for update using (owner_id = auth.uid());

create policy "members can read membership" on public.workspace_members
  for select using (
    exists (select 1 from public.workspace_members me where me.workspace_id = workspace_members.workspace_id and me.user_id = auth.uid())
  );

create policy "workspace owner manages invites" on public.workspace_invites
  for all using (
    exists (select 1 from public.workspaces w where w.id = workspace_invites.workspace_id and w.owner_id = auth.uid())
  );

do $$
declare
  t text;
begin
  foreach t in array array['categories', 'clusters', 'tasks', 'milestones'] loop
    execute format(
      'create policy "workspace members full access" on public.%I for all using (
         exists (select 1 from public.workspace_members where workspace_id = %I.workspace_id and user_id = auth.uid())
       ) with check (
         exists (select 1 from public.workspace_members where workspace_id = %I.workspace_id and user_id = auth.uid())
       )',
      t, t, t
    );
  end loop;
end $$;

alter table public.user_settings enable row level security;
create policy "own settings in own workspaces" on public.user_settings
  for all using (
    user_id = auth.uid()
    and exists (select 1 from public.workspace_members where workspace_id = user_settings.workspace_id and user_id = auth.uid())
  );
