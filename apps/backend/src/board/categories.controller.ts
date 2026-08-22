import { Body, Controller, Delete, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ApiContext } from "../common/api-context.interface";
import { BoardService } from "./board.service";

// Port of apps/web's src/app/api/v1/categories/route.ts + categories/[id]/route.ts.
@Controller("v1/categories")
export class CategoriesController {
  constructor(private readonly board: BoardService) {}

  // POST /v1/categories
  @Post()
  async create(@CurrentUser() ctx: ApiContext, @Body() input: { name: string; color: string; pos: number }) {
    return this.board.insertCategory(ctx.token, ctx.workspaceId, input);
  }

  // PATCH /v1/categories/:id
  @Patch(":id")
  async update(@CurrentUser() ctx: ApiContext, @Param("id") id: string, @Body() patch: any) {
    await this.board.updateCategory(ctx.token, ctx.workspaceId, Number(id), patch);
    return { updated: true };
  }

  // DELETE /v1/categories/:id
  @Delete(":id")
  async remove(@CurrentUser() ctx: ApiContext, @Param("id") id: string) {
    await this.board.deleteCategory(ctx.token, ctx.workspaceId, Number(id));
    return { deleted: true };
  }
}
