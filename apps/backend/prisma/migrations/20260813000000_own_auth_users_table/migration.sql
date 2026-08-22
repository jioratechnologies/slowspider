-- Dropping Supabase Auth dependency: own users table + credentials/OTP auth via NextAuth.
-- All 5 prior tables were empty (pre-launch), so a clean rebuild is safe.
drop table if exists public.milestones cascade;
drop table if exists public.tasks cascade;
drop table if exists public.clusters cascade;
drop table if exists public.categories cascade;
drop table if exists public.user_settings cascade;

create table public.users (
  id bigint generated always as identity primary key,
  email text not null unique,
  password_hash text,             -- null until signup OTP is verified and a password is set
  email_verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index users_email_idx on public.users (lower(email));

create table public.categories (
  id bigint generated always as identity primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  name text not null,
  color text not null,
  pos integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.clusters (
  id bigint generated always as identity primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  name text not null,
  color text not null,
  category_id bigint references public.categories(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'cold', 'binned')),
  binned_at timestamptz,
  pos integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id bigint generated always as identity primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  cluster_id bigint references public.clusters(id) on delete cascade,
  title text not null default '',
  priority text not null default 'none' check (priority in ('high', 'med', 'low', 'none')),
  deadline date,
  notes text not null default '',
  done boolean not null default false,
  cold boolean not null default false,
  binned boolean not null default false,
  binned_at timestamptz,
  pos double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.milestones (
  id bigint generated always as identity primary key,
  task_id bigint not null references public.tasks(id) on delete cascade,
  user_id bigint not null references public.users(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  pos integer not null default 0
);

create table public.user_settings (
  user_id bigint primary key references public.users(id) on delete cascade,
  sort_mode text not null default 'smart' check (sort_mode in ('smart', 'manual'))
);

create index categories_user_id_idx on public.categories (user_id);
create index clusters_user_id_idx on public.clusters (user_id);
create index clusters_category_id_idx on public.clusters (category_id);
create index tasks_user_id_idx on public.tasks (user_id);
create index tasks_cluster_id_idx on public.tasks (cluster_id);
create index tasks_open_deadline_idx on public.tasks (deadline) where deadline is not null and not done;
create index milestones_task_id_idx on public.milestones (task_id);
create index milestones_user_id_idx on public.milestones (user_id);

-- RLS stays on as defense-in-depth, but with NO policies for anon/authenticated: this app
-- no longer authenticates to Postgres as a Supabase-JWT principal (NextAuth issues its own
-- session, not a Supabase JWT), so those roles get nothing. All real access goes through
-- the server using the service_role key (which bypasses RLS), with every query explicitly
-- scoped to the signed-in user's id in application code.
alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.clusters enable row level security;
alter table public.tasks enable row level security;
alter table public.milestones enable row level security;
alter table public.user_settings enable row level security;
