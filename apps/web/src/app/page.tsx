import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { backend } from "@/lib/backend-client";
import type { WorkspaceRef } from "@/lib/workspace-actions";
import type { BoardData, SortMode } from "@/lib/types";
import SignIn from "@/components/auth/SignIn";
import Board from "@/components/board/Board";

// Used to fetch board data via ./lib/queries.ts (direct Supabase-js queries against the
// service-role client) plus ./lib/services/workspace.ts's listMyWorkspaces. Now fetches the
// same data from apps/backend's GET /v1/board (which already does the bin-purge +
// board-data + sort-mode fetch server-side, same as the old /api/v1/board route) and
// GET /v1/workspace, through Kong, same as apps/mobile.

const WORKSPACE_COOKIE = "active_workspace_id";

interface BoardPayload extends BoardData {
  sortMode: SortMode;
  workspaceId: number;
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <SignIn />;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return <SignIn />;
  }

  const cookieStore = await cookies();
  const fromCookie = Number(cookieStore.get(WORKSPACE_COOKIE)?.value);
  const auth = { token: session.access_token, workspaceId: fromCookie || undefined };

  let board: BoardPayload;
  let workspaces: WorkspaceRef[];
  try {
    const [boardResult, workspaceResult] = await Promise.all([
      backend.auth<BoardPayload>("/v1/board", auth),
      backend.auth<{ workspaces: WorkspaceRef[] }>("/v1/workspace", auth),
    ]);
    board = boardResult;
    workspaces = workspaceResult.workspaces;
  } catch {
    // Shouldn't happen — every account gets a workspace at signup — but fail safe rather
    // than crash if one somehow slipped through without one (mirrors the backend's own
    // "No workspace found for this account." guard failure).
    return <SignIn />;
  }

  return (
    <Board
      key={board.workspaceId}
      userId={user.id}
      userEmail={user.email || ""}
      workspaceId={board.workspaceId}
      workspaces={workspaces}
      initialData={{ categories: board.categories, clusters: board.clusters, tasks: board.tasks, notes: board.notes, storageUsed: board.storageUsed }}
      initialSortMode={board.sortMode}
    />
  );
}
