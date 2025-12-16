"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PodSnapshot } from "@/db/schema";
import type { NodeMetricPoint } from "@/types";

interface NodeMetricsResponse {
  pubkey: string;
  history: PodSnapshot[];
  count: number;
  startTime: string | Date;
  endTime: string | Date;
}

interface UseNodeMetricsOptions {
  pubkey: string | undefined;
  hours?: number;
  enabled?: boolean;
}

function toMetricPoint(snapshot: PodSnapshot): NodeMetricPoint {
  const snapshotTime = new Date(snapshot.snapshotTimestamp);
  const lastSeenMs = (snapshot.lastSeenTimestamp ?? 0) * 1000;
  const latencyMs = Math.max(0, snapshotTime.getTime() - lastSeenMs);

  const storageCapacityBytes =
    typeof snapshot.storageCommitted === "number"
      ? snapshot.storageCommitted
      : undefined;
  const storageUsedBytes =
    typeof snapshot.storageUsed === "number" ? snapshot.storageUsed : undefined;
  const storageUsagePercent =
    typeof snapshot.storageUsagePercent === "number"
      ? snapshot.storageUsagePercent
      : undefined;

  return {
    timestamp: snapshotTime,
    latencyMs,
    version: snapshot.version,
    uptime: snapshot.uptime ?? undefined,
    storageCapacityBytes,
    storageUsedBytes,
    storageUsagePercent,
  };
}

export function useNodeMetrics(options: UseNodeMetricsOptions) {
  const { pubkey, hours = 24, enabled = true } = options;

  const query = useQuery<NodeMetricPoint[]>({
    queryKey: ["node-metrics", pubkey, hours],
    queryFn: async () => {
      const response = await fetch(
        `/api/nodes/${pubkey}/metrics?hours=${hours}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch node metrics");
      }

      const data: NodeMetricsResponse = await response.json();

      return data.history.map(toMetricPoint);
    },
    enabled: enabled && !!pubkey,
    staleTime: 60000,
  });

  const versions = useMemo(() => {
    if (!query.data) return [];
    const unique = new Set<string>();
    query.data.forEach((point) => {
      if (point.version) unique.add(point.version);
    });
    return Array.from(unique);
  }, [query.data]);

  return {
    ...query,
    versions,
  };
}
