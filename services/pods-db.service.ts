import { db } from "@/db";
import {
  podsSnapshot,
  type NewPodSnapshot,
  type PodSnapshot,
} from "@/db/schema";
import { desc, eq, gte, and, sql } from "drizzle-orm";
import type { PodResponse } from "@/types";
import { Logger } from "@/utils/logger";

export class PodsDbService {
  /**
   * Store current pod snapshot in database
   */
  async storePodSnapshot(pods: PodResponse[]): Promise<number> {
    try {
      const snapshots: NewPodSnapshot[] = pods.map((pod) => ({
        address: pod.address,
        pubkey: pod.pubkey,
        isPublic: pod.is_public,
        version: pod.version,
        lastSeenTimestamp: pod.last_seen_timestamp,
        uptime: pod.uptime,
        rpcPort: pod.rpc_port,
        storageCommitted: pod.storage_committed,
        storageUsed: pod.storage_used,
        storageUsagePercent: pod.storage_usage_percent,
        snapshotTimestamp: new Date(),
      }));

      await db.insert(podsSnapshot).values(snapshots);

      Logger.info("Stored pod snapshot", {
        count: pods.length,
        timestamp: new Date().toISOString(),
      });

      return pods.length;
    } catch (error) {
      Logger.error("Failed to store pod snapshot", { error });
      throw error;
    }
  }

  /**
   * Get latest snapshot for all pods
   */
  async getLatestSnapshot(): Promise<PodSnapshot[]> {
    try {
      // Get the most recent snapshot timestamp
      const latestSnapshot = await db
        .select({ timestamp: podsSnapshot.snapshotTimestamp })
        .from(podsSnapshot)
        .orderBy(desc(podsSnapshot.snapshotTimestamp))
        .limit(1);

      if (latestSnapshot.length === 0) {
        return [];
      }

      // Get all pods from that snapshot
      const pods = await db
        .select()
        .from(podsSnapshot)
        .where(eq(podsSnapshot.snapshotTimestamp, latestSnapshot[0].timestamp))
        .orderBy(desc(podsSnapshot.address));

      return pods;
    } catch (error) {
      Logger.error("Failed to get latest snapshot", { error });
      throw error;
    }
  }

  /**
   * Get historical snapshots for a specific pod
   */
  async getPodHistory(
    address: string,
    startTime: Date,
    endTime: Date = new Date(),
  ): Promise<PodSnapshot[]> {
    try {
      const snapshots = await db
        .select()
        .from(podsSnapshot)
        .where(
          and(
            eq(podsSnapshot.address, address),
            gte(podsSnapshot.snapshotTimestamp, startTime),
            sql`${podsSnapshot.snapshotTimestamp} <= ${endTime}`,
          ),
        )
        .orderBy(podsSnapshot.snapshotTimestamp);

      return snapshots;
    } catch (error) {
      Logger.error("Failed to get pod history", { address, error });
      throw error;
    }
  }

  /**
   * Get historical snapshots for a specific pubkey (across addresses)
   */
  async getPodHistoryByPubkey(
    pubkey: string,
    startTime: Date,
    endTime: Date = new Date(),
  ): Promise<PodSnapshot[]> {
    try {
      const snapshots = await db
        .select()
        .from(podsSnapshot)
        .where(
          and(
            eq(podsSnapshot.pubkey, pubkey),
            gte(podsSnapshot.snapshotTimestamp, startTime),
            sql`${podsSnapshot.snapshotTimestamp} <= ${endTime}`,
          ),
        )
        .orderBy(podsSnapshot.snapshotTimestamp);

      return snapshots;
    } catch (error) {
      Logger.error("Failed to get pubkey history", { pubkey, error });
      throw error;
    }
  }

  /**
   * Get network statistics over time
   */
  async getNetworkHistory(
    startTime: Date,
    endTime: Date = new Date(),
  ): Promise<
    {
      timestamp: Date;
      totalNodes: number;
      activeNodes: number;
      avgUptime: number;
      totalStorage: number;
      usedStorage: number;
    }[]
  > {
    try {
      const result = await db
        .select({
          timestamp: podsSnapshot.snapshotTimestamp,
          totalNodes: sql<number>`count(distinct ${podsSnapshot.address})`.as(
            "total_nodes",
          ),
          activeNodes:
            sql<number>`count(distinct case when ${podsSnapshot.isPublic} = true and ${podsSnapshot.pubkey} is not null and (EXTRACT(EPOCH FROM ${podsSnapshot.snapshotTimestamp}) - ${podsSnapshot.lastSeenTimestamp}) <= 120 then ${podsSnapshot.address} end)`.as(
              "active_nodes",
            ),
          avgUptime: sql<number>`avg(${podsSnapshot.uptime})`.as("avg_uptime"),
          totalStorage: sql<number>`sum(${podsSnapshot.storageCommitted})`.as(
            "total_storage",
          ),
          usedStorage: sql<number>`sum(${podsSnapshot.storageUsed})`.as(
            "used_storage",
          ),
        })
        .from(podsSnapshot)
        .where(
          and(
            gte(podsSnapshot.snapshotTimestamp, startTime),
            sql`${podsSnapshot.snapshotTimestamp} <= ${endTime}`,
          ),
        )
        .groupBy(podsSnapshot.snapshotTimestamp)
        .orderBy(podsSnapshot.snapshotTimestamp);

      return result.map((row) => ({
        timestamp: row.timestamp,
        totalNodes: Number(row.totalNodes),
        activeNodes: Number(row.activeNodes),
        avgUptime: Number(row.avgUptime) || 0,
        totalStorage: Number(row.totalStorage) || 0,
        usedStorage: Number(row.usedStorage) || 0,
      }));
    } catch (error) {
      Logger.error("Failed to get network history", { error });
      throw error;
    }
  }

  /**
   * Cleanup old snapshots (90 days retention)
   */
  async cleanupOldSnapshots(retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await db
        .delete(podsSnapshot)
        .where(sql`${podsSnapshot.snapshotTimestamp} < ${cutoffDate}`);

      Logger.info("Cleaned up old snapshots", {
        cutoffDate: cutoffDate.toISOString(),
        retentionDays,
      });

      return result.rowCount || 0;
    } catch (error) {
      Logger.error("Failed to cleanup old snapshots", { error });
      throw error;
    }
  }

  /**
   * Get distinct snapshot timestamps
   */
  async getSnapshotTimestamps(
    startTime: Date,
    endTime: Date = new Date(),
  ): Promise<Date[]> {
    try {
      const timestamps = await db
        .selectDistinct({ timestamp: podsSnapshot.snapshotTimestamp })
        .from(podsSnapshot)
        .where(
          and(
            gte(podsSnapshot.snapshotTimestamp, startTime),
            sql`${podsSnapshot.snapshotTimestamp} <= ${endTime}`,
          ),
        )
        .orderBy(podsSnapshot.snapshotTimestamp);

      return timestamps.map((row) => row.timestamp);
    } catch (error) {
      Logger.error("Failed to get snapshot timestamps", { error });
      throw error;
    }
  }
}

// Export singleton instance
export const podsDbService = new PodsDbService();
