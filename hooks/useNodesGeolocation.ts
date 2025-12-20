"use client";

import { useQuery } from "@tanstack/react-query";

export interface MapLocation {
  ip: string;
  lat: number;
  lng: number;
  city: string | null;
  region: string | null;
  country: string | null;
  countryCode: string | null;
  isp: string | null;
  org: string | null;
  nodeCount: number;
  pubkeys: string[];
  firstSeen: string;
  lastSeen: string;
}

interface NodesGeolocationResponse {
  locations: MapLocation[];
  totalNodes: number;
  totalLocations: number;
}

/**
 * Hook to fetch all node geolocations for the global map with historical data
 */
export function useNodesGeolocation() {
  return useQuery<NodesGeolocationResponse>({
    queryKey: ["nodes-geolocation"],
    queryFn: async () => {
      const response = await fetch("/api/geolocation");

      if (!response.ok) {
        throw new Error("Failed to fetch nodes geolocation");
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}
