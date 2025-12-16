import { NextResponse } from "next/server";
import { podsDbService } from "@/services/pods-db.service";
import { Logger } from "@/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/pods/latest
 * Returns the most recent snapshot of all pods
 */
export async function GET() {
  try {
    const pods = await podsDbService.getLatestSnapshot();

    return NextResponse.json({
      pods,
      count: pods.length,
      timestamp: pods[0]?.snapshotTimestamp || new Date(),
    });
  } catch (error) {
    Logger.error("Failed to fetch latest pods", { error });

    return NextResponse.json(
      {
        error: "Failed to fetch latest pods",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
