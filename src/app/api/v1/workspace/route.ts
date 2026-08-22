import { withApiAuth } from "@/lib/api/handler";
import { createDefaultWorkspace, listMyWorkspaces } from "@/lib/services/workspace";

export const GET = withApiAuth(async (_req, { userId }) => {
  return { workspaces: await listMyWorkspaces(userId) };
});

export const POST = withApiAuth(async (req, { userId }) => {
  const { name } = await req.json();
  const trimmed = (name || "").trim();
  if (!trimmed) throw new Error("Give the workspace a name.");
  return createDefaultWorkspace(userId, trimmed);
});
