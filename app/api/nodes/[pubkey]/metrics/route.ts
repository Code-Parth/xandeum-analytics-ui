import { NextRequest, NextResponse } from "next/server";
import { podsDbService } from "@/services/pods-db.service";
import { Logger } from "@/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/nodes/[pubkey]/metrics
 * Query params:
 *  - hours: hours to look back (default: 24)
 *  - startTime: ISO timestamp (optional)
 *  - endTime: ISO timestamp (optional)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ pubkey: string }> },
) {
  const { pubkey } = await context.params;

  if (!pubkey) {
    return NextResponse.json(
      { error: "Missing pubkey parameter" },
      { status: 400 },
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const hours = parseInt(searchParams.get("hours") || "24", 10);
    const startTimeParam = searchParams.get("startTime");
    const endTimeParam = searchParams.get("endTime");

    const endTime = endTimeParam ? new Date(endTimeParam) : new Date();
    const startTime = startTimeParam
      ? new Date(startTimeParam)
      : new Date(endTime.getTime() - hours * 60 * 60 * 1000);

    const history = await podsDbService.getPodHistoryByPubkey(
      pubkey,
      startTime,
      endTime,
    );

    return NextResponse.json({
      pubkey,
      history,
      count: history.length,
      startTime,
      endTime,
    });
  } catch (error) {
    Logger.error("Failed to fetch node metrics", { pubkey, error });

    return NextResponse.json(
      {
        error: "Failed to fetch node metrics",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
