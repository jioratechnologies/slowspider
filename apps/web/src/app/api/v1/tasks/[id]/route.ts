import { withApiAuth } from "@/lib/api/handler";
import { updateTask, deleteTaskForever } from "@/lib/services/board";

export const PATCH = withApiAuth(async (req, { token, workspaceId, params }) => {
  const patch = await req.json();
  await updateTask(token, workspaceId, Number(params.id), patch);
  return { updated: true };
});

export const DELETE = withApiAuth(async (_req, { token, workspaceId, params }) => {
  await deleteTaskForever(token, workspaceId, Number(params.id));
  return { deleted: true };
});
