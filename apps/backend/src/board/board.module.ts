import { Module } from "@nestjs/common";
import { BoardController } from "./board.controller";
import { CategoriesController } from "./categories.controller";
import { ClustersController } from "./clusters.controller";
import { TasksController } from "./tasks.controller";
import { SettingsController } from "./settings.controller";
import { BoardService } from "./board.service";

// Groups board, categories, clusters, tasks, milestones, and settings/sort-mode — all the
// resources whose apps/web route handlers were thin wrappers around src/lib/services/board.ts
// (plus src/lib/queries.ts for the board GET). CronModule also depends on BoardService
// (runDailyColdStorageCron), so it's exported.
@Module({
  controllers: [BoardController, CategoriesController, ClustersController, TasksController, SettingsController],
  providers: [BoardService],
  exports: [BoardService],
})
export class BoardModule {}
