import { withApiAuth } from "@/lib/api/handler";
import { fetchBoardData, fetchSortMode, purgeBin } from "@/lib/queries";

export const GET = withApiAuth(async (_req, { userId, workspaceId }) => {
  await purgeBin();
  const [board, sortMode] = await Promise.all([fetchBoardData(workspaceId, userId), fetchSortMode(userId, workspaceId)]);
  return { ...board, sortMode, workspaceId };
});
