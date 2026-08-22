import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { fetchBoardData, fetchSortMode, purgeBin } from "@/lib/queries";
import { getDefaultWorkspaceId, listMyWorkspaces } from "@/lib/services/workspace";
import SignIn from "@/components/auth/SignIn";
import Board from "@/components/board/Board";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <SignIn />;
  }

  const cookieStore = await cookies();
  const fromCookie = Number(cookieStore.get("active_workspace_id")?.value);
  const workspaceId = fromCookie || (await getDefaultWorkspaceId(user.id));

  if (!workspaceId) {
    // Shouldn't happen — every account gets a workspace at signup — but fail safe rather
    // than crash if one somehow slipped through without one.
    return <SignIn />;
  }

  await purgeBin();
  const [board, sortMode, workspaces] = await Promise.all([
    fetchBoardData(workspaceId, user.id),
    fetchSortMode(user.id, workspaceId),
    listMyWorkspaces(user.id),
  ]);

  return (
    <Board
      key={workspaceId}
      userId={user.id}
      userEmail={user.email || ""}
      workspaceId={workspaceId}
      workspaces={workspaces}
      initialData={board}
      initialSortMode={sortMode}
    />
  );
}
