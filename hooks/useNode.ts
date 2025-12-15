import { useQuery } from "@tanstack/react-query";
import { apiService } from "../services/api.service";
import type { PNode } from "../types";

export function useNode(nodeId: string | undefined) {
  return useQuery<PNode | null, Error>({
    queryKey: ["node", nodeId],
    queryFn: async () => {
      if (!nodeId) return null;
      return await apiService.getNodeById(nodeId);
    },
    enabled: !!nodeId,
    staleTime: 60000, // 60 seconds
  });
}
