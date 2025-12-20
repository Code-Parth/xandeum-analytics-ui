"use client";

import { useMemo } from "react";
import { useNodesGeolocation } from "@/hooks";
import { Globe3D } from "@/components/globe-3d";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ChartInfoHover } from "@/components/chart-info-hover";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface CountryStats {
  country: string;
  countryCode: string;
  count: number;
  nodeCount: number;
}

export function NodeWorldMap() {
  const { data, isLoading, error } = useNodesGeolocation();

  // Calculate country statistics with node counts
  const countryStats = useMemo(() => {
    if (!data?.locations) return [];

    const statsMap = new Map<string, CountryStats>();

    for (const loc of data.locations) {
      const key = loc.countryCode || loc.country || "Unknown";
      const existing = statsMap.get(key);

      if (existing) {
        existing.count++;
        existing.nodeCount += loc.nodeCount;
      } else {
        statsMap.set(key, {
          country: loc.country || "Unknown",
          countryCode: loc.countryCode || "",
          count: 1,
          nodeCount: loc.nodeCount,
        });
      }
    }

    return Array.from(statsMap.values()).sort(
      (a, b) => b.nodeCount - a.nodeCount,
    );
  }, [data]);

  // Prepare location data for 3D globe
  const globeLocations = useMemo(() => {
    if (!data?.locations) return [];

    const validLocations = data.locations.filter(
      (loc) => loc.lat !== null && loc.lng !== null,
    );

    return validLocations.map((loc) => ({
      lat: loc.lat!,
      lng: loc.lng!,
      ip: loc.ip,
      city: loc.city,
      country: loc.country,
      nodeCount: loc.nodeCount,
      lastSeen: loc.lastSeen,
      pubkeys: loc.pubkeys,
    }));
  }, [data]);

  const timeRange = useMemo(() => {
    if (!data?.locations || data.locations.length === 0) return null;

    let earliest: Date | null = null;
    let latest: Date | null = null;

    for (const loc of data.locations) {
      const firstSeen = new Date(loc.firstSeen);
      const lastSeen = new Date(loc.lastSeen);

      if (!earliest || firstSeen < earliest) earliest = firstSeen;
      if (!latest || lastSeen > latest) latest = lastSeen;
    }

    return { earliest, latest };
  }, [data]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <Skeleton className="mb-2 h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-5 w-5 rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="aspect-2/1 w-full rounded-lg" />
          <div className="mt-4 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-6 w-20 rounded-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Node Geographic Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-destructive text-sm">
            Failed to load geolocation data: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.locations.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Node Geographic Distribution</CardTitle>
            <CardDescription>
              Global distribution of network nodes
            </CardDescription>
          </div>
          <ChartInfoHover
            ariaLabel="Geographic distribution info"
            items={[
              { label: "Data source", value: "IP Geolocation database" },
              { label: "Metrics", value: "Node locations by IP" },
              { label: "Update frequency", value: "On new nodes" },
            ]}
            docsAnchor="node-geographic-distribution"
          />
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground py-16 text-center text-sm">
            No geolocation data available yet. Data will appear as nodes are
            discovered.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Node Geographic Distribution</CardTitle>
          <CardDescription>
            {data.totalNodes} nodes across {data.totalLocations} locations in{" "}
            {countryStats.length} countries
            {timeRange?.latest && (
              <span className="text-muted-foreground">
                {" "}
                · Last seen{" "}
                {formatDistanceToNow(timeRange.latest, { addSuffix: true })}
              </span>
            )}
          </CardDescription>
        </div>
        <ChartInfoHover
          ariaLabel="Geographic distribution info"
          items={[
            { label: "Data source", value: "IP Geolocation database" },
            { label: "Total nodes", value: String(data.totalNodes) },
            { label: "Unique locations", value: String(data.totalLocations) },
            { label: "Countries", value: String(countryStats.length) },
            ...(timeRange?.earliest
              ? [
                  {
                    label: "First seen",
                    value: formatDistanceToNow(timeRange.earliest, {
                      addSuffix: true,
                    }),
                  },
                ]
              : []),
          ]}
          docsAnchor="node-geographic-distribution"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 3D Globe */}
        <div className="bg-background overflow-hidden rounded-lg border">
          <Globe3D locations={globeLocations} height="600px" />
        </div>

        {/* Status Legend */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-muted-foreground text-xs font-medium">
            Status:
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span className="text-muted-foreground text-xs">
              Active (&lt; 5 min)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
            <span className="text-muted-foreground text-xs">
              Recent (&lt; 1 hour)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-500"></div>
            <span className="text-muted-foreground text-xs">
              Inactive (&gt; 1 hour)
            </span>
          </div>
        </div>

        {/* Top Countries */}
        <div>
          <div className="text-muted-foreground mb-2 text-xs font-medium">
            Top Countries by Nodes:
          </div>
          <div className="flex flex-wrap gap-2">
            {countryStats.map((stat, idx) => (
              <Badge
                key={`${stat.countryCode || stat.country}-${idx}`}
                variant="outline"
                className="text-xs">
                {stat.countryCode || stat.country}: {stat.nodeCount} node
                {stat.nodeCount !== 1 ? "s" : ""} ({stat.count} IP
                {stat.count !== 1 ? "s" : ""})
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
