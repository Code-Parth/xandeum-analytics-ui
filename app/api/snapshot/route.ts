import { NextRequest, NextResponse } from "next/server";
import { RpcClient } from "@/services/rpc-client.service";
import { podsDbService } from "@/services/pods-db.service";
import { GetPodsWithStatsResultSchema } from "@/schemas/pod.schema";
import { Logger } from "@/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/snapshot
 * Fetches current pNode data and stores in database
 * Called by external cron service every 1 minute
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    Logger.info("Snapshot request received");

    // Optional: Add simple authentication
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      Logger.warn("Unauthorized snapshot request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch current pod data from Xandeum network
    const rpcClient = new RpcClient();
    const rpcResponse = await rpcClient.sendRequest({
      jsonrpc: "2.0",
      method: "get-pods-with-stats",
      params: [],
      id: 1,
    });

    if ("error" in rpcResponse && rpcResponse.error) {
      Logger.error("RPC error during snapshot", { error: rpcResponse.error });
      return NextResponse.json(
        { error: "Failed to fetch pod data", details: rpcResponse.error },
        { status: 500 },
      );
    }

    // Type narrowing: At this point we know it's a success response
    if (!("result" in rpcResponse)) {
      Logger.error("No result in RPC response");
      return NextResponse.json(
        { error: "Invalid response from pRPC - no result" },
        { status: 500 },
      );
    }

    // Validate response structure
    const validationResult = GetPodsWithStatsResultSchema.safeParse(
      rpcResponse.result,
    );

    if (!validationResult.success) {
      Logger.error("Invalid RPC response", { errors: validationResult.error });
      return NextResponse.json(
        { error: "Invalid response from pRPC" },
        { status: 500 },
      );
    }

    const { pods, total_count } = validationResult.data;

    // Store snapshot in database
    const storedCount = await podsDbService.storePodSnapshot(pods);

    const duration = Date.now() - startTime;

    Logger.info("Snapshot completed successfully", {
      podCount: storedCount,
      totalCount: total_count,
      duration,
    });

    return NextResponse.json({
      success: true,
      stored: storedCount,
      totalCount: total_count,
      timestamp: new Date().toISOString(),
      duration,
    });
  } catch (error) {
    Logger.error("Snapshot failed", { error });

    return NextResponse.json(
      {
        error: "Failed to store snapshot",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
