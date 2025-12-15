// app/api/endpoints/route.ts
import { NextResponse } from "next/server";
import { RpcClient } from "@/services";

const rpcClient = new RpcClient();

export async function GET() {
  const endpoints = rpcClient.getEndpoints();
  return NextResponse.json(endpoints);
}
