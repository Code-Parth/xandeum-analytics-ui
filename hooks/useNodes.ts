import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/services/api.service";
import type { PNode } from "@/types";

export function useNodes() {
  return useQuery<PNode[], Error>({
    queryKey: ["nodes"],
    queryFn: async () => {
      return await apiService.getAllNodes();
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 30000, // Auto-refresh every 30s
  });
}
