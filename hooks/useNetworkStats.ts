import { useQuery } from "@tanstack/react-query";
import { apiService } from "../services/api.service";
import type { NetworkStats } from "../types";

export function useNetworkStats() {
  return useQuery<NetworkStats, Error>({
    queryKey: ["network-stats"],
    queryFn: async () => {
      return await apiService.getNetworkStats();
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 30000, // Auto-refresh every 30s
  });
}
