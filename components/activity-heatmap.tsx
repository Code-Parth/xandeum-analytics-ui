"use client";

import { useMemo } from "react";
import type { HeatmapCell } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ChartInfoHover } from "@/components/chart-info-hover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ActivityHeatmapProps {
  data: HeatmapCell[] | undefined;
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
  // Organize data into a grid structure
  const grid = useMemo(() => {
    if (!data) return null;

    const cellMap = new Map<string, HeatmapCell>();
    for (const cell of data) {
      cellMap.set(`${cell.dayOfWeek}-${cell.hour}`, cell);
    }

    return cellMap;
  }, [data]);

  // Calculate overall stats
  const stats = useMemo(() => {
    if (!data) return null;

    const cellsWithData = data.filter((c) => c.totalSnapshots > 0);
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
  }, [data]);

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

  if (!data || data.length === 0 || !grid) {
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
              { label: "Metrics", value: "Activity by day/hour" },
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
        <div>
          <CardTitle>Activity Heatmap</CardTitle>
          <CardDescription>
            Activity patterns by day of week and hour
          </CardDescription>
          <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <span
                className="inline-block h-3 w-3 rounded"
                style={{ backgroundColor: "var(--chart-2)" }}
              />
              <span>Active</span>
            </div>
            <div className="flex items-center gap-1">
              <span
                className="inline-block h-3 w-3 rounded"
                style={{ backgroundColor: "var(--muted)" }}
              />
              <span>No data</span>
            </div>
            <div className="flex items-center gap-1">
              <span
                className="inline-block h-3 w-3 rounded"
                style={{ backgroundColor: "var(--destructive)" }}
              />
              <span>Inactive</span>
            </div>
          </div>
        </div>
        <ChartInfoHover
          ariaLabel="Activity heatmap info"
          items={[
            { label: "Data source", value: "Historical snapshots" },
            { label: "Metrics", value: "Activity % by day/hour bucket" },
            { label: "Time range", value: `${days}-day window` },
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
                                  <div>Activity: {percent.toFixed(1)}%</div>
                                  <div>
                                    Snapshots: {cell?.activeSnapshots ?? 0} /{" "}
                                    {cell?.totalSnapshots ?? 0}
                                  </div>
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
              <div className="text-lg font-semibold">
                {stats.overallPercent.toFixed(1)}%
              </div>
            </div>
            <div className="rounded border px-3 py-2">
              <div className="text-muted-foreground text-xs">Data Coverage</div>
              <div className="text-lg font-semibold">
                {stats.cellsWithData} / 168 hrs
              </div>
            </div>
            {stats.mostActive && (
              <div className="rounded border px-3 py-2">
                <div className="text-muted-foreground text-xs">Most Active</div>
                <div className="text-sm font-medium">
                  {DAYS_OF_WEEK[stats.mostActive.dayOfWeek]}{" "}
                  {formatHour(stats.mostActive.hour)}
                </div>
                <div className="text-muted-foreground text-xs">
                  {stats.mostActive.activityPercent.toFixed(1)}%
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
                <div className="text-muted-foreground text-xs">
                  {stats.leastActive.activityPercent.toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
