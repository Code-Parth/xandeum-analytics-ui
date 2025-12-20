"use client";

import { useQuery } from "@tanstack/react-query";

export interface NodeMapLocation {
  ip: string;
  lat: number;
  lng: number;
  city: string | null;
  region: string | null;
  country: string | null;
  countryCode: string | null;
  isp: string | null;
  org: string | null;
  firstSeen: string;
  lastSeen: string;
  snapshotCount: number;
}

interface NodeGeolocationResponse {
  pubkey: string;
  locations: NodeMapLocation[];
  total: number;
}

interface UseNodeGeolocationOptions {
  pubkey: string | undefined;
  enabled?: boolean;
}

/**
 * Hook to fetch geolocation for a specific node's IP addresses with history
 */
export function useNodeGeolocation(options: UseNodeGeolocationOptions) {
  const { pubkey, enabled = true } = options;

  return useQuery<NodeGeolocationResponse>({
    queryKey: ["node-geolocation", pubkey],
    queryFn: async () => {
      const response = await fetch(`/api/nodes/${pubkey}/geolocation`);

      if (!response.ok) {
        throw new Error("Failed to fetch node geolocation");
      }

      return response.json();
    },
    enabled: enabled && !!pubkey,
    staleTime: 5 * 60 * 1000,
  });
}
