import * as undici from "undici";
import {
  XANDEUM_ENDPOINTS,
  RPC_TIMEOUT_MS,
  MAX_ERROR_DETAILS,
} from "@/config/endpoints";
import {
  JsonRpcRequestSchema,
  JsonRpcResponseSchema,
  JsonRpcErrorCode,
} from "@/schemas/index";
import {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcErrorCodeType,
} from "@/types/index";
import { Logger } from "@/utils/logger";
import { createTimeoutController } from "@/utils/abort-controller";

interface RpcAttemptError {
  endpoint: string;
  method: string;
  error: string;
}

interface RpcClientOptions {
  userAgent?: string;
}

export class RpcClient {
  private readonly endpoints: string[];
  private readonly timeout: number;
  private readonly userAgent: string;

  constructor(options: RpcClientOptions = {}) {
    this.endpoints = XANDEUM_ENDPOINTS;
    this.timeout = RPC_TIMEOUT_MS;
    this.userAgent = options.userAgent || "Xandeum-Analytics-Backend/2.0";
  }

  /**
   * Sends a JSON-RPC request with automatic failover and method fallback
   */
  async sendRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    // Validate request
    const validationResult = JsonRpcRequestSchema.safeParse(request);
    if (!validationResult.success) {
      Logger.error("Invalid JSON-RPC request", {
        errors: validationResult.error.issues,
      });
      return this.createErrorResponse({
        code: JsonRpcErrorCode.INVALID_REQUEST,
        message: "Invalid JSON-RPC request structure",
        data: validationResult.error.issues,
        id: request.id,
      });
    }

    Logger.info("Received RPC request", {
      method: request.method,
      id: request.id,
    });

    const errors: RpcAttemptError[] = [];

    // Determine methods to try (with fallback for get-pods-with-stats)
    const methodsToTry = this.getMethodsToTry(request.method);

    // Try each method with all endpoints
    for (const method of methodsToTry) {
      Logger.debug(`Trying method: ${method}`);
      const modifiedRequest = { ...request, method };

      const response = await this.tryAllEndpoints(modifiedRequest, errors);
      if (response) {
        return response;
      }
    }

    // All endpoints and methods failed
    Logger.error("All endpoints failed", {
      totalAttempts: errors.length,
      methods: methodsToTry,
    });

    return this.createErrorResponse({
      code: JsonRpcErrorCode.INTERNAL_ERROR,
      message: "All endpoints failed",
      data: errors.slice(0, MAX_ERROR_DETAILS),
      id: request.id,
    });
  }

  /**
   * Tries all endpoints for a given request
   */
  private async tryAllEndpoints(
    request: JsonRpcRequest,
    errors: RpcAttemptError[],
  ): Promise<JsonRpcResponse | null> {
    for (const endpoint of this.endpoints) {
      const response = await this.trySingleEndpoint(endpoint, request, errors);
      if (response) {
        return response;
      }
    }
    return null;
  }

  /**
   * Attempts a single endpoint with timeout
   */
  private async trySingleEndpoint(
    endpoint: string,
    request: JsonRpcRequest,
    errors: RpcAttemptError[],
  ): Promise<JsonRpcResponse | null> {
    const startTime = Date.now();
    const timeout = createTimeoutController(this.timeout);

    try {
      Logger.debug(`Attempting: ${endpoint}`, { method: request.method });

      const { statusCode, body } = await undici.request(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": this.userAgent,
        },
        body: JSON.stringify(request),
        signal: timeout.signal,
        bodyTimeout: this.timeout,
        headersTimeout: this.timeout,
      });

      const duration = Date.now() - startTime;
      timeout.clear();

      Logger.debug(`Response received`, {
        endpoint,
        status: statusCode,
        duration,
      });

      // Handle HTTP errors
      if (statusCode < 200 || statusCode >= 300) {
        const errorText = await body.text().catch(() => "No response body");
        Logger.warn(`HTTP error`, {
          endpoint,
          status: statusCode,
          body: errorText.substring(0, 100),
        });
        errors.push({
          endpoint,
          method: request.method,
          error: `HTTP ${statusCode}`,
        });
        return null;
      }

      // Parse JSON response
      const data: unknown = await body.json();

      // Validate response structure
      const validationResult = JsonRpcResponseSchema.safeParse(data);
      if (!validationResult.success) {
        Logger.warn(`Invalid response structure`, {
          endpoint,
          errors: validationResult.error.issues,
        });
        errors.push({
          endpoint,
          method: request.method,
          error: "Invalid response structure",
        });
        return null;
      }

      // Success!
      Logger.info(`SUCCESS from ${endpoint}`, {
        method: request.method,
        duration,
        hasResult: "result" in validationResult.data,
        hasError: "error" in validationResult.data,
      });

      return validationResult.data;
    } catch (error) {
      timeout.clear();

      const errorMessage =
        error instanceof Error
          ? error.name === "AbortError"
            ? `Timeout (${this.timeout}ms)`
            : error.message
          : "Unknown error";

      // Log detailed error information for debugging
      Logger.error(`Endpoint failed`, {
        endpoint,
        method: request.method,
        error: errorMessage,
        errorName: error instanceof Error ? error.name : "N/A",
        errorStack: error instanceof Error ? error.stack : "N/A",
        errorCause: error instanceof Error ? error.cause : "N/A",
      });

      errors.push({
        endpoint,
        method: request.method,
        error: errorMessage,
      });

      return null;
    }
  }

  /**
   * Determines which methods to try based on the requested method
   */
  private getMethodsToTry(method: string): string[] {
    // Special handling for get-pods-with-stats: fallback to get-pods
    if (method === "get-pods-with-stats") {
      return ["get-pods-with-stats", "get-pods"];
    }
    return [method];
  }

  /**
   * Creates a JSON-RPC error response
   */
  private createErrorResponse(params: {
    code: JsonRpcErrorCodeType;
    message: string;
    data?: unknown;
    id?: string | number | null;
  }): JsonRpcResponse {
    const error: { code: number; message: string; data?: unknown } = {
      code: params.code,
      message: params.message,
    };

    if (params.data !== undefined) {
      error.data = params.data;
    }

    return {
      jsonrpc: "2.0",
      error,
      id: params.id ?? null,
    };
  }

  /**
   * Get list of configured endpoints
   */
  getEndpoints(): { primary: string; fallbacks: string[]; total: number } {
    return {
      primary: this.endpoints[0],
      fallbacks: this.endpoints.slice(1),
      total: this.endpoints.length,
    };
  }
}
