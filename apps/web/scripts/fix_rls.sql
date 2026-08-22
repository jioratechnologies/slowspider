CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id bigint)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "members can read membership" ON public.workspace_members;

CREATE POLICY "members can read membership" ON public.workspace_members
  FOR SELECT USING (
    public.is_workspace_member(workspace_members.workspace_id)
  );
