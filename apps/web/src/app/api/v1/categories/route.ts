import { withApiAuth } from "@/lib/api/handler";
import { insertCategory } from "@/lib/services/board";

export const POST = withApiAuth(async (req, { token, workspaceId }) => {
  const input = await req.json();
  return insertCategory(token, workspaceId, input);
});
