import { z } from "zod";
import {
  PodSchema,
  GetPodsResultSchema,
  GetPodsWithStatsResultSchema,
  PodResultSchema,
} from "@/schemas/pod.schema";

// Inferred Types
export type Pod = z.infer<typeof PodSchema>;
export type GetPodsResult = z.infer<typeof GetPodsResultSchema>;
export type GetPodsWithStatsResult = z.infer<
  typeof GetPodsWithStatsResultSchema
>;
export type PodResult = z.infer<typeof PodResultSchema>;
