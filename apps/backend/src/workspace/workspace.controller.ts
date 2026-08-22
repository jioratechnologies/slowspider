import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ApiContext } from "../common/api-context.interface";
import { WorkspaceService } from "./workspace.service";

// Port of apps/web's src/app/api/v1/workspace/**/route.ts. All authenticated (withApiAuth).
@Controller("v1/workspace")
export class WorkspaceController {
  constructor(private readonly workspace: WorkspaceService) {}

  // GET /v1/workspace
  @Get()
  async list(@CurrentUser() ctx: ApiContext) {
    return { workspaces: await this.workspace.listMyWorkspaces(ctx.userId) };
  }

  // POST /v1/workspace
  @Post()
  async create(@CurrentUser() ctx: ApiContext, @Body() body: { name?: string }) {
    const trimmed = (body?.name || "").trim();
    if (!trimmed) throw new Error("Give the workspace a name.");
    return this.workspace.createDefaultWorkspace(ctx.userId, trimmed);
  }

  // PATCH /v1/workspace/:id
  @Patch(":id")
  async rename(@CurrentUser() ctx: ApiContext, @Param("id") id: string, @Body() body: { name?: string }) {
    const trimmed = (body?.name || "").trim();
    if (!trimmed) throw new Error("Give the workspace a name.");
    await this.workspace.renameWorkspace(Number(id), ctx.userId, trimmed);
    return { updated: true };
  }

  // POST /v1/workspace/accept
  @Post("accept")
  async accept(@CurrentUser() ctx: ApiContext, @Body() body: { token?: string }) {
    return this.workspace.acceptInvite(body?.token || "", ctx.userId);
  }

  // POST /v1/workspace/invite
  @Post("invite")
  async invite(@CurrentUser() ctx: ApiContext, @Body() body: { email?: string }) {
    await this.workspace.inviteMember(ctx.workspaceId, ctx.userId, body?.email || "");
    return { invited: true };
  }

  // DELETE /v1/workspace/invite/:id
  @Delete("invite/:id")
  async revokeInvite(@CurrentUser() ctx: ApiContext, @Param("id") id: string) {
    await this.workspace.revokeInvite(ctx.workspaceId, ctx.userId, Number(id));
    return { revoked: true };
  }

  // GET /v1/workspace/members
  @Get("members")
  async members(@CurrentUser() ctx: ApiContext) {
    return this.workspace.listMembers(ctx.workspaceId, ctx.userId);
  }

  // DELETE /v1/workspace/members/:userId
  @Delete("members/:userId")
  async removeMember(@CurrentUser() ctx: ApiContext, @Param("userId") userId: string) {
    await this.workspace.removeMember(ctx.workspaceId, ctx.userId, userId);
    return { removed: true };
  }
}
