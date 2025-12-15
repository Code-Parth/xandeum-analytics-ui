import { useQuery } from "@tanstack/react-query";
import { apiService } from "../services/api.service";

export function useHealthCheck() {
  return useQuery<{ status: "ok" | "degraded" | "down" }, Error>({
    queryKey: ["health"],
    queryFn: async () => {
      return await apiService.healthCheck();
    },
    staleTime: 60000, // 60 seconds
    refetchInterval: 60000, // Auto-refresh every 60s
  });
}
