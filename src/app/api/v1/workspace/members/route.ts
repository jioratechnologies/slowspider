import { withApiAuth } from "@/lib/api/handler";
import { listMembers } from "@/lib/services/workspace";

export const GET = withApiAuth(async (_req, { userId, workspaceId }) => {
  return listMembers(workspaceId, userId);
});
