import { withApiAuth } from "@/lib/api/handler";
import { updateNote, deleteNote } from "@/lib/services/board";

export const PATCH = withApiAuth(async (req, { token, workspaceId, params }) => {
  const patch = await req.json();
  await updateNote(token, workspaceId, Number(params.id), patch);
  return { updated: true };
});

export const DELETE = withApiAuth(async (_req, { token, workspaceId, params }) => {
  await deleteNote(token, workspaceId, Number(params.id));
  return { deleted: true };
});
