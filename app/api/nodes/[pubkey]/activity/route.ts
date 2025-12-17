import { NextRequest, NextResponse } from "next/server";
import { podsDbService } from "@/services/pods-db.service";
import { Logger } from "@/utils/logger";
import type { NodeActivityResponse } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/nodes/[pubkey]/activity
 * Returns activity periods for a node showing when it was active vs inactive
 *
 * Query params:
 *  - hours: hours to look back (default: 24)
 *  - startTime: ISO timestamp (optional)
 *  - endTime: ISO timestamp (optional)
 *  - gapThreshold: gap threshold in minutes to consider as inactive (default: 5)
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
    const gapThresholdMinutes = parseInt(
      searchParams.get("gapThreshold") || "5",
      10,
    );

    const endTime = endTimeParam ? new Date(endTimeParam) : new Date();
    const startTime = startTimeParam
      ? new Date(startTimeParam)
      : new Date(endTime.getTime() - hours * 60 * 60 * 1000);

    const gapThresholdMs = gapThresholdMinutes * 60 * 1000;

    const addresses = await podsDbService.getNodeActivityPeriods(
      pubkey,
      startTime,
      endTime,
      gapThresholdMs,
    );

    const response: NodeActivityResponse = {
      pubkey,
      addresses,
      startTime,
      endTime,
    };

    return NextResponse.json(response);
  } catch (error) {
    Logger.error("Failed to fetch node activity", { pubkey, error });

    return NextResponse.json(
      {
        error: "Failed to fetch node activity",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
