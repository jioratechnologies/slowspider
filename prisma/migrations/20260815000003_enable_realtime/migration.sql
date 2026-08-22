-- useRealtimeBoard.ts subscribes to postgres_changes on these four tables, but Supabase
-- only broadcasts changes for tables explicitly added to the supabase_realtime publication
-- (normally a dashboard checkbox under Database > Replication) — doing it here instead so
-- `db:migrate` is the one thing that keeps the whole DB in sync, no manual dashboard step.
do $$
declare
  t text;
begin
  foreach t in array array['categories', 'clusters', 'tasks', 'milestones'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
