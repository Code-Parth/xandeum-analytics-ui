// app/api/health/route.ts
import { NextResponse } from "next/server";
import { RpcClient } from "@/services";
import { JsonRpcRequest } from "@/types";

const rpcClient = new RpcClient();

export async function GET() {
  const request: JsonRpcRequest = {
    jsonrpc: "2.0",
    method: "get-pods-with-stats",
    params: [],
    id: "health-check",
  };

  try {
    const response = await rpcClient.sendRequest(request);

    // If the RPC response itself is an error, treat as down
    if ("error" in response) {
      return NextResponse.json(
        { status: "down", error: response.error },
        { status: 500 },
      );
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    return NextResponse.json(
      {
        status: "down",
        error:
          error instanceof Error
            ? error.message
            : "Unknown error in health check",
      },
      { status: 500 },
    );
  }
}
