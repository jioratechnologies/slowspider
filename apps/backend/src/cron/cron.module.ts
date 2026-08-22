import { Module } from "@nestjs/common";
import { CronController } from "./cron.controller";
import { BoardModule } from "../board/board.module";

@Module({
  imports: [BoardModule], // runDailyColdStorageCron
  controllers: [CronController],
})
export class CronModule {}
