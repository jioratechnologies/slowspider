import { withApiAuth } from "@/lib/api/handler";
import { removeMember } from "@/lib/services/workspace";

export const DELETE = withApiAuth(async (_req, { userId, workspaceId, params }) => {
  await removeMember(workspaceId, userId, params.userId);
  return { removed: true };
});
