-- user_storage_used() shipped as SECURITY DEFINER taking a caller-supplied uuid, which let
-- any signed-in user total up somebody else's stored bytes by passing their id. The
-- definer rights are still needed (it sums notes rows across workspaces the request isn't
-- scoped to), so instead the function now refuses any id but the caller's.
--
-- auth.uid() is null for the service_role client used by fetchBoardData, which is trusted
-- and already scopes the id itself — that's the one case allowed to pass an arbitrary id.

create or replace function public.user_storage_used(p_user_id uuid)
returns bigint
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'not allowed to read another user''s storage usage';
  end if;
  return coalesce((select sum(size_bytes) from public.notes where created_by = p_user_id), 0)::bigint;
end;
$$;

revoke execute on function public.user_storage_used(uuid) from anon;
