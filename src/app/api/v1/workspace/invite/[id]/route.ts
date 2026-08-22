import { withApiAuth } from "@/lib/api/handler";
import { revokeInvite } from "@/lib/services/workspace";

export const DELETE = withApiAuth(async (_req, { userId, workspaceId, params }) => {
  await revokeInvite(workspaceId, userId, Number(params.id));
  return { revoked: true };
});
