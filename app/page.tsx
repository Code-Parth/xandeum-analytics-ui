"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useNodes, useNetworkStats, useNetworkHistory } from "@/hooks";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { ChartInfoHover } from "@/components/chart-info-hover";
import { ThemeToggleButton } from "@/components/ui/theme-toggle-button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "./data-table";
import { columns, type NodeGroup } from "./columns";
import { formatBytes } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { Globe02Icon } from "@hugeicons/core-free-icons";

export default function DashboardPage() {
  const {
    data: nodes,
    isLoading: nodesLoading,
    error: nodesError,
  } = useNodes();
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useNetworkStats();

  const [timeRange, setTimeRange] = useState<number>(24); // hours

  // Fetch historical network data
  const { data: networkHistory } = useNetworkHistory({ hours: timeRange });

  // Group nodes by public key and transform for DataTable
  // Must be before early returns to satisfy React hooks rules
  const nodeGroups: NodeGroup[] = useMemo(() => {
    if (!nodes) return [];

    const map = new Map<
      string,
      {
        key: string;
        pubkey: string | null;
        nodes: typeof nodes;
      }
    >();

    for (const node of nodes) {
      const groupKey = node.publicKey || node.id;
      const existing = map.get(groupKey);
      if (existing) {
        existing.nodes.push(node);
      } else {
        map.set(groupKey, {
          key: groupKey,
          pubkey: node.publicKey,
          nodes: [node],
        });
      }
    }

    return Array.from(map.values()).map(
      ({ key, pubkey, nodes: groupNodes }) => {
        const sortedByLastSeen = [...groupNodes].sort(
          (a, b) => b.lastSeen.getTime() - a.lastSeen.getTime(),
        );
        const primary = sortedByLastSeen[0];

        const committedStorage = groupNodes.reduce(
          (sum, n) => sum + (n.performance?.storageCapacity || 0),
          0,
        );
        const usedStorage = groupNodes.reduce(
          (sum, n) => sum + (n.performance?.storageUsed || 0),
          0,
        );
        const usagePercent =
          committedStorage > 0 ? (usedStorage / committedStorage) * 100 : null;

        const addresses = groupNodes.map((n) => ({
          id: n.id,
          ipAddress: n.ipAddress,
          port: n.port,
        }));

        return {
          key,
          pubkey,
          addresses,
          committedStorage,
          usedStorage,
          usagePercent,
          version: primary.version,
        };
      },
    );
  }, [nodes]);

  // Calculate total unique public keys
  const totalPublicKeys = useMemo(() => {
    if (!nodes) return 0;
    return new Set(
      nodes.map((n) => n.publicKey).filter((pk): pk is string => !!pk),
    ).size;
  }, [nodes]);

  // Loading state
  if (nodesLoading || statsLoading) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        {/* Header Skeleton */}
        <div className="flex w-full flex-row items-center justify-between">
          <div className="flex flex-1 items-center gap-4">
            <Skeleton className="h-12 w-12 rounded" />
            <div className="flex-1">
              <Skeleton className="mb-2 h-9 w-80" />
              <Skeleton className="h-5 w-64" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-28 rounded" />
            <Skeleton className="h-9 w-9 rounded" />
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="flex gap-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-40" />
        </div>

        {/* Stat Cards Skeleton */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="mb-2 h-9 w-20" />
                <Skeleton className="mb-2 h-2 w-full rounded-full" />
                <Skeleton className="mt-2 h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator />

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="mb-2 h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-75 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator />

        {/* Historical Trends Skeleton */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <Skeleton className="mb-2 h-7 w-48" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="mb-2 h-6 w-40" />
                  <Skeleton className="h-4 w-56" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-75 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Separator />

        {/* Table Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="mb-2 h-6 w-32" />
            <Skeleton className="mb-4 h-4 w-48" />
            <div className="flex gap-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-36" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-12 flex-1" />
                  <Skeleton className="h-12 flex-1" />
                  <Skeleton className="h-12 flex-1" />
                  <Skeleton className="h-12 flex-1" />
                  <Skeleton className="h-12 flex-1" />
                  <Skeleton className="h-12 flex-1" />
                  <Skeleton className="h-12 flex-1" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (nodesError || statsError) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">
              Error Loading Data
            </CardTitle>
            <CardDescription>
              {nodesError?.message ||
                statsError?.message ||
                "Failed to load network data"}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // No data state
  if (!nodes || !stats) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>No Data Available</CardTitle>
            <CardDescription>Unable to fetch network data</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Chart data
  const statusData = [
    {
      name: "Active",
      value: stats.activeNodes,
      fill: "var(--chart-1)",
    },
    {
      name: "Inactive",
      value: stats.inactiveNodes,
      fill: "var(--chart-2)",
    },
    {
      name: "Syncing",
      value: nodes.filter((n) => n.status === "syncing").length,
      fill: "var(--chart-3)",
    },
  ].filter((item) => item.value > 0);

  const storageData = [
    {
      name: "Used",
      value: stats.usedStorage / 1024 ** 3,
      fill: "var(--chart-2)",
    },
    {
      name: "Available",
      value: Math.max(0, (stats.totalStorage - stats.usedStorage) / 1024 ** 3),
      fill: "var(--chart-1)",
    },
  ];

  const storageChartConfig = {
    value: {
      label: "Storage (GB)",
    },
    Used: {
      label: "Used",
      color: "var(--chart-2)",
    },
    Available: {
      label: "Available",
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  const storageUsagePercent =
    stats.totalStorage > 0 ? (stats.usedStorage / stats.totalStorage) * 100 : 0;

  // Generic chart config for line charts and status pie chart
  const chartConfig = {
    totalNodes: {
      label: "Total Nodes",
      color: "var(--chart-1)",
    },
    activeNodes: {
      label: "Active Nodes",
      color: "var(--chart-2)",
    },
    totalStorage: {
      label: "Total Storage (GB)",
      color: "var(--chart-1)",
    },
    usedStorage: {
      label: "Used Storage (GB)",
      color: "var(--chart-2)",
    },
    value: {
      label: "Count",
    },
  } satisfies ChartConfig;

  const formatTooltipTimestamp = (
    value: unknown,
    payload?: { payload?: Record<string, unknown> }[],
  ) => {
    const rawTimestamp =
      payload?.[0]?.payload?.timestamp ?? payload?.[0]?.payload?.time ?? value;
    const date = new Date(rawTimestamp as number);

    if (Number.isNaN(date.getTime())) {
      return String(rawTimestamp ?? value ?? "");
    }

    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex w-full flex-row items-center justify-between">
        <div className="flex flex-1 items-center gap-4">
          <Image
            src="/logo.png"
            alt="Xandeum Logo"
            width={96}
            height={96}
            className="h-20 w-20"
          />
          <div>
            <h1 className="text-3xl font-bold">Xandeum Network Analytics</h1>
            <p className="text-muted-foreground">
              Real-time monitoring of the Xandeum network
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="default">
            <Link href="/map">
              <HugeiconsIcon icon={Globe02Icon} strokeWidth={2} />
              <span className="ml-2">View Map</span>
            </Link>
          </Button>
          <ThemeToggleButton />
        </div>
      </div>

      {/* Stats Info */}
      <div className="flex gap-6">
        <div>
          <span className="text-muted-foreground text-sm">Total Nodes: </span>
          <span className="font-semibold">{stats.totalNodes}</span>
        </div>
        <div>
          <span className="text-muted-foreground text-sm">
            Total Public Keys:{" "}
          </span>
          <span className="font-semibold">{totalPublicKeys}</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Nodes (Active of Total) */}
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Nodes
            </CardTitle>
          </CardHeader>
          <CardContent className="flex h-full flex-col gap-3">
            <div className="mb-2 flex items-baseline gap-2">
              <div className="text-3xl font-bold">{stats.activeNodes}</div>
              <span className="text-muted-foreground text-sm">
                of {stats.totalNodes} total
              </span>
            </div>
            <div className="mt-auto flex items-center gap-2">
              <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                <div
                  className="bg-chart-2 h-full rounded-full transition-all"
                  style={{
                    width: `${
                      stats.totalNodes > 0
                        ? (stats.activeNodes / stats.totalNodes) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <Badge variant="outline" className="text-xs">
                {stats.totalNodes > 0
                  ? ((stats.activeNodes / stats.totalNodes) * 100).toFixed(1)
                  : "0.0"}
                %
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs">
              Active nodes currently online
            </p>
          </CardContent>
        </Card>

        {/* Network Health */}
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Network Health
            </CardTitle>
          </CardHeader>
          <CardContent className="flex h-full flex-col gap-3">
            <div className="mb-2 flex items-baseline gap-2">
              <div className="text-3xl font-bold">
                {stats.networkHealth.toFixed(1)}
              </div>
              <span className="text-muted-foreground text-sm">/ 100</span>
            </div>
            <div className="mt-auto flex items-center gap-2">
              <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                <div
                  className="bg-chart-3 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(0, stats.networkHealth))}%`,
                  }}
                />
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              Health score (0-100)
            </p>
          </CardContent>
        </Card>

        {/* Average Uptime */}
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Average Uptime
            </CardTitle>
          </CardHeader>
          <CardContent className="flex h-full flex-col gap-3">
            <div className="mb-2 flex items-baseline gap-2">
              <div className="text-3xl font-bold">
                {stats.averageUptime.toFixed(1)}
              </div>
              <span className="text-muted-foreground text-sm">%</span>
            </div>
            <div className="mt-auto flex items-center gap-2">
              <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                <div
                  className="bg-chart-4 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(0, stats.averageUptime))}%`,
                  }}
                />
              </div>
            </div>
            <p className="text-muted-foreground text-xs">Network average</p>
          </CardContent>
        </Card>

        {/* Storage Usage */}
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Storage Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="flex h-full flex-col gap-3">
            <div className="mb-2 flex items-baseline gap-2">
              <div className="text-3xl font-bold">
                {formatBytes(stats.usedStorage)}
              </div>
              <span className="text-muted-foreground text-sm">
                of {formatBytes(stats.totalStorage)}
              </span>
            </div>
            <div className="mt-auto flex items-center gap-2">
              <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                <div
                  className="bg-chart-5 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(0, storageUsagePercent))}%`,
                  }}
                />
              </div>
              <Badge variant="outline" className="text-xs">
                {storageUsagePercent.toFixed(1)}%
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs">
              Actual storage used vs total capacity
            </p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Status Distribution Pie Chart */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Node Status Distribution</CardTitle>
              <CardDescription>
                Current status of all network nodes
              </CardDescription>
            </div>
            <ChartInfoHover
              ariaLabel="Node status chart info"
              items={[
                {
                  label: "Data source",
                  value: "Latest network stats + nodes list",
                },
                {
                  label: "Metrics",
                  value: "Active, inactive, syncing node counts",
                },
                { label: "Time", value: "Current snapshot" },
              ]}
              docsAnchor="node-status-distribution-pie-chart"
            />
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-75">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => `${entry.name}: ${entry.value}`}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Storage Usage Pie Chart */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Storage Usage</CardTitle>
              <CardDescription>
                Used vs available storage (Total:{" "}
                {(stats.totalStorage / 1024 ** 3).toFixed(2)} GB)
              </CardDescription>
            </div>
            <ChartInfoHover
              ariaLabel="Storage usage chart info"
              items={[
                { label: "Data source", value: "Latest network stats" },
                { label: "Metrics", value: "Used vs available storage (GB)" },
                { label: "Time", value: "Current snapshot" },
              ]}
              docsAnchor="storage-usage-pie-chart"
            />
          </CardHeader>
          <CardContent>
            <ChartContainer config={storageChartConfig} className="h-75">
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => `${Number(value).toFixed(2)} GB`}
                    />
                  }
                />
                <Pie
                  data={storageData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  label={({ name, value }) =>
                    `${name}: ${Number(value).toFixed(2)} GB`
                  }
                />
                <Legend />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Historical Trends Section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Historical Trends</h2>
            <p className="text-muted-foreground">Network activity over time</p>
          </div>
          <Select
            value={String(timeRange)}
            onValueChange={(v) => setTimeRange(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Hour</SelectItem>
              <SelectItem value="6">6 Hours</SelectItem>
              <SelectItem value="24">24 Hours</SelectItem>
              <SelectItem value="168">7 Days</SelectItem>
              <SelectItem value="720">30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Active Nodes Over Time */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>Active Nodes Trend</CardTitle>
                <CardDescription>
                  Node activity over the last {timeRange} hours
                </CardDescription>
              </div>
              <ChartInfoHover
                ariaLabel="Active nodes trend info"
                items={[
                  { label: "Data source", value: "Network history API" },
                  {
                    label: "Metrics",
                    value: "Total vs active nodes over time",
                  },
                  { label: "Time range", value: `${timeRange}-hour window` },
                ]}
                docsAnchor="active-nodes-trend-line-chart"
              />
            </CardHeader>
            <CardContent>
              {!networkHistory ? (
                <Skeleton className="h-75 w-full" />
              ) : networkHistory.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center text-sm">
                  No historical data available for this range.
                </div>
              ) : (
                <ChartContainer config={chartConfig} className="h-75">
                  <LineChart data={networkHistory}>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={formatTooltipTimestamp}
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
                      dataKey="totalNodes"
                      stroke="var(--chart-1)"
                      name="Total Nodes"
                      strokeWidth={2}
                      dot={false}
                      activeDot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="activeNodes"
                      stroke="var(--chart-2)"
                      name="Active Nodes"
                      strokeWidth={2}
                      dot={false}
                      activeDot={false}
                    />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Storage Trend */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>Storage Trend</CardTitle>
                <CardDescription>
                  Storage usage over the last {timeRange} hours
                </CardDescription>
              </div>
              <ChartInfoHover
                ariaLabel="Storage trend info"
                items={[
                  { label: "Data source", value: "Network history API" },
                  {
                    label: "Metrics",
                    value: "Total vs used storage (GB) over time",
                  },
                  { label: "Time range", value: `${timeRange}-hour window` },
                ]}
                docsAnchor="storage-trend-line-chart"
              />
            </CardHeader>
            <CardContent>
              {!networkHistory ? (
                <Skeleton className="h-75 w-full" />
              ) : networkHistory.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center text-sm">
                  No historical data available for this range.
                </div>
              ) : (
                <ChartContainer config={chartConfig} className="h-75">
                  <LineChart
                    data={networkHistory.map((point) => ({
                      ...point,
                      totalStorage: point.totalStorage / 1024 ** 3,
                      usedStorage: point.usedStorage / 1024 ** 3,
                    }))}>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={formatTooltipTimestamp}
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
                      dataKey="totalStorage"
                      stroke="var(--chart-1)"
                      name="Total Storage (GB)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="usedStorage"
                      stroke="var(--chart-2)"
                      name="Used Storage (GB)"
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
      </div>

      <Separator />

      {/* Nodes Table */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Network Nodes</CardTitle>
            <CardDescription>
              All pNodes on the network with sortable columns
            </CardDescription>
          </div>
          <ChartInfoHover
            ariaLabel="Network nodes table info"
            items={[
              { label: "Data source", value: "Latest nodes snapshot" },
              {
                label: "Metrics",
                value: "Grouped by pubkey, addresses, storage",
              },
              { label: "Time", value: "Current snapshot (sortable)" },
            ]}
            docsAnchor="data-source"
          />
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={nodeGroups}
            filterPlaceholder="Search by public key or IP..."
          />
        </CardContent>
      </Card>

      <Separator />

      {/* Footer */}
      <footer className="border-t pt-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="Xandeum Logo"
                width={24}
                height={24}
                className="h-6 w-6"
              />
              <span className="font-semibold">Xandeum Network Analytics</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Real-time monitoring and analytics for the Xandeum network
            </p>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:gap-8">
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">Resources</h3>
              <div className="flex flex-col gap-1.5 text-sm">
                <a
                  href="https://github.com/Code-Parth/xandeum-analytics-ui"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  GitHub Repository
                </a>
                <a
                  href="https://github.com/Code-Parth/xandeum-analytics-ui/blob/main/docs/METRICS_DOCUMENTATION.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  Metrics Documentation
                </a>
                <a
                  href="https://github.com/Code-Parth/xandeum-analytics-cron-bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  Cron Bot Repository
                </a>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">Xandeum Network</h3>
              <div className="flex flex-col gap-1.5 text-sm">
                <a
                  href="https://xandeum.network"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  Official Website
                </a>
                <a
                  href="https://docs.xandeum.network"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  Documentation
                </a>
                <a
                  href="https://discord.gg/uqRSmmM5m"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  Discord Community
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t pt-6">
          <p className="text-muted-foreground text-center text-xs">
            Built for the Xandeum Labs analytics platform challenge on{" "}
            <a
              href="https://earn.superteam.fun"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground underline transition-colors">
              Superteam Earn
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
