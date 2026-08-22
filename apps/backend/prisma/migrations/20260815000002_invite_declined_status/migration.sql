-- Lets an invited person decline from the in-app notification instead of just letting the
-- invite expire — distinct from "revoked" (which means the workspace owner pulled it).
alter table public.workspace_invites drop constraint workspace_invites_status_check;
alter table public.workspace_invites add constraint workspace_invites_status_check
  check (status in ('pending', 'accepted', 'revoked', 'expired', 'declined'));
