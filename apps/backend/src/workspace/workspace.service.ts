import { Injectable } from "@nestjs/common";
import crypto from "crypto";
import { SupabaseService } from "../common/services/supabase.service";
import { EmailService } from "../common/services/email.service";

// 1:1 port of apps/web's src/lib/services/workspace.ts. Deliberately uses the service_role
// client (SupabaseService.admin()) rather than a per-token RLS client — creating a
// workspace, adding a member, and accepting an invite are all bootstrapping operations RLS
// can't authorize on its own (there's no membership row yet to check), so these functions do
// the authorization explicitly in application code, same as the original.

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

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly email: EmailService
  ) {}

  private db() {
    return this.supabase.admin();
  }

  async createDefaultWorkspace(userId: string, name = "My Workspace"): Promise<Workspace> {
    const ws = unwrap<Workspace>(await this.db().from("workspaces").insert({ name, owner_id: userId }).select().single());
    const { error } = await this.db().from("workspace_members").insert({ workspace_id: ws.id, user_id: userId, role: "owner" });
    if (error) throw new Error(error.message);
    return ws;
  }

  async renameWorkspace(workspaceId: number, userId: string, name: string): Promise<void> {
    const { data: ws } = await this.db().from("workspaces").select("owner_id").eq("id", workspaceId).maybeSingle();
    if (!ws || ws.owner_id !== userId) throw new Error("Only the owner can rename this workspace.");
    const { error } = await this.db().from("workspaces").update({ name }).eq("id", workspaceId);
    if (error) throw new Error(error.message);
  }

  async listMyWorkspaces(userId: string): Promise<WorkspaceRef[]> {
    const { data, error } = await this.db()
      .from("workspace_members")
      .select("role, workspaces(id, name, owner_id, created_at)")
      .eq("user_id", userId)
      .order("joined_at", { ascending: true });
    if (error) throw new Error(error.message);
    type Row = { role: "owner" | "editor"; workspaces: Workspace };
    return ((data as unknown as Row[]) || []).map((r) => ({ ...r.workspaces, role: r.role }));
  }

  /** First workspace the user joined — used as the default when no workspace is explicitly selected. */
  async getDefaultWorkspaceId(userId: string): Promise<number | null> {
    const { data } = await this.db()
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .order("joined_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    return data?.workspace_id ?? null;
  }

  private async requireOwner(workspaceId: number, userId: string): Promise<void> {
    const { data } = await this.db().from("workspaces").select("owner_id").eq("id", workspaceId).maybeSingle();
    if (!data || data.owner_id !== userId) throw new Error("Only the workspace owner can do that.");
  }

  private async requireMember(workspaceId: number, userId: string): Promise<void> {
    const { data } = await this.db()
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) throw new Error("You don't have access to this workspace.");
  }

  private generateToken(): string {
    return crypto.randomBytes(24).toString("hex");
  }

  async inviteMember(workspaceId: number, inviterId: string, email: string): Promise<void> {
    await this.requireOwner(workspaceId, inviterId);
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error("Enter a valid email.");

    const { data: existingUser } = await this.db().from("users").select("id").eq("email", e).maybeSingle();
    if (existingUser) {
      const { data: alreadyMember } = await this.db()
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", existingUser.id)
        .maybeSingle();
      if (alreadyMember) throw new Error("That person is already a member.");
    }

    const token = this.generateToken();
    const { error } = await this.db().from("workspace_invites").insert({ workspace_id: workspaceId, email: e, invited_by: inviterId, token });
    if (error) throw new Error(error.message);

    const [{ data: workspace }, { data: inviter }] = await Promise.all([
      this.db().from("workspaces").select("name").eq("id", workspaceId).maybeSingle(),
      this.db().from("users").select("email").eq("id", inviterId).maybeSingle(),
    ]);
    try {
      await this.email.sendInviteEmail(e, workspace?.name || "a workspace", inviter?.email || "Someone", token);
    } catch {
      // Invite row still exists and can be resent — don't fail the whole action over email delivery.
    }
  }

  async acceptInvite(token: string, userId: string): Promise<{ workspaceId: number }> {
    const { data: invite } = await this.db().from("workspace_invites").select("*").eq("token", token).eq("status", "pending").maybeSingle();
    if (!invite) throw new Error("That invite link is invalid or has already been used.");
    if (new Date(invite.expires_at) < new Date()) throw new Error("That invite has expired.");

    const { data: alreadyMember } = await this.db()
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", invite.workspace_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!alreadyMember) {
      const { error } = await this.db().from("workspace_members").insert({ workspace_id: invite.workspace_id, user_id: userId, role: "editor" });
      if (error) throw new Error(error.message);
    }
    await this.db().from("workspace_invites").update({ status: "accepted" }).eq("id", invite.id);
    return { workspaceId: invite.workspace_id };
  }

  /** Pending invites addressed to this email — exposed via GET /v1/workspace/my-invites
   * (added in Phase 3; apps/web's Server Action version called this in-process before). */
  async listPendingInvitesForEmail(email: string): Promise<PendingInviteForUser[]> {
    const e = email.trim().toLowerCase();
    const { data, error } = await this.db()
      .from("workspace_invites")
      .select("id, workspace_id, token, created_at, workspaces(name), inviter:invited_by(email)")
      .eq("email", e)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    type Row = {
      id: number;
      workspace_id: number;
      token: string;
      created_at: string;
      workspaces: { name: string } | null;
      inviter: { email: string } | null;
    };
    return ((data as unknown as Row[]) || []).map((r) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      workspaceName: r.workspaces?.name || "Workspace",
      invitedByEmail: r.inviter?.email ?? null,
      token: r.token,
      createdAt: r.created_at,
    }));
  }

  async declineInvite(inviteId: number, userEmail: string): Promise<void> {
    const e = userEmail.trim().toLowerCase();
    const { data: invite } = await this.db().from("workspace_invites").select("email").eq("id", inviteId).maybeSingle();
    if (!invite || invite.email !== e) throw new Error("Invite not found.");
    const { error } = await this.db().from("workspace_invites").update({ status: "declined" }).eq("id", inviteId);
    if (error) throw new Error(error.message);
  }

  async listMembers(workspaceId: number, requesterId: string): Promise<{ members: MemberRow[]; invites: InviteRow[] }> {
    await this.requireMember(workspaceId, requesterId);

    const { data: members, error } = await this.db()
      .from("workspace_members")
      .select("user_id, role, joined_at, users(email)")
      .eq("workspace_id", workspaceId)
      .order("joined_at", { ascending: true });
    if (error) throw new Error(error.message);

    const { data: invites } = await this.db()
      .from("workspace_invites")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    type Row = { user_id: string; role: "owner" | "editor"; joined_at: string; users: { email: string } | null };
    return {
      members: ((members as unknown as Row[]) || []).map((m) => ({ userId: m.user_id, email: m.users?.email ?? null, role: m.role, joinedAt: m.joined_at })),
      invites: (invites as InviteRow[]) || [],
    };
  }

  async removeMember(workspaceId: number, ownerId: string, targetUserId: string): Promise<void> {
    await this.requireOwner(workspaceId, ownerId);
    if (targetUserId === ownerId) throw new Error("Owners can't remove themselves — delete the workspace instead.");
    const { error } = await this.db().from("workspace_members").delete().eq("workspace_id", workspaceId).eq("user_id", targetUserId);
    if (error) throw new Error(error.message);
  }

  async revokeInvite(workspaceId: number, ownerId: string, inviteId: number): Promise<void> {
    await this.requireOwner(workspaceId, ownerId);
    const { error } = await this.db().from("workspace_invites").update({ status: "revoked" }).eq("id", inviteId).eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
  }

  async leaveWorkspace(workspaceId: number, userId: string): Promise<void> {
    const { data } = await this.db().from("workspaces").select("owner_id").eq("id", workspaceId).maybeSingle();
    if (data?.owner_id === userId) throw new Error("Owners can't leave their own workspace — delete it instead.");
    const { error } = await this.db().from("workspace_members").delete().eq("workspace_id", workspaceId).eq("user_id", userId);
    if (error) throw new Error(error.message);
  }
}
