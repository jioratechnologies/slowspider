import { withApiAuth } from "@/lib/api/handler";
import { insertTask } from "@/lib/services/board";

export const POST = withApiAuth(async (req, { token, workspaceId }) => {
  const input = await req.json();
  return insertTask(token, workspaceId, input);
});
