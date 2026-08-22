import { NextResponse } from "next/server";
import { runDailyColdStorageCron } from "@/lib/services/board";

export const dynamic = "force-dynamic";

/**
 * Daily Maintenance Cron Handler
 * Executes daily at 00:00 UTC (or triggered on demand)
 * 1. Checks all clusters inactive for > 4 months (120 days) and archives them to Cold Storage.
 * 2. Compresses & flags associated cloud storage assets to free up active quota.
 * 3. Purges items in Dump Bin for > 14 days.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Protect the route if CRON_SECRET is configured
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDailyColdStorageCron();
    return NextResponse.json({
      success: true,
      message: "Daily cold storage & archive cron job executed successfully",
      ...result,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Cron job execution failed";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
