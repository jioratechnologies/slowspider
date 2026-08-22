"use server";

import { cookies } from "next/headers";
import { createClient } from "./supabase/server";
import * as workspace from "./services/workspace";

const WORKSPACE_COOKIE = "active_workspace_id";

async function requireUser(): Promise<{ id: string; email: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { id: user.id, email: user.email || "" };
}
async function requireUserId(): Promise<string> {
  return (await requireUser()).id;
}

async function requireActiveWorkspaceId(userId: string): Promise<number> {
  const cookieStore = await cookies();
  const fromCookie = Number(cookieStore.get(WORKSPACE_COOKIE)?.value);
  const id = fromCookie || (await workspace.getDefaultWorkspaceId(userId));
  if (!id) throw new Error("No workspace found for this account.");
  return id;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function fail(e: unknown): ActionResult {
  return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
}

export async function inviteCollaborator(email: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const workspaceId = await requireActiveWorkspaceId(userId);
    await workspace.inviteMember(workspaceId, userId, email);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function listCollaborators(): Promise<
  { ok: true; members: workspace.MemberRow[]; invites: workspace.InviteRow[] } | { ok: false; error: string }
> {
  try {
    const userId = await requireUserId();
    const workspaceId = await requireActiveWorkspaceId(userId);
    const result = await workspace.listMembers(workspaceId, userId);
    return { ok: true, ...result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function removeCollaborator(targetUserId: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const workspaceId = await requireActiveWorkspaceId(userId);
    await workspace.removeMember(workspaceId, userId, targetUserId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function revokeCollaboratorInvite(inviteId: number): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const workspaceId = await requireActiveWorkspaceId(userId);
    await workspace.revokeInvite(workspaceId, userId, inviteId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function acceptWorkspaceInvite(token: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const { workspaceId } = await workspace.acceptInvite(token, userId);
    const cookieStore = await cookies();
    cookieStore.set(WORKSPACE_COOKIE, String(workspaceId), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function listMyPendingInvites(): Promise<
  { ok: true; invites: workspace.PendingInviteForUser[] } | { ok: false; error: string }
> {
  try {
    const { email } = await requireUser();
    const invites = await workspace.listPendingInvitesForEmail(email);
    return { ok: true, invites };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function declineMyInvite(inviteId: number): Promise<ActionResult> {
  try {
    const { email } = await requireUser();
    await workspace.declineInvite(inviteId, email);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function listMyWorkspacesAction(): Promise<
  { ok: true; workspaces: workspace.WorkspaceRef[] } | { ok: false; error: string }
> {
  try {
    const userId = await requireUserId();
    const workspaces = await workspace.listMyWorkspaces(userId);
    return { ok: true, workspaces };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function createWorkspaceAction(name: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Give the workspace a name.");
    const ws = await workspace.createDefaultWorkspace(userId, trimmed);
    const cookieStore = await cookies();
    cookieStore.set(WORKSPACE_COOKIE, String(ws.id), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function renameWorkspaceAction(workspaceId: number, name: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Give the workspace a name.");
    await workspace.renameWorkspace(workspaceId, userId, trimmed);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function switchWorkspaceAction(workspaceId: number): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const mine = await workspace.listMyWorkspaces(userId);
    if (!mine.some((w) => w.id === workspaceId)) throw new Error("You don't have access to that workspace.");
    const cookieStore = await cookies();
    cookieStore.set(WORKSPACE_COOKIE, String(workspaceId), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
