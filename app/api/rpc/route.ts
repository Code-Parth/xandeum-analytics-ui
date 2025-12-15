/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/rpc/route.ts
import { NextResponse } from "next/server";
import { RpcClient } from "@/services";
import {
  JsonRpcRequestSchema,
  JsonRpcResponseSchema,
  JsonRpcErrorCode,
} from "@/schemas";
import type { JsonRpcRequest } from "@/types";

const rpcClient = new RpcClient();

export async function POST(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: JsonRpcErrorCode.PARSE_ERROR,
          message: "Invalid JSON in request body",
        },
        id: null,
      },
      { status: 400 },
    );
  }

  // Validate request shape
  const validation = JsonRpcRequestSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: JsonRpcErrorCode.INVALID_REQUEST,
          message: "Invalid JSON-RPC request structure",
          data: validation.error.issues,
        },
        id:
          typeof (body as any)?.id === "string" ||
          typeof (body as any)?.id === "number"
            ? (body as any).id
            : null,
      },
      { status: 400 },
    );
  }

  const rpcRequest: JsonRpcRequest = validation.data;

  try {
    const rpcResponse = await rpcClient.sendRequest(rpcRequest);

    // Ensure response matches JSON-RPC 2.0
    const respValidation = JsonRpcResponseSchema.safeParse(rpcResponse);
    if (!respValidation.success) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: JsonRpcErrorCode.INTERNAL_ERROR,
            message: "Invalid JSON-RPC response from backend",
            data: respValidation.error.issues,
          },
          id: rpcRequest.id ?? null,
        },
        { status: 500 },
      );
    }

    // Pass through the validated response
    return NextResponse.json(respValidation.data);
  } catch (error) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: JsonRpcErrorCode.INTERNAL_ERROR,
          message:
            error instanceof Error ? error.message : "Unknown RPC proxy error",
        },
        id: rpcRequest.id ?? null,
      },
      { status: 500 },
    );
  }
}
