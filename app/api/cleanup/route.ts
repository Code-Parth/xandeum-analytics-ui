import { NextRequest, NextResponse } from "next/server";
import { podsDbService } from "@/services/pods-db.service";
import { Logger } from "@/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/cleanup
 * Removes snapshots older than retention period (90 days)
 * Should be called every 90 days by cron
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deletedCount = await podsDbService.cleanupOldSnapshots(90);

    Logger.info("Cleanup completed", { deletedCount });

    return NextResponse.json({
      success: true,
      deletedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    Logger.error("Cleanup failed", { error });

    return NextResponse.json(
      {
        error: "Cleanup failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
