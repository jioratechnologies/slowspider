import { Controller, Get, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { Public } from "../common/decorators/public.decorator";
import { BoardService } from "../board/board.service";

// Port of apps/web's src/app/api/cron/cold-storage/route.ts. That route bypasses withApi's
// { ok, data } envelope entirely (calls NextResponse.json directly with its own shape), so
// this controller does the same: it writes the response itself via @Res() rather than
// returning a value, which sidesteps the global ResponseInterceptor/AllExceptionsFilter
// (registered in main.ts) that every other controller in this app goes through.
@Public() // auth is CRON_SECRET header, not a Supabase bearer token
@Controller("cron/cold-storage")
export class CronController {
  constructor(private readonly board: BoardService) {}

  // GET /cron/cold-storage
  @Get()
  async run(@Req() req: Request, @Res() res: Response) {
    const authHeader = req.headers["authorization"];
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const result = await this.board.runDailyColdStorageCron();
      res.status(200).json({
        success: true,
        message: "Daily cold storage & archive cron job executed successfully",
        ...result,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Cron job execution failed";
      res.status(500).json({ success: false, error: msg });
    }
  }
}
