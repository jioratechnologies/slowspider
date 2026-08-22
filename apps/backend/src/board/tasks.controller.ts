import { Body, Controller, Delete, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ApiContext } from "../common/api-context.interface";
import { BoardService } from "./board.service";

// Port of apps/web's src/app/api/v1/tasks/route.ts, tasks/[id]/route.ts,
// tasks/[id]/milestones/route.ts, tasks/[id]/milestones/[msId]/route.ts.
@Controller("v1/tasks")
export class TasksController {
  constructor(private readonly board: BoardService) {}

  // POST /v1/tasks
  @Post()
  async create(@CurrentUser() ctx: ApiContext, @Body() input: { title: string; cluster_id: number | null; pos: number }) {
    return this.board.insertTask(ctx.token, ctx.workspaceId, input);
  }

  // PATCH /v1/tasks/:id
  @Patch(":id")
  async update(@CurrentUser() ctx: ApiContext, @Param("id") id: string, @Body() patch: any) {
    await this.board.updateTask(ctx.token, ctx.workspaceId, Number(id), patch);
    return { updated: true };
  }

  // DELETE /v1/tasks/:id
  @Delete(":id")
  async remove(@CurrentUser() ctx: ApiContext, @Param("id") id: string) {
    await this.board.deleteTaskForever(ctx.token, ctx.workspaceId, Number(id));
    return { deleted: true };
  }

  // POST /v1/tasks/:id/milestones
  @Post(":id/milestones")
  async addMilestone(@CurrentUser() ctx: ApiContext, @Param("id") id: string, @Body() body: { title: string; pos: number }) {
    return this.board.insertMilestone(ctx.token, ctx.workspaceId, { task_id: Number(id), title: body.title, pos: body.pos });
  }

  // PATCH /v1/tasks/:id/milestones/:msId
  @Patch(":id/milestones/:msId")
  async updateMilestone(@CurrentUser() ctx: ApiContext, @Param("msId") msId: string, @Body() patch: any) {
    await this.board.updateMilestone(ctx.token, ctx.workspaceId, Number(msId), patch);
    return { updated: true };
  }

  // DELETE /v1/tasks/:id/milestones/:msId
  @Delete(":id/milestones/:msId")
  async removeMilestone(@CurrentUser() ctx: ApiContext, @Param("msId") msId: string) {
    await this.board.deleteMilestone(ctx.token, ctx.workspaceId, Number(msId));
    return { deleted: true };
  }
}
