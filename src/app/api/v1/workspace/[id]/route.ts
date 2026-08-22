import { withApiAuth } from "@/lib/api/handler";
import { renameWorkspace } from "@/lib/services/workspace";

export const PATCH = withApiAuth(async (req, { userId, params }) => {
  const { name } = await req.json();
  const trimmed = (name || "").trim();
  if (!trimmed) throw new Error("Give the workspace a name.");
  await renameWorkspace(Number(params.id), userId, trimmed);
  return { updated: true };
});
