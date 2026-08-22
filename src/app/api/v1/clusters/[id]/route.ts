import { withApiAuth } from "@/lib/api/handler";
import { updateCluster, deleteClusterForever } from "@/lib/services/board";

export const PATCH = withApiAuth(async (req, { token, workspaceId, params }) => {
  const patch = await req.json();
  await updateCluster(token, workspaceId, Number(params.id), patch);
  return { updated: true };
});

export const DELETE = withApiAuth(async (_req, { token, workspaceId, params }) => {
  await deleteClusterForever(token, workspaceId, Number(params.id));
  return { deleted: true };
});
