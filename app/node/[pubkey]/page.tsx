"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useNodes,
  useNodeMetrics,
  useNodeActivity,
  useNodeHeatmap,
} from "@/hooks";
import { ActivityTimeline } from "@/components/activity-timeline";
import { ActivityHeatmap } from "@/components/activity-heatmap";
import { DowntimeReport } from "@/components/downtime-report";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Line, LineChart, XAxis, YAxis, Legend } from "recharts";
import { formatBytes } from "@/lib/utils";
import type { NodeStatus } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartInfoHover } from "@/components/chart-info-hover";

function formatLastSeen(date: Date | undefined) {
  if (!date) return "Unknown";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function truncateKey(key: string | undefined, size = 8) {
  if (!key) return "Unknown";
  if (key.length <= size * 2) return key;
  return `${key.slice(0, size)}...${key.slice(-size)}`;
}

function formatTimestampLabel(value: unknown) {
  const date = new Date(
    typeof value === "string" || typeof value === "number"
      ? value
      : // Some Recharts internals pass Date instances through
        (value as Date),
  );

  if (Number.isNaN(date.getTime())) {
    return String(value ?? "");
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const storageChartConfig = {
  committed: {
    label: "Committed",
    color: "var(--chart-1)",
  },
  used: {
    label: "Used",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export default function NodeDetailPage() {
  const params = useParams<{ pubkey: string }>();
  const pubkey = params?.pubkey;
  const [hours, setHours] = useState(24);

  const {
    data: nodes,
    isLoading: nodesLoading,
    error: nodesError,
  } = useNodes();
  const nodesForPubkey = useMemo(
    () => nodes?.filter((n) => n.publicKey === pubkey) ?? [],
    [nodes, pubkey],
  );
  const node = nodesForPubkey[0];

  const {
    data: metrics,
    versions,
    isLoading: metricsLoading,
    error: metricsError,
  } = useNodeMetrics({ pubkey, hours, enabled: !!pubkey });

  const {
    data: activityData,
    isLoading: activityLoading,
    error: activityError,
  } = useNodeActivity({ pubkey, hours, enabled: !!pubkey });

  // Heatmap uses days instead of hours (convert hours to approximate days)
  const heatmapDays = Math.max(1, Math.ceil(hours / 24));
  const {
    data: heatmapData,
    isLoading: heatmapLoading,
    error: heatmapError,
  } = useNodeHeatmap({ pubkey, days: heatmapDays, enabled: !!pubkey });

  // Latency chart config
  const latencyChartConfig = {
    latency: {
      label: "Latency (s)",
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  // Group latency data by address
  const latencyDataByAddress = useMemo(() => {
    if (!metrics)
      return new Map<string, { timestamp: Date; latency: number }[]>();

    const byAddress = new Map<string, { timestamp: Date; latency: number }[]>();

    for (const point of metrics) {
      if (!byAddress.has(point.address)) {
        byAddress.set(point.address, []);
      }

      byAddress.get(point.address)!.push({
        timestamp: point.timestamp,
        latency: Number((point.latencyMs / 1000).toFixed(2)),
      });
    }

    // Sort each address's data by timestamp
    for (const [addr, data] of byAddress) {
      byAddress.set(
        addr,
        data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
      );
    }

    return byAddress;
  }, [metrics]);

  const latencyAddresses = Array.from(latencyDataByAddress.keys());

  // Group storage data by address
  const storageDataByAddress = useMemo(() => {
    if (!metrics)
      return new Map<
        string,
        { timestamp: Date; committed: number; used: number }[]
      >();

    const byAddress = new Map<
      string,
      { timestamp: Date; committed: number; used: number }[]
    >();

    for (const point of metrics) {
      const committed = point.storageCapacityBytes ?? 0;
      const used = point.storageUsedBytes ?? 0;

      if (!committed && !used) continue;

      if (!byAddress.has(point.address)) {
        byAddress.set(point.address, []);
      }

      byAddress.get(point.address)!.push({
        timestamp: point.timestamp,
        committed: committed / 1024 ** 3,
        used: used / 1024 ** 3,
      });
    }

    // Sort each address's data by timestamp
    for (const [addr, data] of byAddress) {
      byAddress.set(
        addr,
        data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
      );
    }

    return byAddress;
  }, [metrics]);

  const storageAddresses = Array.from(storageDataByAddress.keys());

  const availableVersions =
    versions.length > 0 ? versions : node?.version ? [node.version] : [];

  const statusBadge = (status: NodeStatus | undefined) => {
    if (!status) return <Badge variant="secondary">Unknown</Badge>;

    const variants = {
      active: "default",
      inactive: "destructive",
      syncing: "secondary",
    } as const;

    return (
      <Badge variant={variants[status]} className="capitalize">
        {status}
      </Badge>
    );
  };

  if (!pubkey) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Node not specified</CardTitle>
            <CardDescription>
              Provide a node pubkey to view details.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (nodesLoading) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="mt-2 h-5 w-80" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>

        {/* Info Cards Skeleton - Identity, Versions, Status */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Identity Card */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <Skeleton className="mb-2 h-6 w-20" />
                <Skeleton className="h-4 w-36" />
              </div>
              <Skeleton className="h-5 w-5 rounded-full" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-5 w-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-36" />
              </div>
            </CardContent>
          </Card>

          {/* Versions Card */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <Skeleton className="mb-2 h-6 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-5 w-5 rounded-full" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-14 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </CardContent>
          </Card>

          {/* Status Card */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <Skeleton className="mb-2 h-6 w-16" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-5 w-5 rounded-full" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-12" />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-5 w-14" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Storage by Address Card Skeleton */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <Skeleton className="mb-2 h-6 w-36" />
              <Skeleton className="h-4 w-56" />
            </div>
            <Skeleton className="h-5 w-5 rounded-full" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-4">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2">
                  <Skeleton className="h-4 w-32" />
                  <div className="flex flex-wrap items-center gap-3">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Addresses Overview Card Skeleton */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <Skeleton className="mb-2 h-6 w-40" />
              <Skeleton className="h-4 w-52" />
            </div>
            <Skeleton className="h-5 w-5 rounded-full" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2">
                  <Skeleton className="h-5 w-36" />
                  <div className="flex flex-wrap items-center gap-3">
                    <Skeleton className="h-6 w-14 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Timeline Skeleton */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <Skeleton className="mb-2 h-6 w-36" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-5 w-5 rounded-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>

        {/* Activity Heatmap Skeleton */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <Skeleton className="mb-2 h-6 w-36" />
              <Skeleton className="h-4 w-56" />
            </div>
            <Skeleton className="h-5 w-5 rounded-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>

        {/* Downtime Report Skeleton */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <Skeleton className="mb-2 h-6 w-36" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-5 w-5 rounded-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>

        <Separator />

        {/* Per-Address Charts Skeleton */}
        {[1, 2].map((addressIndex) => (
          <div key={addressIndex} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Skeleton className="h-7 w-40" />
              <div className="flex flex-wrap items-center gap-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-14 rounded-full" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Latency Chart */}
              <Card>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div>
                    <Skeleton className="mb-2 h-5 w-20" />
                    <Skeleton className="h-4 w-44" />
                  </div>
                  <Skeleton className="h-5 w-5 rounded-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>

              {/* Storage Chart */}
              <Card>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div>
                    <Skeleton className="mb-2 h-5 w-28" />
                    <Skeleton className="h-4 w-52" />
                    <div className="mt-2 flex flex-wrap gap-3">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-14" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-5 rounded-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            </div>

            <Separator />
          </div>
        ))}
      </div>
    );
  }

  if (nodesError) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">
              Failed to load node
            </CardTitle>
            <CardDescription>{nodesError.message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!node) {
    return (
      <div className="container mx-auto space-y-4 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Node not found</CardTitle>
            <CardDescription>
              No node with pubkey <span className="font-mono">{pubkey}</span>{" "}
              was found in the latest snapshot.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
              <Link href="/">Back to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Node {truncateKey(pubkey)}</h1>
            {statusBadge(node.status)}
          </div>
          <p className="text-muted-foreground">
            Current version {node.version} · Last seen{" "}
            {formatLastSeen(node.lastSeen)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={String(hours)}
            onValueChange={(v) => setHours(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Hour</SelectItem>
              <SelectItem value="6">6 Hours</SelectItem>
              <SelectItem value="24">24 Hours</SelectItem>
              <SelectItem value="72">3 Days</SelectItem>
              <SelectItem value="168">7 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button asChild variant="outline">
            <Link href="/">Back</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Identity</CardTitle>
              <CardDescription>Public key and addresses</CardDescription>
            </div>
            <ChartInfoHover
              ariaLabel="Node identity info"
              items={[
                { label: "Data source", value: "Latest nodes snapshot" },
                { label: "Metrics", value: "Pubkey and all known addresses" },
                { label: "Time", value: "Current snapshot" },
              ]}
              docsAnchor="identity-card"
            />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="font-mono text-sm break-all">{pubkey}</div>
            <div className="space-y-1 text-sm">
              {nodesForPubkey.length === 0 ? (
                <div className="text-muted-foreground">No addresses found</div>
              ) : (
                nodesForPubkey.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">
                      {n.ipAddress}:{n.port}
                    </span>
                    {n.id === node.id && (
                      <Badge variant="secondary" className="text-[10px]">
                        Primary
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Versions</CardTitle>
              <CardDescription>Current and historical</CardDescription>
            </div>
            <ChartInfoHover
              ariaLabel="Node versions info"
              items={[
                {
                  label: "Data source",
                  value: "Node snapshot + metrics history",
                },
                { label: "Metrics", value: "Current version + known versions" },
                {
                  label: "Time",
                  value: "Current snapshot (history if present)",
                },
              ]}
              docsAnchor="versions-card"
            />
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-muted-foreground text-sm">Current:</span>{" "}
              <Badge variant="outline">{node.version}</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableVersions.length === 0 ? (
                <span className="text-muted-foreground text-sm">
                  No version history yet
                </span>
              ) : (
                availableVersions.map((version) => (
                  <Badge key={version} variant="secondary">
                    {version}
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Status</CardTitle>
              <CardDescription>Health snapshot</CardDescription>
            </div>
            <ChartInfoHover
              ariaLabel="Node status info"
              items={[
                { label: "Data source", value: "Latest nodes snapshot" },
                { label: "Metrics", value: "Last seen and uptime" },
                { label: "Time", value: "Current snapshot" },
              ]}
              docsAnchor="status-card"
            />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Last seen</span>
              <span className="font-medium">
                {formatLastSeen(node.lastSeen)}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Uptime</span>
              <span className="font-medium">{node.uptime.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {nodesForPubkey.some((n) => n.performance) && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Storage by address</CardTitle>
              <CardDescription>
                Committed and used storage for this pubkey
              </CardDescription>
            </div>
            <ChartInfoHover
              ariaLabel="Storage by address info"
              items={[
                { label: "Data source", value: "Latest nodes snapshot" },
                {
                  label: "Metrics",
                  value: "Committed vs used storage per address",
                },
                { label: "Time", value: "Current snapshot" },
              ]}
              docsAnchor="storage-usage-chart-per-address"
            />
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="text-muted-foreground flex flex-wrap gap-4 text-xs">
              {(() => {
                const totalCommitted = nodesForPubkey.reduce(
                  (sum, n) => sum + (n.performance?.storageCapacity || 0),
                  0,
                );
                const totalUsed = nodesForPubkey.reduce(
                  (sum, n) => sum + (n.performance?.storageUsed || 0),
                  0,
                );
                if (!totalCommitted && !totalUsed) return null;

                return (
                  <>
                    <span>
                      Total committed:{" "}
                      <span className="text-foreground font-medium">
                        {formatBytes(totalCommitted)}
                      </span>
                    </span>
                    <span>
                      Total used:{" "}
                      <span className="text-foreground font-medium">
                        {formatBytes(totalUsed)}
                      </span>
                    </span>
                  </>
                );
              })()}
            </div>
            <div className="space-y-2">
              {nodesForPubkey.map((n) => {
                const capacity = n.performance?.storageCapacity || 0;
                const used = n.performance?.storageUsed || 0;
                const percent =
                  capacity > 0 ? (used / capacity) * 100 : undefined;

                if (!capacity && !used) {
                  return null;
                }

                return (
                  <div
                    key={`storage-${n.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2">
                    <div className="text-muted-foreground text-xs">
                      {n.ipAddress}:{n.port}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span>
                        <span
                          aria-hidden
                          className="mr-1 inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: "var(--chart-1)" }}
                        />
                        Committed:{" "}
                        <span className="text-foreground font-medium">
                          {formatBytes(capacity)}
                        </span>
                      </span>
                      <span>
                        <span
                          aria-hidden
                          className="mr-1 inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: "var(--chart-2)" }}
                        />
                        Used:{" "}
                        <span className="text-foreground font-medium">
                          {formatBytes(used)}
                        </span>
                      </span>
                      {percent !== undefined && (
                        <span className="text-muted-foreground">
                          ({percent.toFixed(1)}%)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Charts - Latency and Storage per address */}
      {metricsError ? (
        <Card>
          <CardHeader>
            <CardTitle>Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-destructive text-sm">
              Failed to load metrics: {metricsError.message}
            </div>
          </CardContent>
        </Card>
      ) : metricsLoading ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Latency</CardTitle>
              <CardDescription>Time since last seen over time</CardDescription>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Storage Usage</CardTitle>
              <CardDescription>
                Committed vs used storage over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      ) : latencyAddresses.length === 0 && storageAddresses.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Metrics</CardTitle>
            <CardDescription>Latency and storage over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground py-8 text-center text-sm">
              No metrics available for this range.
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Card - All addresses overview */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>Addresses Overview</CardTitle>
                <CardDescription>
                  Status summary for all{" "}
                  {
                    Array.from(
                      new Set([...latencyAddresses, ...storageAddresses]),
                    ).length
                  }{" "}
                  address(es)
                </CardDescription>
              </div>
              <ChartInfoHover
                ariaLabel="Addresses overview info"
                items={[
                  {
                    label: "Data source",
                    value:
                      "Node metrics + snapshot (includes historical addresses)",
                  },
                  {
                    label: "Metrics",
                    value: "Version, uptime, status by address",
                  },
                  {
                    label: "Time range",
                    value: `${hours}-hour window; some addresses may be historical only`,
                  },
                ]}
                docsAnchor="node-detail-page-metrics"
              />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from(
                  new Set([...latencyAddresses, ...storageAddresses]),
                ).map((address) => {
                  const nodeForAddress = nodesForPubkey.find(
                    (n) => `${n.ipAddress}:${n.port}` === address,
                  );

                  return (
                    <div
                      key={`summary-${address}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2">
                      <span className="font-mono text-sm">{address}</span>
                      {nodeForAddress ? (
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <Badge variant="outline">
                            {nodeForAddress.version}
                          </Badge>
                          <span className="text-muted-foreground">
                            Uptime:{" "}
                            <span className="text-foreground font-medium">
                              {nodeForAddress.uptime.toFixed(1)}%
                            </span>
                          </span>
                          <Badge
                            variant={
                              nodeForAddress.status === "active"
                                ? "default"
                                : nodeForAddress.status === "syncing"
                                  ? "secondary"
                                  : "destructive"
                            }
                            className="capitalize">
                            {nodeForAddress.status}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          Historical only — present in this time window, not in
                          the latest snapshot
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <ActivityTimeline
            data={activityData?.addresses}
            isLoading={activityLoading}
            error={activityError}
            startTime={activityData?.startTime}
            endTime={activityData?.endTime}
            hours={hours}
          />

          {/* Activity Heatmap */}
          <ActivityHeatmap
            data={heatmapData?.cells}
            isLoading={heatmapLoading}
            error={heatmapError}
            days={heatmapDays}
          />

          {/* Downtime Report */}
          <DowntimeReport
            data={activityData?.addresses}
            isLoading={activityLoading}
            error={activityError}
            hours={hours}
          />

          <Separator />

          {/* Individual address charts */}
          {Array.from(new Set([...latencyAddresses, ...storageAddresses])).map(
            (address) => {
              const latencyData = latencyDataByAddress.get(address) || [];
              const storageData = storageDataByAddress.get(address) || [];
              // Find the node data for this address to get version and uptime
              const nodeForAddress = nodesForPubkey.find(
                (n) => `${n.ipAddress}:${n.port}` === address,
              );

              return (
                <div key={address} className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold">{address}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      {nodeForAddress ? (
                        <>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">
                              Version:
                            </span>
                            <Badge variant="outline">
                              {nodeForAddress.version}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">
                              Uptime:
                            </span>
                            <span className="font-medium">
                              {nodeForAddress.uptime.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">
                              Status:
                            </span>
                            <Badge
                              variant={
                                nodeForAddress.status === "active"
                                  ? "default"
                                  : nodeForAddress.status === "syncing"
                                    ? "secondary"
                                    : "destructive"
                              }
                              className="capitalize">
                              {nodeForAddress.status}
                            </Badge>
                          </div>
                        </>
                      ) : (
                        <Badge variant="secondary">
                          Historical (not in current snapshot)
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* Latency Chart */}
                    <Card>
                      <CardHeader className="flex flex-row items-start justify-between space-y-0">
                        <div>
                          <CardTitle className="text-base">Latency</CardTitle>
                          <CardDescription>
                            Time since last seen over time
                          </CardDescription>
                        </div>
                        <ChartInfoHover
                          ariaLabel="Latency chart info"
                          items={[
                            { label: "Data source", value: "Node metrics API" },
                            {
                              label: "Metrics",
                              value: "Latency by address (seconds)",
                            },
                            {
                              label: "Time range",
                              value: `${hours}-hour window`,
                            },
                          ]}
                          docsAnchor="latency-chart-per-address"
                        />
                      </CardHeader>
                      <CardContent>
                        {latencyData.length === 0 ? (
                          <div className="text-muted-foreground py-8 text-center text-sm">
                            No latency data available.
                          </div>
                        ) : (
                          <ChartContainer
                            config={latencyChartConfig}
                            className="h-64">
                            <LineChart data={latencyData}>
                              <ChartTooltip
                                content={
                                  <ChartTooltipContent
                                    labelFormatter={formatTimestampLabel}
                                    formatter={(value) => `${value}s`}
                                  />
                                }
                              />
                              <XAxis
                                dataKey="timestamp"
                                tickFormatter={(ts) =>
                                  new Date(ts).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                }
                              />
                              <YAxis tickFormatter={(v) => `${v}s`} />
                              <Legend />
                              <Line
                                type="monotone"
                                dataKey="latency"
                                name="Latency (s)"
                                stroke="var(--chart-1)"
                                strokeWidth={2}
                                dot={false}
                                activeDot={false}
                              />
                            </LineChart>
                          </ChartContainer>
                        )}
                      </CardContent>
                    </Card>

                    {/* Storage Chart */}
                    <Card>
                      <CardHeader className="flex flex-row items-start justify-between space-y-0">
                        <div>
                          <CardTitle className="text-base">
                            Storage Usage
                          </CardTitle>
                          <CardDescription>
                            Committed vs used storage over time
                          </CardDescription>
                          <div className="text-muted-foreground mt-1 flex flex-wrap gap-3 text-xs">
                            <span className="inline-flex items-center gap-1">
                              <span
                                aria-hidden
                                className="inline-block h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: "var(--chart-1)" }}
                              />
                              Committed
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <span
                                aria-hidden
                                className="inline-block h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: "var(--chart-2)" }}
                              />
                              Used
                            </span>
                          </div>
                        </div>
                        <ChartInfoHover
                          ariaLabel="Storage chart info"
                          items={[
                            { label: "Data source", value: "Node metrics API" },
                            {
                              label: "Metrics",
                              value: "Committed vs used storage per address",
                            },
                            {
                              label: "Time range",
                              value: `${hours}-hour window`,
                            },
                          ]}
                          docsAnchor="storage-usage-chart-per-address"
                        />
                      </CardHeader>
                      <CardContent>
                        {storageData.length === 0 ? (
                          <div className="text-muted-foreground py-8 text-center text-sm">
                            No storage data available.
                          </div>
                        ) : (
                          <ChartContainer
                            config={storageChartConfig}
                            className="h-64">
                            <LineChart data={storageData}>
                              <ChartTooltip
                                content={
                                  <ChartTooltipContent
                                    labelFormatter={formatTimestampLabel}
                                    formatter={(value) =>
                                      `${Number(value).toFixed(2)} GB`
                                    }
                                  />
                                }
                              />
                              <XAxis
                                dataKey="timestamp"
                                tickFormatter={(ts) =>
                                  new Date(ts).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                }
                              />
                              <YAxis
                                tickFormatter={(v) =>
                                  `${(v as number).toFixed(1)} GB`
                                }
                                allowDecimals
                              />
                              <Legend />
                              <Line
                                type="monotone"
                                dataKey="committed"
                                name="Committed (GB)"
                                stroke="var(--chart-1)"
                                strokeWidth={2}
                                dot={false}
                                activeDot={false}
                              />
                              <Line
                                type="monotone"
                                dataKey="used"
                                name="Used (GB)"
                                stroke="var(--chart-2)"
                                strokeWidth={2}
                                dot={false}
                                activeDot={false}
                              />
                            </LineChart>
                          </ChartContainer>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <Separator />
                </div>
              );
            },
          )}
        </>
      )}
    </div>
  );
}
