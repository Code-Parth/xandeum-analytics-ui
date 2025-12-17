import { NextRequest, NextResponse } from "next/server";
import { podsDbService } from "@/services/pods-db.service";
import { Logger } from "@/utils/logger";
import type { NodeHeatmapResponse } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/nodes/[pubkey]/heatmap
 * Returns activity heatmap data showing when the node is typically active
 *
 * Query params:
 *  - days: days to look back (default: 7)
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
    const days = parseInt(searchParams.get("days") || "7", 10);
    const startTimeParam = searchParams.get("startTime");
    const endTimeParam = searchParams.get("endTime");

    const endTime = endTimeParam ? new Date(endTimeParam) : new Date();
    const startTime = startTimeParam
      ? new Date(startTimeParam)
      : new Date(endTime.getTime() - days * 24 * 60 * 60 * 1000);

    const { cells, totalSnapshots } =
      await podsDbService.getNodeActivityHeatmap(pubkey, startTime, endTime);

    const response: NodeHeatmapResponse = {
      pubkey,
      cells,
      startTime,
      endTime,
      totalSnapshots,
    };

    return NextResponse.json(response);
  } catch (error) {
    Logger.error("Failed to fetch node heatmap", { pubkey, error });

    return NextResponse.json(
      {
        error: "Failed to fetch node heatmap",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
