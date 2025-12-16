import { useQuery } from "@tanstack/react-query";

interface NetworkHistoryPoint {
  timestamp: Date;
  totalNodes: number;
  activeNodes: number;
  avgUptime: number;
  totalStorage: number;
  usedStorage: number;
}

interface NetworkHistoryResponse {
  networkHistory: Array<{
    timestamp: string | Date;
    totalNodes: number;
    activeNodes: number;
    avgUptime: number;
    totalStorage: number;
    usedStorage: number;
  }>;
  count: number;
  startTime: string | Date;
  endTime: string | Date;
}

interface UseNetworkHistoryOptions {
  hours?: number;
  enabled?: boolean;
}

export function useNetworkHistory(options: UseNetworkHistoryOptions = {}) {
  const { hours = 24, enabled = true } = options;

  return useQuery<NetworkHistoryPoint[]>({
    queryKey: ["network-history", hours],
    queryFn: async () => {
      const response = await fetch(`/api/pods/history?hours=${hours}`);

      if (!response.ok) {
        throw new Error("Failed to fetch network history");
      }

      const data: NetworkHistoryResponse = await response.json();

      return data.networkHistory.map((point) => ({
        ...point,
        timestamp: new Date(point.timestamp),
      }));
    },
    staleTime: 60000, // 1 minute
    enabled,
  });
}
