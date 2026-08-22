import { Body, Controller, Patch } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ApiContext } from "../common/api-context.interface";
import { BoardService } from "./board.service";
import type { SortMode } from "../common/types";

// Port of apps/web's src/app/api/v1/settings/sort-mode/route.ts.
@Controller("v1/settings")
export class SettingsController {
  constructor(private readonly board: BoardService) {}

  // PATCH /v1/settings/sort-mode
  @Patch("sort-mode")
  async setSortMode(@CurrentUser() ctx: ApiContext, @Body() body: { sortMode: SortMode }) {
    await this.board.saveSortMode(ctx.token, ctx.workspaceId, ctx.userId, body.sortMode);
    return { updated: true };
  }
}
