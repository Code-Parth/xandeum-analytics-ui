"use client";

import { useMemo } from "react";
import type {
  AddressActivitySummary,
  DowntimeIncident,
  DowntimeSummary,
} from "@/types";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
// Truncate address for display
function truncateAddress(addr: string) {
  if (addr.length <= 21) return addr;
  return `${addr.slice(0, 12)}...${addr.slice(-6)}`;
}

interface DowntimeReportProps {
  data: AddressActivitySummary[] | undefined;
  isLoading: boolean;
  error: Error | null;
  hours: number;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  }
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

export function DowntimeReport({
  data,
  isLoading,
  error,
  hours,
}: DowntimeReportProps) {
  // Calculate downtime summary from activity data
  const summary: DowntimeSummary | null = useMemo(() => {
    if (!data || data.length === 0) return null;

    const allAddresses = data.map((d) => d.address);
    const incidents: DowntimeIncident[] = [];

    // Collect all inactive periods across all addresses, grouped by overlapping times
    const allInactivePeriods: Array<{
      startTime: Date;
      endTime: Date;
      durationMs: number;
      address: string;
    }> = [];

    for (const addressData of data) {
      for (const period of addressData.periods) {
        if (period.status === "inactive") {
          allInactivePeriods.push({
            startTime: new Date(period.startTime),
            endTime: new Date(period.endTime),
            durationMs: period.durationMs,
            address: addressData.address,
          });
        }
      }
    }

    // Sort by start time
    allInactivePeriods.sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime(),
    );

    // Group overlapping periods into incidents
    let currentIncident: DowntimeIncident | null = null;

    for (const period of allInactivePeriods) {
      if (!currentIncident) {
        currentIncident = {
          startTime: period.startTime,
          endTime: period.endTime,
          durationMs: period.durationMs,
          addressesAffected: [period.address],
          totalAddresses: allAddresses.length,
        };
      } else if (
        period.startTime.getTime() <= currentIncident.endTime.getTime()
      ) {
        // Overlapping - extend current incident
        if (period.endTime.getTime() > currentIncident.endTime.getTime()) {
          currentIncident.endTime = period.endTime;
          currentIncident.durationMs =
            currentIncident.endTime.getTime() -
            currentIncident.startTime.getTime();
        }
        if (!currentIncident.addressesAffected.includes(period.address)) {
          currentIncident.addressesAffected.push(period.address);
        }
      } else {
        // Non-overlapping - save current and start new
        incidents.push(currentIncident);
        currentIncident = {
          startTime: period.startTime,
          endTime: period.endTime,
          durationMs: period.durationMs,
          addressesAffected: [period.address],
          totalAddresses: allAddresses.length,
        };
      }
    }

    if (currentIncident) {
      incidents.push(currentIncident);
    }

    // Calculate summary stats
    const totalDowntimeMs = incidents.reduce((sum, i) => sum + i.durationMs, 0);
    const longestOutage = incidents.reduce(
      (max, i) => (i.durationMs > max.durationMs ? i : max),
      { durationMs: 0, startTime: new Date() } as DowntimeIncident,
    );

    // Calculate MTTR (mean time to recovery)
    // MTTR = average duration of downtime incidents
    const mttrMs =
      incidents.length > 0 ? totalDowntimeMs / incidents.length : 0;

    // Calculate current streak
    const now = new Date();
    let currentStreakMs = 0;
    let currentStreakStatus: "active" | "inactive" = "active";

    // Find the most recent state across all addresses
    for (const addressData of data) {
      const sortedPeriods = [...addressData.periods].sort(
        (a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime(),
      );
      if (sortedPeriods.length > 0) {
        const lastPeriod = sortedPeriods[0];
        const timeSinceEnd =
          now.getTime() - new Date(lastPeriod.endTime).getTime();

        if (timeSinceEnd < 5 * 60 * 1000) {
          // Within 5 minutes, consider the last status as current
          currentStreakStatus = lastPeriod.status;
          currentStreakMs = Math.max(
            currentStreakMs,
            lastPeriod.durationMs + timeSinceEnd,
          );
        }
      }
    }

    return {
      totalIncidents: incidents.length,
      totalDowntimeMs,
      longestOutageMs: longestOutage.durationMs,
      longestOutageTime:
        longestOutage.durationMs > 0 ? longestOutage.startTime : null,
      mttrMs,
      currentStreakMs,
      currentStreakStatus,
      incidents: incidents.sort(
        (a, b) => b.startTime.getTime() - a.startTime.getTime(),
      ), // Most recent first
    };
  }, [data]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Downtime Report</CardTitle>
          <CardDescription>Loading downtime analysis...</CardDescription>
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
          <CardTitle>Downtime Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-destructive text-sm">
            Failed to load downtime data: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0 || !summary) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Downtime Report</CardTitle>
            <CardDescription>Historical downtime incidents</CardDescription>
          </div>
          <ChartInfoHover
            ariaLabel="Downtime report info"
            items={[
              { label: "Data source", value: "Activity periods" },
              { label: "Metrics", value: "Downtime incidents and duration" },
              { label: "Time range", value: `${hours}-hour window` },
            ]}
            docsAnchor="downtime-report"
          />
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground py-8 text-center text-sm">
            No downtime data available for this time range.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Downtime Report</CardTitle>
          <CardDescription>
            Summary of historical downtime incidents
          </CardDescription>
        </div>
        <ChartInfoHover
          ariaLabel="Downtime report info"
          items={[
            { label: "Data source", value: "Activity periods analysis" },
            { label: "Metrics", value: "Incidents, duration, MTTR" },
            { label: "Time range", value: `${hours}-hour window` },
          ]}
          docsAnchor="downtime-report"
        />
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded border px-3 py-2">
            <div className="text-muted-foreground text-xs">Total Incidents</div>
            <div className="text-2xl font-bold">{summary.totalIncidents}</div>
          </div>
          <div className="rounded border px-3 py-2">
            <div className="text-muted-foreground text-xs">Total Downtime</div>
            <div className="text-lg font-semibold">
              {summary.totalDowntimeMs > 0
                ? formatDuration(summary.totalDowntimeMs)
                : "None"}
            </div>
          </div>
          <div className="rounded border px-3 py-2">
            <div className="text-muted-foreground text-xs">Longest Outage</div>
            <div className="text-lg font-semibold">
              {summary.longestOutageMs > 0
                ? formatDuration(summary.longestOutageMs)
                : "N/A"}
            </div>
            {summary.longestOutageTime && (
              <div className="text-muted-foreground text-xs">
                {formatTime(summary.longestOutageTime)}
              </div>
            )}
          </div>
          <div className="rounded border px-3 py-2">
            <div className="text-muted-foreground text-xs">MTTR</div>
            <div className="text-lg font-semibold">
              {summary.mttrMs > 0 ? formatDuration(summary.mttrMs) : "N/A"}
            </div>
            <div className="text-muted-foreground text-xs">
              Mean time to recovery
            </div>
          </div>
          <div className="rounded border px-3 py-2">
            <div className="text-muted-foreground text-xs">Current Streak</div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  summary.currentStreakStatus === "active"
                    ? "default"
                    : "destructive"
                }
                className="capitalize">
                {summary.currentStreakStatus}
              </Badge>
            </div>
            {summary.currentStreakMs > 0 && (
              <div className="text-muted-foreground text-xs">
                {formatDuration(summary.currentStreakMs)}
              </div>
            )}
          </div>
        </div>

        {/* Incidents Table */}
        {summary.incidents.length > 0 ? (
          <div>
            <h4 className="mb-2 text-sm font-medium">
              Recent Incidents ({Math.min(summary.incidents.length, 10)} of{" "}
              {summary.incidents.length})
            </h4>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Addresses Affected</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.incidents.slice(0, 10).map((incident, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs">
                        {formatTime(incident.startTime)}
                      </TableCell>
                      <TableCell>
                        {formatDuration(incident.durationMs)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline" className="mb-1">
                            {incident.addressesAffected.length} of{" "}
                            {incident.totalAddresses}
                          </Badge>
                          <div className="flex flex-wrap gap-1">
                            {incident.addressesAffected.map((addr) => (
                              <span
                                key={addr}
                                className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-xs">
                                {truncateAddress(addr)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground rounded-md border p-4 text-center text-sm">
            No downtime incidents recorded in this time period.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
