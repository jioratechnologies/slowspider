import { withApiAuth } from "@/lib/api/handler";
import { saveSortMode } from "@/lib/services/board";
import type { SortMode } from "@/lib/types";

export const PATCH = withApiAuth(async (req, { token, userId, workspaceId }) => {
  const { sortMode } = (await req.json()) as { sortMode: SortMode };
  await saveSortMode(token, workspaceId, userId, sortMode);
  return { updated: true };
});
