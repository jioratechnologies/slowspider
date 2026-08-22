import { withApiAuth } from "@/lib/api/handler";
import { updateCategory, deleteCategory } from "@/lib/services/board";

export const PATCH = withApiAuth(async (req, { token, workspaceId, params }) => {
  const patch = await req.json();
  await updateCategory(token, workspaceId, Number(params.id), patch);
  return { updated: true };
});

export const DELETE = withApiAuth(async (_req, { token, workspaceId, params }) => {
  await deleteCategory(token, workspaceId, Number(params.id));
  return { deleted: true };
});
