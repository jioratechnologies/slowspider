import { withApiAuth } from "@/lib/api/handler";
import { insertCluster } from "@/lib/services/board";

export const POST = withApiAuth(async (req, { token, workspaceId }) => {
  const input = await req.json();
  return insertCluster(token, workspaceId, input);
});
