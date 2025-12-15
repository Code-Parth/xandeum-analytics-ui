import { z } from "zod";

// JSON-RPC 2.0 Request Schema
export const JsonRpcRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.string().min(1),
  params: z.array(z.unknown()).optional().default([]),
  id: z.union([z.string(), z.number(), z.null()]).optional(),
});

// JSON-RPC 2.0 Error Object
export const JsonRpcErrorSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.unknown().optional(),
});

// JSON-RPC 2.0 Success Response Schema (generic result)
export const JsonRpcSuccessResponseSchema = z.object({
  jsonrpc: z.literal("2.0"),
  result: z.unknown(), // Will be typed more specifically per method
  id: z.union([z.string(), z.number(), z.null()]),
});

// JSON-RPC 2.0 Error Response Schema
export const JsonRpcErrorResponseSchema = z.object({
  jsonrpc: z.literal("2.0"),
  error: JsonRpcErrorSchema,
  id: z.union([z.string(), z.number(), z.null()]),
});

// Combined Response Schema
export const JsonRpcResponseSchema = z.union([
  JsonRpcSuccessResponseSchema,
  JsonRpcErrorResponseSchema,
]);

// Standard JSON-RPC 2.0 Error Codes
export const JsonRpcErrorCode = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SERVER_ERROR: -32000,
} as const;
