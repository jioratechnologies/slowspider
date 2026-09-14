import { Controller, Get } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ApiContext } from "../common/api-context.interface";
import { BoardService } from "./board.service";

// Port of apps/web's src/app/api/v1/board/route.ts.
@Controller("v1/board")
export class BoardController {
  constructor(private readonly board: BoardService) {}

  // GET /v1/board
  @Get()
  async get(@CurrentUser() ctx: ApiContext) {
    // purgeBin() is a global sweep independent of this request's response — it doesn't
    // gate fetchBoardData/fetchSortMode, so run it alongside them instead of blocking the
    // whole request on two extra round trips before the real fetch even starts.
    const [board, sortMode] = await Promise.all([
      this.board.fetchBoardData(ctx.workspaceId, ctx.userId),
      this.board.fetchSortMode(ctx.userId, ctx.workspaceId),
      this.board.purgeBin(),
    ]);
    return { ...board, sortMode, workspaceId: ctx.workspaceId };
  }
}
