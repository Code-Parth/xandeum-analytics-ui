import { z } from "zod";
import {
  JsonRpcRequestSchema,
  JsonRpcSuccessResponseSchema,
  JsonRpcErrorResponseSchema,
  JsonRpcResponseSchema,
  JsonRpcErrorSchema,
  JsonRpcErrorCode,
} from "@/schemas/jsonrpc.schema";

// Inferred Types
export type JsonRpcRequest = z.infer<typeof JsonRpcRequestSchema>;
export type JsonRpcSuccessResponse = z.infer<
  typeof JsonRpcSuccessResponseSchema
>;
export type JsonRpcErrorResponse = z.infer<typeof JsonRpcErrorResponseSchema>;
export type JsonRpcResponse = z.infer<typeof JsonRpcResponseSchema>;
export type JsonRpcError = z.infer<typeof JsonRpcErrorSchema>;

// Generic JSON-RPC Response with typed result
export type JsonRpcSuccessResponseWithResult<T> = {
  jsonrpc: "2.0";
  result: T;
  id: string | number | null;
};

// Error code type
export type JsonRpcErrorCodeType =
  (typeof JsonRpcErrorCode)[keyof typeof JsonRpcErrorCode];

// Helper type for creating error responses
export type CreateErrorResponse = {
  code: JsonRpcErrorCodeType;
  message: string;
  data?: unknown;
  id?: string | number | null;
};
