"use client";

import { useMemo } from "react";
import { useNodeGeolocation } from "@/hooks";
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
import { formatDistanceToNow, format } from "date-fns";

interface NodeLocationMapProps {
  pubkey: string;
}

export function NodeLocationMap({ pubkey }: NodeLocationMapProps) {
  const { data, isLoading, error } = useNodeGeolocation({
    pubkey,
    enabled: !!pubkey,
  });

  // Prepare location data for 3D globe
  const globeLocations = useMemo(() => {
    if (!data?.locations || data.locations.length === 0) return [];

    const validLocations = data.locations.filter(
      (loc) => loc.lat !== null && loc.lng !== null,
    );

    return validLocations.map((loc) => ({
      lat: loc.lat!,
      lng: loc.lng!,
      ip: loc.ip,
      city: loc.city,
      country: loc.country,
      nodeCount: loc.snapshotCount || 1,
      lastSeen: loc.lastSeen,
      pubkeys: data.pubkey ? [data.pubkey] : [],
    }));
  }, [data]);

  const uniqueLocations = useMemo(() => {
    if (!data?.locations) return [];
    return data.locations
      .filter((loc) => loc.lat !== null && loc.lng !== null)
      .sort(
        (a, b) =>
          new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime(),
      );
  }, [data]);

  const totalSnapshots = useMemo(() => {
    return uniqueLocations.reduce(
      (sum, loc) => sum + (loc.snapshotCount || 0),
      0,
    );
  }, [uniqueLocations]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <Skeleton className="mb-2 h-6 w-24" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-5 w-5 rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="aspect-2/1 w-full rounded-lg" />
          <div className="mt-3 space-y-2">
            <Skeleton className="h-16 w-full rounded" />
            <Skeleton className="h-16 w-full rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Location History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-destructive text-sm">
            Failed to load location: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.locations.length === 0 || uniqueLocations.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Location History</CardTitle>
            <CardDescription>
              Node geographic locations over time
            </CardDescription>
          </div>
          <ChartInfoHover
            ariaLabel="Node location info"
            items={[
              { label: "Data source", value: "IP Geolocation" },
              { label: "Status", value: "No location data" },
            ]}
            docsAnchor="node-location"
          />
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground py-8 text-center text-sm">
            No location data available for this node.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Location History</CardTitle>
          <CardDescription>
            {uniqueLocations.length} location
            {uniqueLocations.length !== 1 ? "s" : ""} across {totalSnapshots}{" "}
            snapshot{totalSnapshots !== 1 ? "s" : ""}
          </CardDescription>
        </div>
        <ChartInfoHover
          ariaLabel="Node location info"
          items={[
            { label: "Data source", value: "IP Geolocation" },
            { label: "Locations", value: String(uniqueLocations.length) },
            {
              label: "Countries",
              value: String(
                new Set(uniqueLocations.map((l) => l.countryCode)).size,
              ),
            },
            { label: "Total snapshots", value: String(totalSnapshots) },
          ]}
          docsAnchor="node-location"
        />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-hidden rounded-lg border bg-black">
          <Globe3D locations={globeLocations} height="500px" />
        </div>

        <div className="space-y-2">
          {uniqueLocations.map((loc, idx) => (
            <div
              key={`${loc.ip}-${idx}`}
              className="space-y-1.5 rounded border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-mono text-xs">
                    {loc.ip}
                  </span>
                  {idx === 0 && (
                    <Badge variant="default" className="text-xs">
                      Current
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {loc.countryCode || loc.country}
                  </Badge>
                  {loc.city && (
                    <span className="text-muted-foreground text-xs">
                      {loc.city}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-3">
                  {loc.isp && <span>{loc.isp}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span title={format(new Date(loc.firstSeen), "PPpp")}>
                    First:{" "}
                    {formatDistanceToNow(new Date(loc.firstSeen), {
                      addSuffix: true,
                    })}
                  </span>
                  <span title={format(new Date(loc.lastSeen), "PPpp")}>
                    Last:{" "}
                    {formatDistanceToNow(new Date(loc.lastSeen), {
                      addSuffix: true,
                    })}
                  </span>
                  <span>
                    {loc.snapshotCount} snapshot
                    {loc.snapshotCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
