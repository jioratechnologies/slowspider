"use server";

import { cookies } from "next/headers";
import { createClient } from "./supabase/server";
import { backend, getAccessToken } from "./backend-client";

// Used to call ./services/workspace.ts in-process; now calls apps/backend's /v1/workspace/**
// routes through Kong instead (same endpoints apps/mobile/src/api.ts already uses, plus two
// small additions — GET /v1/workspace/my-invites and POST /v1/workspace/my-invites/:id/decline
// — added to apps/backend alongside this change since the underlying service methods already
// existed there but weren't wired to a route yet).

const WORKSPACE_COOKIE = "active_workspace_id";

async function requireUser(): Promise<{ id: string; email: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { id: user.id, email: user.email || "" };
}

async function requireAuth(): Promise<{ userId: string; token: string; workspaceId?: number }> {
  const { id: userId } = await requireUser();
  const token = await getAccessToken();
  const cookieStore = await cookies();
  const fromCookie = Number(cookieStore.get(WORKSPACE_COOKIE)?.value);
  return { userId, token, workspaceId: fromCookie || undefined };
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function fail(e: unknown): ActionResult {
  return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
}

// ---- types (previously re-exported from ./services/workspace.ts) ----
export interface Workspace {
  id: number;
  name: string;
  owner_id: string;
  created_at: string;
}
export interface WorkspaceRef extends Workspace {
  role: "owner" | "editor";
}
export interface MemberRow {
  userId: string;
  email: string | null;
  role: "owner" | "editor";
  joinedAt: string;
}
export interface InviteRow {
  id: number;
  workspace_id: number;
  email: string;
  status: string;
  created_at: string;
  expires_at: string;
}
export interface PendingInviteForUser {
  id: number;
  workspaceId: number;
  workspaceName: string;
  invitedByEmail: string | null;
  token: string;
  createdAt: string;
}

export async function inviteCollaborator(email: string): Promise<ActionResult> {
  try {
    const { token, workspaceId } = await requireAuth();
    await backend.auth("/v1/workspace/invite", { token, workspaceId }, { method: "POST", body: { email } });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function listCollaborators(): Promise<{ ok: true; members: MemberRow[]; invites: InviteRow[] } | { ok: false; error: string }> {
  try {
    const { token, workspaceId } = await requireAuth();
    const result = await backend.auth<{ members: MemberRow[]; invites: InviteRow[] }>("/v1/workspace/members", { token, workspaceId });
    return { ok: true, ...result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function removeCollaborator(targetUserId: string): Promise<ActionResult> {
  try {
    const { token, workspaceId } = await requireAuth();
    await backend.auth(`/v1/workspace/members/${targetUserId}`, { token, workspaceId }, { method: "DELETE" });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function revokeCollaboratorInvite(inviteId: number): Promise<ActionResult> {
  try {
    const { token, workspaceId } = await requireAuth();
    await backend.auth(`/v1/workspace/invite/${inviteId}`, { token, workspaceId }, { method: "DELETE" });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function acceptWorkspaceInvite(token: string): Promise<ActionResult> {
  try {
    const { token: accessToken, workspaceId } = await requireAuth();
    const result = await backend.auth<{ workspaceId: number }>(
      "/v1/workspace/accept",
      { token: accessToken, workspaceId },
      { method: "POST", body: { token } }
    );
    const cookieStore = await cookies();
    cookieStore.set(WORKSPACE_COOKIE, String(result.workspaceId), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function listMyPendingInvites(): Promise<{ ok: true; invites: PendingInviteForUser[] } | { ok: false; error: string }> {
  try {
    const { token, workspaceId } = await requireAuth();
    const result = await backend.auth<{ invites: PendingInviteForUser[] }>("/v1/workspace/my-invites", { token, workspaceId });
    return { ok: true, invites: result.invites };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function declineMyInvite(inviteId: number): Promise<ActionResult> {
  try {
    const { token, workspaceId } = await requireAuth();
    await backend.auth(`/v1/workspace/my-invites/${inviteId}/decline`, { token, workspaceId }, { method: "POST" });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function listMyWorkspacesAction(): Promise<{ ok: true; workspaces: WorkspaceRef[] } | { ok: false; error: string }> {
  try {
    const { token, workspaceId } = await requireAuth();
    const result = await backend.auth<{ workspaces: WorkspaceRef[] }>("/v1/workspace", { token, workspaceId });
    return { ok: true, workspaces: result.workspaces };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function createWorkspaceAction(name: string): Promise<ActionResult> {
  try {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Give the workspace a name.");
    const { token, workspaceId: activeWorkspaceId } = await requireAuth();
    const ws = await backend.auth<Workspace>("/v1/workspace", { token, workspaceId: activeWorkspaceId }, { method: "POST", body: { name: trimmed } });
    const cookieStore = await cookies();
    cookieStore.set(WORKSPACE_COOKIE, String(ws.id), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function renameWorkspaceAction(workspaceId: number, name: string): Promise<ActionResult> {
  try {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Give the workspace a name.");
    const { token, workspaceId: activeWorkspaceId } = await requireAuth();
    await backend.auth(`/v1/workspace/${workspaceId}`, { token, workspaceId: activeWorkspaceId }, { method: "PATCH", body: { name: trimmed } });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function switchWorkspaceAction(workspaceId: number): Promise<ActionResult> {
  try {
    const { token, workspaceId: activeWorkspaceId } = await requireAuth();
    const mine = await backend.auth<{ workspaces: WorkspaceRef[] }>("/v1/workspace", { token, workspaceId: activeWorkspaceId });
    if (!mine.workspaces.some((w) => w.id === workspaceId)) throw new Error("You don't have access to that workspace.");
    const cookieStore = await cookies();
    cookieStore.set(WORKSPACE_COOKIE, String(workspaceId), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
