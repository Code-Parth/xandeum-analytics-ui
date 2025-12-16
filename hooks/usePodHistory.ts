import { useQuery } from "@tanstack/react-query";
import type { PodSnapshot } from "@/db/schema";

interface PodHistoryPoint extends Omit<PodSnapshot, "snapshotTimestamp"> {
  snapshotTimestamp: Date;
}

interface PodHistoryResponse {
  address: string;
  history: PodSnapshot[];
  count: number;
  startTime: string | Date;
  endTime: string | Date;
}

interface UsePodHistoryOptions {
  address: string;
  hours?: number;
  enabled?: boolean;
}

export function usePodHistory(options: UsePodHistoryOptions) {
  const { address, hours = 24, enabled = true } = options;

  return useQuery<PodHistoryPoint[]>({
    queryKey: ["pod-history", address, hours],
    queryFn: async () => {
      const response = await fetch(
        `/api/pods/history?address=${address}&hours=${hours}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch pod history");
      }

      const data: PodHistoryResponse = await response.json();

      return data.history.map((point) => ({
        ...point,
        snapshotTimestamp: new Date(point.snapshotTimestamp),
      }));
    },
    staleTime: 60000,
    enabled: enabled && !!address,
  });
}
