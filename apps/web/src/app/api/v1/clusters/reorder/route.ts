import { withApiAuth } from "@/lib/api/handler";
import { batchUpdatePos } from "@/lib/services/board";

export const POST = withApiAuth(async (req, { token, workspaceId }) => {
  const { updates } = await req.json();
  await batchUpdatePos(token, workspaceId, "clusters", updates);
  return { updated: true };
});
