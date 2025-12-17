"use client";

import { useMemo } from "react";
import type { AddressActivitySummary, ActivityPeriod } from "@/types";
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

interface ActivityTimelineProps {
  data: AddressActivitySummary[] | undefined;
  isLoading: boolean;
  error: Error | null;
  startTime: Date | undefined;
  endTime: Date | undefined;
  hours: number;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24)
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

function formatTime(date: Date): string {
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Truncate address for display
function truncateAddress(addr: string) {
  if (addr.length <= 20) return addr;
  return `${addr.slice(0, 10)}...${addr.slice(-6)}`;
}

interface TimelineRowProps {
  address: string;
  periods: ActivityPeriod[];
  totalDurationMs: number;
  startTime: Date;
}

function TimelineRow({
  address,
  periods,
  totalDurationMs,
  startTime,
}: TimelineRowProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-muted-foreground w-32 shrink-0 truncate text-right font-mono text-xs">
        {truncateAddress(address)}
      </div>
      <div className="bg-muted/30 relative h-6 flex-1 rounded">
        <TooltipProvider delayDuration={100}>
          {periods.map((period, idx) => {
            const periodStart = new Date(period.startTime);
            const offsetMs = periodStart.getTime() - startTime.getTime();
            const leftPercent = (offsetMs / totalDurationMs) * 100;
            const widthPercent = (period.durationMs / totalDurationMs) * 100;

            // Ensure minimum width for visibility
            const minWidth = 0.5;
            const displayWidth = Math.max(widthPercent, minWidth);

            return (
              <Tooltip key={`${address}-${idx}`}>
                <TooltipTrigger asChild>
                  <div
                    className="absolute top-0 h-full cursor-pointer transition-opacity hover:opacity-80"
                    style={{
                      left: `${Math.max(0, Math.min(leftPercent, 100))}%`,
                      width: `${Math.min(displayWidth, 100 - leftPercent)}%`,
                      backgroundColor:
                        period.status === "active"
                          ? "var(--chart-2)"
                          : "var(--muted-foreground)",
                      opacity: period.status === "active" ? 1 : 0.4,
                      borderRadius:
                        idx === 0
                          ? "4px 0 0 4px"
                          : idx === periods.length - 1
                            ? "0 4px 4px 0"
                            : "0",
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-1 text-xs">
                    <div className="font-medium">{address}</div>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            period.status === "active"
                              ? "var(--chart-2)"
                              : "var(--muted-foreground)",
                        }}
                      />
                      <span className="capitalize">{period.status}</span>
                    </div>
                    <div>Start: {formatTime(new Date(period.startTime))}</div>
                    <div>End: {formatTime(new Date(period.endTime))}</div>
                    <div>Duration: {formatDuration(period.durationMs)}</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>
    </div>
  );
}

export function ActivityTimeline({
  data,
  isLoading,
  error,
  startTime,
  endTime,
  hours,
}: ActivityTimelineProps) {
  const totalDurationMs = useMemo(() => {
    if (!startTime || !endTime) return 0;
    return endTime.getTime() - startTime.getTime();
  }, [startTime, endTime]);

  // Generate time ticks for the axis
  const timeTicks = useMemo(() => {
    if (!startTime || !endTime) return [];

    const ticks: { position: number; label: string }[] = [];
    const start = startTime.getTime();
    const duration = endTime.getTime() - start;

    // Determine interval based on hours
    let intervalMs: number;
    if (hours <= 6) {
      intervalMs = 60 * 60 * 1000; // 1 hour
    } else if (hours <= 24) {
      intervalMs = 4 * 60 * 60 * 1000; // 4 hours
    } else if (hours <= 72) {
      intervalMs = 12 * 60 * 60 * 1000; // 12 hours
    } else {
      intervalMs = 24 * 60 * 60 * 1000; // 1 day
    }

    for (let t = 0; t <= duration; t += intervalMs) {
      const date = new Date(start + t);
      const label =
        hours <= 24
          ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : date.toLocaleDateString([], { month: "short", day: "numeric" });

      ticks.push({
        position: (t / duration) * 100,
        label,
      });
    }

    return ticks;
  }, [startTime, endTime, hours]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
          <CardDescription>Loading activity history...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-destructive text-sm">
            Failed to load activity: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0 || !startTime || !endTime) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Activity Timeline</CardTitle>
            <CardDescription>
              Active and inactive periods over time
            </CardDescription>
          </div>
          <ChartInfoHover
            ariaLabel="Activity timeline info"
            items={[
              { label: "Data source", value: "Historical snapshots" },
              {
                label: "Metrics",
                value: "Active/inactive periods per address",
              },
              { label: "Time range", value: `${hours}-hour window` },
            ]}
            docsAnchor="activity-timeline"
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
          <CardTitle>Activity Timeline</CardTitle>
          <CardDescription>
            Active and inactive periods per address
          </CardDescription>
          <div className="text-muted-foreground mt-2 flex flex-wrap gap-4 text-xs">
            <span className="inline-flex items-center gap-1">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: "var(--chart-2)" }}
              />
              Active
            </span>
            <span className="inline-flex items-center gap-1">
              <span
                aria-hidden
                className="bg-muted-foreground/40 inline-block h-2.5 w-2.5 rounded-full"
              />
              Inactive
            </span>
          </div>
        </div>
        <ChartInfoHover
          ariaLabel="Activity timeline info"
          items={[
            { label: "Data source", value: "Historical snapshots" },
            { label: "Metrics", value: "Active/inactive periods per address" },
            { label: "Time range", value: `${hours}-hour window` },
            { label: "Gap threshold", value: "5 minutes" },
          ]}
          docsAnchor="activity-timeline"
        />
      </CardHeader>
      <CardContent>
        {/* Timeline rows */}
        <div className="space-y-2">
          {data.map((addressData) => (
            <TimelineRow
              key={addressData.address}
              address={addressData.address}
              periods={addressData.periods}
              totalDurationMs={totalDurationMs}
              startTime={startTime}
            />
          ))}
        </div>

        {/* Time axis */}
        <div className="relative mt-2 h-6">
          <div className="ml-[140px] flex-1">
            <div className="relative h-6">
              {timeTicks.map((tick, idx) => (
                <div
                  key={idx}
                  className="text-muted-foreground absolute text-xs"
                  style={{
                    left: `${tick.position}%`,
                    transform: "translateX(-50%)",
                  }}>
                  {tick.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((addressData) => (
            <div
              key={addressData.address}
              className="flex flex-col gap-1 rounded border px-3 py-2 text-sm">
              <div className="text-muted-foreground font-mono text-xs">
                {truncateAddress(addressData.address)}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span>
                  Uptime:{" "}
                  <span className="text-foreground font-medium">
                    {addressData.activePercent.toFixed(1)}%
                  </span>
                </span>
                {addressData.gapCount > 0 && (
                  <span className="text-muted-foreground">
                    {addressData.gapCount} gap
                    {addressData.gapCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
