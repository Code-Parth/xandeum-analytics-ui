"use client";

import { useMemo, useState } from "react";
import type { AddressHeatmapData, HeatmapCell } from "@/types";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ActivityHeatmapProps {
  data: AddressHeatmapData[] | undefined;
  isLoading: boolean;
  error: Error | null;
  days: number;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getActivityColor(percent: number, hasData: boolean): string {
  if (!hasData) return "var(--muted)";
  if (percent >= 90) return "var(--chart-2)"; // Green - highly active
  if (percent >= 70)
    return "color-mix(in srgb, var(--chart-2) 80%, var(--muted) 20%)";
  if (percent >= 50)
    return "color-mix(in srgb, var(--chart-2) 60%, var(--muted) 40%)";
  if (percent >= 30)
    return "color-mix(in srgb, var(--chart-2) 40%, var(--muted) 60%)";
  if (percent > 0)
    return "color-mix(in srgb, var(--chart-2) 20%, var(--muted) 80%)";
  return "var(--destructive)"; // Red - no activity when data exists
}

function getActivityLevel(percent: number): string {
  if (percent >= 90) return "Highly Active";
  if (percent >= 70) return "Active";
  if (percent >= 50) return "Moderate";
  if (percent >= 30) return "Low";
  if (percent > 0) return "Very Low";
  return "Inactive";
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

export function ActivityHeatmap({
  data,
  isLoading,
  error,
  days,
}: ActivityHeatmapProps) {
  const [selectedAddress, setSelectedAddress] = useState<string>("all");

  // Get addresses for dropdown
  const addresses = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((d) => d.address);
  }, [data]);

  // Get current heatmap data based on selection
  const currentData = useMemo(() => {
    if (!data || data.length === 0) return null;

    if (selectedAddress === "all") {
      // Aggregate all addresses into one view
      const aggregatedCells: HeatmapCell[] = [];
      const cellMap = new Map<
        string,
        { total: number; active: number; count: number }
      >();

      // Initialize all cells
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          cellMap.set(`${day}-${hour}`, { total: 0, active: 0, count: 0 });
        }
      }

      // Aggregate from all addresses
      for (const addressData of data) {
        for (const cell of addressData.cells) {
          const key = `${cell.dayOfWeek}-${cell.hour}`;
          const existing = cellMap.get(key)!;
          existing.total += cell.totalSnapshots;
          existing.active += cell.activeSnapshots;
          existing.count++;
        }
      }

      // Convert to HeatmapCell array
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          const key = `${day}-${hour}`;
          const cell = cellMap.get(key)!;
          aggregatedCells.push({
            dayOfWeek: day,
            hour,
            totalSnapshots: cell.total,
            activeSnapshots: cell.active,
            activityPercent:
              cell.total > 0 ? (cell.active / cell.total) * 100 : 0,
          });
        }
      }

      return {
        address: "all",
        cells: aggregatedCells,
        totalSnapshots: data.reduce((sum, d) => sum + d.totalSnapshots, 0),
        overallActivityPercent:
          data.length > 0
            ? data.reduce(
                (sum, d) => sum + d.overallActivityPercent * d.totalSnapshots,
                0,
              ) / data.reduce((sum, d) => sum + d.totalSnapshots, 0)
            : 0,
      } satisfies AddressHeatmapData;
    }

    // Find specific address
    return data.find((d) => d.address === selectedAddress) || null;
  }, [data, selectedAddress]);

  // Organize data into a grid structure
  const grid = useMemo(() => {
    if (!currentData) return null;

    const cellMap = new Map<string, HeatmapCell>();
    for (const cell of currentData.cells) {
      cellMap.set(`${cell.dayOfWeek}-${cell.hour}`, cell);
    }

    return cellMap;
  }, [currentData]);

  // Calculate stats for the current selection
  const stats = useMemo(() => {
    if (!currentData) return null;

    const cellsWithData = currentData.cells.filter((c) => c.totalSnapshots > 0);
    if (cellsWithData.length === 0) return null;

    const totalActive = cellsWithData.reduce(
      (sum, c) => sum + c.activeSnapshots,
      0,
    );
    const totalSnapshots = cellsWithData.reduce(
      (sum, c) => sum + c.totalSnapshots,
      0,
    );

    // Find most active and least active times
    const sortedByActivity = [...cellsWithData].sort(
      (a, b) => b.activityPercent - a.activityPercent,
    );
    const mostActive = sortedByActivity[0];
    const leastActive = sortedByActivity[sortedByActivity.length - 1];

    return {
      overallPercent:
        totalSnapshots > 0 ? (totalActive / totalSnapshots) * 100 : 0,
      cellsWithData: cellsWithData.length,
      mostActive,
      leastActive,
    };
  }, [currentData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Activity Heatmap</CardTitle>
            <CardDescription>Loading activity patterns...</CardDescription>
            {/* Legend skeleton */}
            <div className="mt-2 flex flex-wrap items-center gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-1">
                  <Skeleton className="h-3 w-3 rounded" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
          </div>
          <Skeleton className="h-5 w-5 rounded-full" />
        </CardHeader>
        <CardContent>
          {/* Heatmap Grid skeleton */}
          <div className="overflow-x-auto">
            <div className="min-w-[500px]">
              {/* Header row with days */}
              <div className="mb-1 flex">
                <div className="w-12 shrink-0" />
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day} className="flex flex-1 justify-center">
                    <Skeleton className="h-3 w-6" />
                  </div>
                ))}
              </div>

              {/* Grid rows */}
              <div className="space-y-0.5">
                {HOURS.map((hour) => (
                  <div key={hour} className="flex items-center gap-0.5">
                    {/* Hour label */}
                    <div className="w-12 shrink-0 pr-2 text-right">
                      {hour % 3 === 0 && (
                        <Skeleton className="ml-auto h-3 w-10" />
                      )}
                    </div>
                    {/* Day cells */}
                    {DAYS_OF_WEEK.map((_, dayIndex) => (
                      <Skeleton
                        key={`${dayIndex}-${hour}`}
                        className="h-4 flex-1 rounded-sm"
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stats summary skeleton */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "w-24", value: "w-16" },
              { label: "w-24", value: "w-20" },
              { label: "w-20", value: "w-24" },
              { label: "w-20", value: "w-24" },
            ].map((item, i) => (
              <div key={i} className="rounded border px-3 py-2">
                <Skeleton className={`mb-1 h-3 ${item.label}`} />
                <Skeleton className={`h-5 ${item.value}`} />
              </div>
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
          <CardTitle>Activity Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-destructive text-sm">
            Failed to load heatmap: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0 || !grid || !currentData) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Activity Heatmap</CardTitle>
            <CardDescription>Activity patterns by day and hour</CardDescription>
          </div>
          <ChartInfoHover
            ariaLabel="Activity heatmap info"
            items={[
              { label: "Data source", value: "Historical snapshots" },
              { label: "Metrics", value: "Activity by day/hour per address" },
              { label: "Time range", value: `${days}-day window` },
            ]}
            docsAnchor="activity-heatmap"
          />
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground py-8 text-center text-sm">
            No activity data available for this time range.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="flex-1">
          <CardTitle>Activity Heatmap</CardTitle>
          <CardDescription className="mt-1">
            Activity patterns by day of week and hour
            {selectedAddress !== "all" && (
              <span className="text-foreground ml-1 font-medium">
                for {selectedAddress}
              </span>
            )}
          </CardDescription>

          {/* Address Selection - Per-Address Activity Summary at TOP */}
          {addresses.length > 0 && (
            <div className="mt-3 rounded-lg border p-3">
              <div className="text-muted-foreground mb-2 text-xs font-medium">
                Select Address to View:
              </div>
              <div className="flex flex-wrap gap-2">
                {/* All Addresses option */}
                {addresses.length > 1 && (
                  <button
                    onClick={() => setSelectedAddress("all")}
                    className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors ${
                      selectedAddress === "all"
                        ? "border-primary bg-primary/10 ring-primary/20 ring-2"
                        : "hover:bg-muted"
                    }`}>
                    <span className="font-medium">All Addresses</span>
                    <Badge variant="outline" className="h-5 text-[10px]">
                      {addresses.length}
                    </Badge>
                  </button>
                )}
                {/* Individual address options */}
                {data?.map((addrData) => (
                  <button
                    key={addrData.address}
                    onClick={() => setSelectedAddress(addrData.address)}
                    className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors ${
                      selectedAddress === addrData.address
                        ? "border-primary bg-primary/10 ring-primary/20 ring-2"
                        : "hover:bg-muted"
                    }`}>
                    <span className="font-mono">{addrData.address}</span>
                    <Badge
                      variant={
                        addrData.overallActivityPercent >= 70
                          ? "default"
                          : addrData.overallActivityPercent >= 30
                            ? "secondary"
                            : "destructive"
                      }
                      className="h-5 text-[10px]">
                      {addrData.overallActivityPercent.toFixed(0)}%
                    </Badge>
                    <span className="text-muted-foreground">
                      ({addrData.totalSnapshots} snapshots)
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Activity Levels Legend */}
          <div className="mt-3 space-y-2">
            <div className="text-muted-foreground text-xs font-medium">
              Activity Levels:
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Gradient scale */}
              <div className="flex items-center gap-1">
                <div className="flex h-4 overflow-hidden rounded">
                  <span
                    className="h-4 w-4"
                    style={{ backgroundColor: getActivityColor(100, true) }}
                    title="90-100%"
                  />
                  <span
                    className="h-4 w-4"
                    style={{ backgroundColor: getActivityColor(75, true) }}
                    title="70-89%"
                  />
                  <span
                    className="h-4 w-4"
                    style={{ backgroundColor: getActivityColor(55, true) }}
                    title="50-69%"
                  />
                  <span
                    className="h-4 w-4"
                    style={{ backgroundColor: getActivityColor(35, true) }}
                    title="30-49%"
                  />
                  <span
                    className="h-4 w-4"
                    style={{ backgroundColor: getActivityColor(15, true) }}
                    title="1-29%"
                  />
                </div>
                <span className="text-muted-foreground ml-1 text-xs">
                  Active (100% → 1%)
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span
                  className="inline-block h-4 w-4 rounded"
                  style={{ backgroundColor: "var(--destructive)" }}
                />
                <span className="text-muted-foreground text-xs">
                  0% (Inactive)
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span
                  className="inline-block h-4 w-4 rounded opacity-30"
                  style={{ backgroundColor: "var(--muted)" }}
                />
                <span className="text-muted-foreground text-xs">No data</span>
              </div>
            </div>
          </div>
        </div>
        <ChartInfoHover
          ariaLabel="Activity heatmap info"
          items={[
            { label: "Data source", value: "Historical snapshots" },
            { label: "Metrics", value: "Activity % by day/hour per address" },
            { label: "Time range", value: `${days}-day window` },
            {
              label: "Addresses",
              value:
                addresses.length > 1
                  ? `${addresses.length} addresses (click to select)`
                  : addresses[0] || "N/A",
            },
          ]}
          docsAnchor="activity-heatmap"
        />
      </CardHeader>
      <CardContent>
        {/* Heatmap Grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[500px]">
            {/* Header row with days */}
            <div className="mb-1 flex">
              <div className="w-12 shrink-0" /> {/* Spacer for hour labels */}
              {DAYS_OF_WEEK.map((day) => (
                <div
                  key={day}
                  className="text-muted-foreground flex-1 text-center text-xs font-medium">
                  {day}
                </div>
              ))}
            </div>

            {/* Grid rows */}
            <TooltipProvider delayDuration={100}>
              <div className="space-y-0.5">
                {HOURS.map((hour) => (
                  <div key={hour} className="flex items-center gap-0.5">
                    {/* Hour label */}
                    <div className="text-muted-foreground w-12 shrink-0 pr-2 text-right text-xs">
                      {hour % 3 === 0 ? formatHour(hour) : ""}
                    </div>

                    {/* Day cells */}
                    {DAYS_OF_WEEK.map((_, dayIndex) => {
                      const cell = grid.get(`${dayIndex}-${hour}`);
                      const hasData = cell && cell.totalSnapshots > 0;
                      const percent = cell?.activityPercent ?? 0;

                      return (
                        <Tooltip key={`${dayIndex}-${hour}`}>
                          <TooltipTrigger asChild>
                            <div
                              className="h-4 flex-1 cursor-pointer rounded-sm transition-opacity hover:opacity-80"
                              style={{
                                backgroundColor: getActivityColor(
                                  percent,
                                  !!hasData,
                                ),
                                opacity: hasData ? 1 : 0.3,
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1 text-xs">
                              <div className="font-medium">
                                {DAYS_OF_WEEK[dayIndex]} {formatHour(hour)}
                              </div>
                              {hasData ? (
                                <>
                                  <div className="flex items-center gap-2">
                                    <span>Activity:</span>
                                    <span className="font-semibold">
                                      {percent.toFixed(1)}%
                                    </span>
                                    <Badge
                                      variant={
                                        percent >= 70
                                          ? "default"
                                          : percent >= 30
                                            ? "secondary"
                                            : "destructive"
                                      }
                                      className="h-5 text-[10px]">
                                      {getActivityLevel(percent)}
                                    </Badge>
                                  </div>
                                  <div className="text-muted-foreground">
                                    Active snapshots:{" "}
                                    {cell?.activeSnapshots ?? 0} /{" "}
                                    {cell?.totalSnapshots ?? 0}
                                  </div>
                                  {selectedAddress === "all" &&
                                    addresses.length > 1 && (
                                      <div className="text-muted-foreground">
                                        Aggregated across {addresses.length}{" "}
                                        addresses
                                      </div>
                                    )}
                                </>
                              ) : (
                                <div className="text-muted-foreground">
                                  No data for this time slot
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </div>
            </TooltipProvider>
          </div>
        </div>

        {/* Stats summary */}
        {stats && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded border px-3 py-2">
              <div className="text-muted-foreground text-xs">
                Overall Activity
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">
                  {stats.overallPercent.toFixed(1)}%
                </span>
                <Badge
                  variant={
                    stats.overallPercent >= 70
                      ? "default"
                      : stats.overallPercent >= 30
                        ? "secondary"
                        : "destructive"
                  }
                  className="text-[10px]">
                  {getActivityLevel(stats.overallPercent)}
                </Badge>
              </div>
            </div>
            <div className="rounded border px-3 py-2">
              <div className="text-muted-foreground text-xs">Data Coverage</div>
              <div className="text-lg font-semibold">
                {stats.cellsWithData} / 168 hrs
              </div>
              <div className="text-muted-foreground text-xs">
                {((stats.cellsWithData / 168) * 100).toFixed(0)}% coverage
              </div>
            </div>
            {stats.mostActive && (
              <div className="rounded border px-3 py-2">
                <div className="text-muted-foreground text-xs">Most Active</div>
                <div className="text-sm font-medium">
                  {DAYS_OF_WEEK[stats.mostActive.dayOfWeek]}{" "}
                  {formatHour(stats.mostActive.hour)}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-xs">
                    {stats.mostActive.activityPercent.toFixed(1)}%
                  </span>
                  <Badge variant="default" className="h-4 text-[9px]">
                    {getActivityLevel(stats.mostActive.activityPercent)}
                  </Badge>
                </div>
              </div>
            )}
            {stats.leastActive && stats.leastActive.totalSnapshots > 0 && (
              <div className="rounded border px-3 py-2">
                <div className="text-muted-foreground text-xs">
                  Least Active
                </div>
                <div className="text-sm font-medium">
                  {DAYS_OF_WEEK[stats.leastActive.dayOfWeek]}{" "}
                  {formatHour(stats.leastActive.hour)}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-xs">
                    {stats.leastActive.activityPercent.toFixed(1)}%
                  </span>
                  <Badge
                    variant={
                      stats.leastActive.activityPercent > 0
                        ? "secondary"
                        : "destructive"
                    }
                    className="h-4 text-[9px]">
                    {getActivityLevel(stats.leastActive.activityPercent)}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
