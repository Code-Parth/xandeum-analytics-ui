import { z } from "zod";

// Pod Schema (based on actual Xandeum response structure)
export const PodSchema = z.object({
  address: z.string(),
  is_public: z.boolean().nullable(),
  last_seen_timestamp: z.number(),
  pubkey: z.string().nullable(),
  rpc_port: z.number().nullable(),
  storage_committed: z.number().nullable(),
  storage_usage_percent: z.number().nullable(),
  storage_used: z.number().nullable(),
  uptime: z.number().nullable(),
  version: z.string(),
});

// Get Pods Response (for get-pods method)
export const GetPodsResultSchema = z.object({
  pods: z.array(PodSchema),
});

// Get Pods With Stats Response (for get-pods-with-stats method)
export const GetPodsWithStatsResultSchema = z.object({
  pods: z.array(PodSchema),
  total_count: z.number(),
});

// Union type for both possible pod responses
export const PodResultSchema = z.union([
  GetPodsResultSchema,
  GetPodsWithStatsResultSchema,
]);
