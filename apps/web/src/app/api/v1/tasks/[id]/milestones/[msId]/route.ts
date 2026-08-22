import { withApiAuth } from "@/lib/api/handler";
import { updateMilestone, deleteMilestone } from "@/lib/services/board";

export const PATCH = withApiAuth(async (req, { token, params }) => {
  const patch = await req.json();
  await updateMilestone(token, Number(params.msId), patch);
  return { updated: true };
});

export const DELETE = withApiAuth(async (_req, { token, params }) => {
  await deleteMilestone(token, Number(params.msId));
  return { deleted: true };
});
