-- Two real bugs from the previous migration, found live:
--
-- 1. "infinite recursion detected in policy for relation workspace_members" — its own
--    SELECT policy queried workspace_members from inside itself (a raw subquery on the
--    same table the policy protects), and every other table's policy also queries
--    workspace_members to check membership, so the recursion took everything down with it.
--    Fix: a SECURITY DEFINER helper function. Its internal query runs as the function
--    owner, bypassing RLS entirely, so checking membership from inside a policy no longer
--    re-triggers that same policy.
--
-- 2. "null value in column user_id of relation tasks violates not-null constraint" — the
--    legacy bigint user_id column (kept for the backfill script) is still NOT NULL from the
--    original migration. New workspace-scoped inserts never set it. Relaxing it to nullable
--    now doesn't affect the backfill script, which only reads it.

create or replace function public.is_workspace_member(p_workspace_id bigint, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id and user_id = p_user_id
  );
$$;

-- ---- workspace_members: the actually-recursive one ----
drop policy "members can read membership" on public.workspace_members;
create policy "members can read membership" on public.workspace_members
  for select using (public.is_workspace_member(workspace_id, auth.uid()));

-- ---- workspaces: transitively hit the recursion via its subquery into workspace_members ----
drop policy "members can read their workspaces" on public.workspaces;
create policy "members can read their workspaces" on public.workspaces
  for select using (public.is_workspace_member(id, auth.uid()));

-- ---- users: same transitive issue (double subquery into workspace_members) ----
drop policy "self or workspace-mates readable" on public.users;
create policy "self or workspace-mates readable" on public.users
  for select using (
    id = auth.uid()
    or exists (
      select 1 from public.workspace_members wm
      where wm.user_id = auth.uid() and public.is_workspace_member(wm.workspace_id, public.users.id)
    )
  );

-- ---- board tables: same fix, now via the non-recursive helper ----
do $$
declare
  t text;
begin
  foreach t in array array['categories', 'clusters', 'tasks', 'milestones'] loop
    execute format('drop policy "workspace members full access" on public.%I', t);
    execute format(
      'create policy "workspace members full access" on public.%I for all using (
         public.is_workspace_member(workspace_id, auth.uid())
       ) with check (
         public.is_workspace_member(workspace_id, auth.uid())
       )',
      t
    );
  end loop;
end $$;

drop policy "own settings in own workspaces" on public.user_settings;
create policy "own settings in own workspaces" on public.user_settings
  for all using (
    user_id = auth.uid() and public.is_workspace_member(workspace_id, auth.uid())
  );

-- ---- legacy user_id columns: relax to nullable so new workspace-scoped inserts work ----
alter table public.categories alter column user_id drop not null;
alter table public.clusters alter column user_id drop not null;
alter table public.tasks alter column user_id drop not null;
alter table public.milestones alter column user_id drop not null;
