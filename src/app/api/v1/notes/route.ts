import { withApiAuth } from "@/lib/api/handler";
import { insertNote } from "@/lib/services/board";

export const POST = withApiAuth(async (req, { token, workspaceId, userId }) => {
  const input = await req.json();
  return insertNote(token, workspaceId, userId, input);
});
