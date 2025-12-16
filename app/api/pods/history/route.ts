import { NextRequest, NextResponse } from "next/server";
import { podsDbService } from "@/services/pods-db.service";
import { Logger } from "@/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/pods/history
 * Query params:
 *  - address: specific pod address (optional)
 *  - hours: hours to look back (default: 24)
 *  - startTime: ISO timestamp (optional)
 *  - endTime: ISO timestamp (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get("address");
    const hours = parseInt(searchParams.get("hours") || "24", 10);
    const startTimeParam = searchParams.get("startTime");
    const endTimeParam = searchParams.get("endTime");

    // Calculate time range
    const endTime = endTimeParam ? new Date(endTimeParam) : new Date();
    const startTime = startTimeParam
      ? new Date(startTimeParam)
      : new Date(endTime.getTime() - hours * 60 * 60 * 1000);

    if (address) {
      // Get specific pod history
      const history = await podsDbService.getPodHistory(
        address,
        startTime,
        endTime,
      );

      return NextResponse.json({
        address,
        history,
        count: history.length,
        startTime,
        endTime,
      });
    } else {
      // Get network-wide statistics
      const networkHistory = await podsDbService.getNetworkHistory(
        startTime,
        endTime,
      );

      return NextResponse.json({
        networkHistory,
        count: networkHistory.length,
        startTime,
        endTime,
      });
    }
  } catch (error) {
    Logger.error("Failed to fetch history", { error });

    return NextResponse.json(
      {
        error: "Failed to fetch history",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
