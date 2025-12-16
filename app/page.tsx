"use client";
import Link from "next/link";
import { useState } from "react";
import { formatBytes } from "@/lib/utils";
import { useNodes, useNetworkStats, useNetworkHistory } from "@/hooks";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { NodeStatus } from "@/types";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { ThemeToggleButton } from "@/components/ui/theme-toggle-button";
import { Skeleton } from "@/components/ui/skeleton";

function formatLastSeen(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

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

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<number>(24); // hours

  // Fetch historical network data
  const { data: networkHistory } = useNetworkHistory({ hours: timeRange });

  // Loading state
  if (nodesLoading || statsLoading) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        {/* Header Skeleton */}
        <div className="flex w-full flex-row items-center justify-between">
          <div className="flex-1">
            <Skeleton className="h-9 w-80 mb-2" />
            <Skeleton className="h-5 w-64 mb-3" />
            <div className="mt-3 flex gap-6">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-40" />
            </div>
          </div>
          <Skeleton className="h-9 w-9 rounded" />
        </div>

        {/* Stat Cards Skeleton */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
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
                <Skeleton className="h-6 w-48 mb-2" />
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
              <Skeleton className="h-7 w-48 mb-2" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-40 mb-2" />
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
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48 mb-4" />
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

  // Helper functions
  const getStatusBadge = (status: NodeStatus) => {
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

  const truncateKey = (key: string) => {
    if (key.length <= 16) return key;
    return `${key.slice(0, 8)}...${key.slice(-8)}`;
  };

  const formatUptime = (uptime: number) => `${uptime.toFixed(1)}%`;

  // Group nodes by public key (one row per pubkey).
  // Nodes without a pubkey are grouped by their unique id (one row per address).
  const nodeGroups = (() => {
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

        const versionsSet = new Set(
          groupNodes.map((n) => n.version).filter(Boolean),
        );
        const versions = Array.from(versionsSet);

        const status: NodeStatus = groupNodes.some((n) => n.status === "active")
          ? "active"
          : groupNodes.some((n) => n.status === "syncing")
            ? "syncing"
            : "inactive";

        const uptime =
          groupNodes.length > 0
            ? groupNodes.reduce((sum, n) => sum + n.uptime, 0) /
              groupNodes.length
            : 0;

        const lastSeen = sortedByLastSeen[0]?.lastSeen ?? new Date(0);

        const totalStorageCapacity = groupNodes.reduce(
          (sum, n) => sum + (n.performance?.storageCapacity || 0),
          0,
        );
        const totalStorageUsed = groupNodes.reduce(
          (sum, n) => sum + (n.performance?.storageUsed || 0),
          0,
        );

        const addresses = groupNodes.map((n) => ({
          id: n.id,
          ipAddress: n.ipAddress,
          port: n.port,
        }));

        return {
          key,
          pubkey,
          primary,
          status,
          versions,
          uptime,
          lastSeen,
          totalStorageCapacity,
          totalStorageUsed,
          addresses,
        };
      },
    );
  })();

  // Calculate total unique public keys
  const totalPublicKeys = new Set(
    nodes.map((n) => n.publicKey).filter((pk): pk is string => !!pk),
  ).size;

  // Filter groups based on search and status
  const filteredGroups = nodeGroups.filter((group) => {
    const search = searchQuery.toLowerCase();

    const matchesSearch =
      search === "" ||
      (group.pubkey ?? "").toLowerCase().includes(search) ||
      group.addresses.some(({ ipAddress }) =>
        ipAddress.toLowerCase().includes(search),
      );

    const matchesStatus =
      statusFilter === "all" || group.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
      name: "Storage",
      total: stats.totalStorage / 1024 ** 3,
      used: stats.usedStorage / 1024 ** 3,
    },
  ];

  const chartConfig = {
    total: {
      label: "Total Capacity",
      color: "var(--chart-1)",
    },
    used: {
      label: "Used",
      color: "var(--chart-2)",
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
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Xandeum Network Analytics</h1>
          <p className="text-muted-foreground">
            Real-time monitoring of the Xandeum network
          </p>
          <div className="mt-3 flex gap-6">
            <div>
              <span className="text-muted-foreground text-sm">
                Total Nodes:{" "}
              </span>
              <span className="font-semibold">{stats.totalNodes}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-sm">
                Total Public Keys:{" "}
              </span>
              <span className="font-semibold">{totalPublicKeys}</span>
            </div>
          </div>
        </div>
        <ThemeToggleButton />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total Nodes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalNodes}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              Network participants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Active Nodes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{stats.activeNodes}</div>
              <Badge variant="default">
                {stats.totalNodes > 0
                  ? ((stats.activeNodes / stats.totalNodes) * 100).toFixed(1)
                  : "0.0"}
                %
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Currently online
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Network Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.networkHealth.toFixed(1)}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Health score (0-100)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Average Uptime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatUptime(stats.averageUptime)}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Network average
            </p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Status Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Node Status Distribution</CardTitle>
            <CardDescription>
              Current status of all network nodes
            </CardDescription>
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

        {/* Storage Usage Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Storage Usage</CardTitle>
            <CardDescription>Total capacity vs used storage</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-75">
              <BarChart data={storageData}>
                <ChartTooltip content={<ChartTooltipContent />} />
                <XAxis dataKey="name" />
                <YAxis />
                <Legend />
                <Bar
                  dataKey="total"
                  fill="var(--color-total)"
                  name="Total Capacity (GB)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="used"
                  fill="var(--color-used)"
                  name="Used (GB)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
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
            <CardHeader>
              <CardTitle>Active Nodes Trend</CardTitle>
              <CardDescription>
                Node activity over the last {timeRange} hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!networkHistory ? (
                <Skeleton className="h-75 w-full" />
              ) : networkHistory.length === 0 ? (
                <div className="text-muted-foreground text-sm text-center py-8">
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
            <CardHeader>
              <CardTitle>Storage Trend</CardTitle>
              <CardDescription>
                Storage usage over the last {timeRange} hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!networkHistory ? (
                <Skeleton className="h-75 w-full" />
              ) : networkHistory.length === 0 ? (
                <div className="text-muted-foreground text-sm text-center py-8">
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
        <CardHeader>
          <CardTitle>Network Nodes</CardTitle>
          <CardDescription>
            Showing {filteredGroups.length} of {nodeGroups.length} pubkeys
          </CardDescription>
          <div className="mt-4 flex gap-4">
            <Input
              placeholder="Search by public key or IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-45">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="syncing">Syncing</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Public Key</TableHead>
                  <TableHead>Addresses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Versions</TableHead>
                  <TableHead>Uptime</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Storage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-muted-foreground text-center">
                      No nodes found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGroups.map((group) => (
                    <TableRow key={group.key}>
                      <TableCell className="font-mono text-sm">
                        {group.pubkey ? (
                          <Link
                            href={`/node/${group.pubkey}`}
                            className="text-primary hover:underline">
                            {truncateKey(group.pubkey)}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Unknown</span>
                        )}
                      </TableCell>
                      <TableCell className="space-y-1 text-xs">
                        {group.addresses.map((addr) => (
                          <div key={addr.id} className="text-muted-foreground">
                            {addr.ipAddress}:{addr.port}
                          </div>
                        ))}
                      </TableCell>
                      <TableCell>{getStatusBadge(group.status)}</TableCell>
                      <TableCell className="font-mono text-sm">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline">
                            {group.primary.version}
                          </Badge>
                          {group.versions
                            .filter((v) => v !== group.primary.version)
                            .map((version) => (
                              <Badge
                                key={version}
                                variant="secondary"
                                className="text-[10px]">
                                {version}
                              </Badge>
                            ))}
                        </div>
                      </TableCell>
                      <TableCell>{formatUptime(group.uptime)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatLastSeen(group.lastSeen)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {group.totalStorageCapacity || group.totalStorageUsed
                          ? (() => {
                              const used = group.totalStorageUsed;
                              const total = group.totalStorageCapacity;
                              const percent =
                                total > 0 ? (used / total) * 100 : undefined;
                              return (
                                <span>
                                  {formatBytes(used)} / {formatBytes(total)}
                                  {percent !== undefined &&
                                    !Number.isNaN(percent) && (
                                      <span> ({percent.toFixed(1)}%)</span>
                                    )}
                                </span>
                              );
                            })()
                          : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
