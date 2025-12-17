"use client";

import { useQuery } from "@tanstack/react-query";
import type { NodeActivityResponse } from "@/types";

interface UseNodeActivityOptions {
  pubkey: string | undefined;
  hours?: number;
  gapThreshold?: number;
  enabled?: boolean;
}

export function useNodeActivity(options: UseNodeActivityOptions) {
  const { pubkey, hours = 24, gapThreshold = 5, enabled = true } = options;

  return useQuery<NodeActivityResponse>({
    queryKey: ["node-activity", pubkey, hours, gapThreshold],
    queryFn: async () => {
      const response = await fetch(
        `/api/nodes/${pubkey}/activity?hours=${hours}&gapThreshold=${gapThreshold}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch node activity");
      }

      const data: NodeActivityResponse = await response.json();

      // Convert date strings back to Date objects
      return {
        ...data,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        addresses: data.addresses.map((addr) => ({
          ...addr,
          periods: addr.periods.map((p) => ({
            ...p,
            startTime: new Date(p.startTime),
            endTime: new Date(p.endTime),
          })),
        })),
      };
    },
    enabled: enabled && !!pubkey,
    staleTime: 60000,
  });
}
