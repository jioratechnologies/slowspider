import { withApiAuth } from "@/lib/api/handler";
import { insertMilestone } from "@/lib/services/board";

export const POST = withApiAuth(async (req, { token, workspaceId, params }) => {
  const { title, pos } = await req.json();
  return insertMilestone(token, workspaceId, { task_id: Number(params.id), title, pos });
});
