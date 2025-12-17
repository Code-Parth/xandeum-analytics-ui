"use client";

import { useQuery } from "@tanstack/react-query";
import type { NodeHeatmapResponse } from "@/types";

interface UseNodeHeatmapOptions {
  pubkey: string | undefined;
  days?: number;
  enabled?: boolean;
}

export function useNodeHeatmap(options: UseNodeHeatmapOptions) {
  const { pubkey, days = 7, enabled = true } = options;

  return useQuery<NodeHeatmapResponse>({
    queryKey: ["node-heatmap", pubkey, days],
    queryFn: async () => {
      const response = await fetch(`/api/nodes/${pubkey}/heatmap?days=${days}`);

      if (!response.ok) {
        throw new Error("Failed to fetch node heatmap");
      }

      const data: NodeHeatmapResponse = await response.json();

      // Convert date strings back to Date objects
      return {
        ...data,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
      };
    },
    enabled: enabled && !!pubkey,
    staleTime: 60000,
  });
}
