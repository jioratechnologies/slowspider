import { Body, Controller, Delete, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ApiContext } from "../common/api-context.interface";
import { BoardService } from "./board.service";

// Port of apps/web's src/app/api/v1/clusters/route.ts + clusters/[id]/route.ts +
// clusters/reorder/route.ts.
@Controller("v1/clusters")
export class ClustersController {
  constructor(private readonly board: BoardService) {}

  // POST /v1/clusters
  @Post()
  async create(@CurrentUser() ctx: ApiContext, @Body() input: { name: string; color: string; category_id: number | null; pos: number }) {
    return this.board.insertCluster(ctx.token, ctx.workspaceId, input);
  }

  // POST /v1/clusters/reorder
  @Post("reorder")
  async reorder(@CurrentUser() ctx: ApiContext, @Body() body: { updates: { id: number; pos: number }[] }) {
    await this.board.batchUpdatePos(ctx.token, ctx.workspaceId, "clusters", body.updates);
    return { updated: true };
  }

  // PATCH /v1/clusters/:id
  @Patch(":id")
  async update(@CurrentUser() ctx: ApiContext, @Param("id") id: string, @Body() patch: any) {
    await this.board.updateCluster(ctx.token, ctx.workspaceId, Number(id), patch);
    return { updated: true };
  }

  // DELETE /v1/clusters/:id
  @Delete(":id")
  async remove(@CurrentUser() ctx: ApiContext, @Param("id") id: string) {
    await this.board.deleteClusterForever(ctx.token, ctx.workspaceId, Number(id));
    return { deleted: true };
  }
}
