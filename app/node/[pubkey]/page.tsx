"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useNodes, useNodeMetrics } from "@/hooks";
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

const latencyChartConfig = {
  latency: {
    label: "Latency (s since last seen)",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

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

  const latencyData =
    metrics?.map((point) => ({
      timestamp: point.timestamp,
      latencySeconds: Number((point.latencyMs / 1000).toFixed(2)),
    })) || [];

  const storageData =
    metrics
      ?.map((point) => {
        const committed = point.storageCapacityBytes ?? 0;
        const used = point.storageUsedBytes ?? 0;
        if (!committed && !used) {
          return null;
        }
        return {
          timestamp: point.timestamp,
          committed: committed / 1024 ** 3,
          used: used / 1024 ** 3,
        };
      })
      .filter(
        (v): v is { timestamp: Date; committed: number; used: number } =>
          v !== null,
      ) || [];

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
      <div className="container mx-auto space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="bg-muted h-6 w-48 animate-pulse rounded" />
            <div className="bg-muted mt-2 h-4 w-32 animate-pulse rounded" />
          </div>
          <div className="bg-muted h-10 w-28 animate-pulse rounded" />
        </div>
        <Card>
          <CardHeader>
            <div className="bg-muted h-5 w-40 animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="bg-muted h-24 w-full animate-pulse rounded" />
          </CardContent>
        </Card>
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
          <CardHeader>
            <CardTitle>Identity</CardTitle>
            <CardDescription>Public key and addresses</CardDescription>
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
          <CardHeader>
            <CardTitle>Versions</CardTitle>
            <CardDescription>Current and historical</CardDescription>
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
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <CardDescription>Health snapshot</CardDescription>
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
          <CardHeader>
            <CardTitle>Storage by address</CardTitle>
            <CardDescription>
              Committed and used storage for this pubkey
            </CardDescription>
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
                        Committed:{" "}
                        <span className="text-foreground font-medium">
                          {formatBytes(capacity)}
                        </span>
                      </span>
                      <span>
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

      <Card>
        <CardHeader>
          <CardTitle>Latency</CardTitle>
          <CardDescription>Time since last seen over time</CardDescription>
        </CardHeader>
        <CardContent>
          {metricsError ? (
            <div className="text-destructive text-sm">
              Failed to load metrics: {metricsError.message}
            </div>
          ) : metricsLoading ? (
            <div className="bg-muted h-64 w-full animate-pulse rounded" />
          ) : latencyData.length === 0 ? (
            <div className="text-muted-foreground text-sm">
              No metrics available for this range.
            </div>
          ) : (
            <ChartContainer config={latencyChartConfig} className="h-80">
              <LineChart data={latencyData}>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={formatTimestampLabel}
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
                <YAxis />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="latencySeconds"
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

      <Card>
        <CardHeader>
          <CardTitle>Storage Usage</CardTitle>
          <CardDescription>Committed vs used storage over time</CardDescription>
        </CardHeader>
        <CardContent>
          {metricsError ? (
            <div className="text-destructive text-sm">
              Failed to load metrics: {metricsError.message}
            </div>
          ) : metricsLoading ? (
            <div className="bg-muted h-64 w-full animate-pulse rounded" />
          ) : storageData.length === 0 ? (
            <div className="text-muted-foreground text-sm">
              No storage metrics available for this range.
            </div>
          ) : (
            <ChartContainer config={storageChartConfig} className="h-80">
              <LineChart data={storageData}>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={formatTimestampLabel}
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
                  tickFormatter={(v) => `${(v as number).toFixed(1)} GB`}
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
  );
}
