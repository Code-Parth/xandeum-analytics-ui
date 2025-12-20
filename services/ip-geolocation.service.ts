import { db } from "@/db";
import { ipGeolocation } from "@/db/schema";
import { Logger } from "@/utils/logger";
import type { GeolocationData, IpApiResponse } from "@/types";

const IP_API_BATCH_URL = "http://ip-api.com/batch";
const MAX_IPS_PER_BATCH = 100;
const MAX_REQUESTS_PER_MINUTE = 45;
const MIN_DELAY_BETWEEN_REQUESTS_MS = Math.ceil(
  60000 / MAX_REQUESTS_PER_MINUTE,
); // ~1334ms

export class IpGeolocationService {
  private requestTimestamps: number[] = []; // Track API calls for rate limiting

  /**
   * Extract IP address from "IP:PORT" format
   */
  extractIp(address: string): string | null {
    const parts = address.split(":");
    if (parts.length < 2) return null;
    return parts[0] || null;
  }

  /**
   * Extract unique IPs from a list of addresses
   */
  extractUniqueIps(addresses: string[]): string[] {
    const ipSet = new Set<string>();
    for (const address of addresses) {
      const ip = this.extractIp(address);
      if (ip && this.isValidIp(ip)) {
        ipSet.add(ip);
      }
    }
    return Array.from(ipSet);
  }

  /**
   * Basic IP validation
   */
  isValidIp(ip: string): boolean {
    // IPv4 regex
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    // IPv6 regex (simplified)
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  /**
   * Get IPs that don't have geolocation data yet
   */
  async getNewIps(ips: string[]): Promise<string[]> {
    if (ips.length === 0) return [];

    try {
      const { inArray } = await import("drizzle-orm");

      const existing = await db
        .select({ ip: ipGeolocation.ip })
        .from(ipGeolocation)
        .where(inArray(ipGeolocation.ip, ips));

      const existingIps = new Set(existing.map((r) => r.ip));
      const newIps = ips.filter((ip) => !existingIps.has(ip));

      Logger.info("Checked for new IPs", {
        total: ips.length,
        existing: existingIps.size,
        new: newIps.length,
      });

      return newIps;
    } catch (error) {
      Logger.error("Failed to get new IPs", { error, ipCount: ips.length });
      // On error, return empty array to avoid unnecessary API calls
      // The next snapshot will try again
      return [];
    }
  }

  /**
   * Wait for rate limit if needed
   */
  private async waitForRateLimit(): Promise<boolean> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean up old timestamps
    this.requestTimestamps = this.requestTimestamps.filter(
      (ts) => ts > oneMinuteAgo,
    );

    const requestsInLastMinute = this.requestTimestamps.length;

    if (requestsInLastMinute >= MAX_REQUESTS_PER_MINUTE) {
      // Calculate wait time
      const oldestRequest = Math.min(...this.requestTimestamps);
      const waitTime = oneMinuteAgo - oldestRequest + 100; // Add 100ms buffer

      if (waitTime > 0) {
        Logger.info("Rate limit reached, waiting", { waitTime });
        await this.delay(waitTime);
        // Clean up again after waiting
        this.requestTimestamps = this.requestTimestamps.filter(
          (ts) => ts > oneMinuteAgo,
        );
      }
    }

    return true;
  }

  /**
   * Record a request timestamp
   */
  private recordRequest(): void {
    const now = Date.now();
    this.requestTimestamps.push(now);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Fetch geolocation for a single batch of IPs
   */
  private async fetchSingleBatch(ips: string[]): Promise<IpApiResponse[]> {
    await this.waitForRateLimit();

    try {
      const response = await fetch(IP_API_BATCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ips),
      });

      this.recordRequest();

      if (response.status === 429) {
        Logger.warn("Rate limit exceeded, stopping batch processing");
        return [];
      }

      if (!response.ok) {
        Logger.error("IP API request failed", {
          status: response.status,
          statusText: response.statusText,
        });
        return [];
      }

      const data: IpApiResponse[] = await response.json();
      return data;
    } catch (error) {
      Logger.error("Failed to fetch geolocation batch", { error, ips });
      return [];
    }
  }

  /**
   * Fetch geolocation for multiple batches of IPs with rate limiting
   */
  async fetchGeolocationBatch(ips: string[]): Promise<IpApiResponse[]> {
    if (ips.length === 0) return [];

    const chunks = this.chunkArray(ips, MAX_IPS_PER_BATCH);
    const allResults: IpApiResponse[] = [];

    Logger.info("Fetching geolocation for IPs", {
      totalIps: ips.length,
      batches: chunks.length,
    });

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      Logger.info(`Processing batch ${i + 1}/${chunks.length}`, {
        batchSize: chunk.length,
      });

      const results = await this.fetchSingleBatch(chunk);
      allResults.push(...results);

      // Add delay between batches (except for the last one)
      if (i < chunks.length - 1) {
        await this.delay(MIN_DELAY_BETWEEN_REQUESTS_MS);
      }
    }

    return allResults;
  }

  /**
   * Store geolocation data in database
   */
  async storeGeolocation(data: IpApiResponse[]): Promise<number> {
    if (data.length === 0) return 0;

    try {
      const { inArray } = await import("drizzle-orm");

      // Batch check which IPs already exist
      const ipsToCheck = data.map((item) => item.query);
      const existingIps = await db
        .select({ ip: ipGeolocation.ip })
        .from(ipGeolocation)
        .where(inArray(ipGeolocation.ip, ipsToCheck));

      const existingIpSet = new Set(existingIps.map((r) => r.ip));

      // Filter to only new IPs
      const newItems = data.filter((item) => !existingIpSet.has(item.query));

      if (newItems.length === 0) {
        return 0;
      }

      // Batch insert new items
      const valuesToInsert = newItems.map((item) => {
        if (item.status !== "success") {
          return {
            ip: item.query,
            status: item.status,
          };
        }

        return {
          ip: item.query,
          status: item.status,
          country: item.country,
          countryCode: item.countryCode,
          region: item.region,
          regionName: item.regionName,
          city: item.city,
          zip: item.zip,
          lat: item.lat,
          lon: item.lon,
          timezone: item.timezone,
          isp: item.isp,
          org: item.org,
          asInfo: item.as,
        };
      });

      await db.insert(ipGeolocation).values(valuesToInsert);

      return newItems.length;
    } catch (error) {
      Logger.error("Failed to store geolocation", { error });
      throw error;
    }
  }

  /**
   * Get geolocation for a single IP
   */
  async getGeolocation(ip: string): Promise<GeolocationData | null> {
    try {
      const { eq } = await import("drizzle-orm");
      const result = await db
        .select()
        .from(ipGeolocation)
        .where(eq(ipGeolocation.ip, ip))
        .limit(1);

      if (result.length === 0) return null;

      const record = result[0];
      return {
        ip: record.ip,
        status: record.status,
        country: record.country,
        countryCode: record.countryCode,
        region: record.region,
        regionName: record.regionName,
        city: record.city,
        zip: record.zip,
        lat: record.lat,
        lon: record.lon,
        timezone: record.timezone,
        isp: record.isp,
        org: record.org,
        asInfo: record.asInfo,
      };
    } catch (error) {
      Logger.error("Failed to get geolocation", { ip, error });
      return null;
    }
  }

  /**
   * Get geolocation for multiple IPs
   */
  async getGeolocationBatch(
    ips: string[],
  ): Promise<Map<string, GeolocationData>> {
    if (ips.length === 0) return new Map();

    try {
      const { inArray } = await import("drizzle-orm");
      const results = await db
        .select()
        .from(ipGeolocation)
        .where(inArray(ipGeolocation.ip, ips));

      const geoMap = new Map<string, GeolocationData>();

      for (const record of results) {
        geoMap.set(record.ip, {
          ip: record.ip,
          status: record.status,
          country: record.country,
          countryCode: record.countryCode,
          region: record.region,
          regionName: record.regionName,
          city: record.city,
          zip: record.zip,
          lat: record.lat,
          lon: record.lon,
          timezone: record.timezone,
          isp: record.isp,
          org: record.org,
          asInfo: record.asInfo,
        });
      }

      return geoMap;
    } catch (error) {
      Logger.error("Failed to get geolocation batch", { error });
      return new Map();
    }
  }

  /**
   * Process new IPs: extract, check for new ones, fetch, and store
   */
  async processNewIps(addresses: string[]): Promise<{
    newIpsCount: number;
    storedCount: number;
    batchesProcessed: number;
  }> {
    try {
      const uniqueIps = this.extractUniqueIps(addresses);
      if (uniqueIps.length === 0) {
        Logger.info("No unique IPs found in addresses");
        return { newIpsCount: 0, storedCount: 0, batchesProcessed: 0 };
      }

      Logger.info("Checking for new IPs", {
        totalAddresses: addresses.length,
        uniqueIps: uniqueIps.length,
      });

      const newIps = await this.getNewIps(uniqueIps);
      if (newIps.length === 0) {
        Logger.info(
          "No new IPs to process - all IPs already have geolocation data",
        );
        return { newIpsCount: 0, storedCount: 0, batchesProcessed: 0 };
      }

      Logger.info("Processing new IPs", {
        newIpsCount: newIps.length,
        batchesNeeded: Math.ceil(newIps.length / MAX_IPS_PER_BATCH),
      });

      const chunks = this.chunkArray(newIps, MAX_IPS_PER_BATCH);
      let storedCount = 0;
      let batchesProcessed = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        Logger.info(`Processing batch ${i + 1}/${chunks.length}`, {
          batchSize: chunk.length,
        });

        const results = await this.fetchSingleBatch(chunk);
        if (results.length > 0) {
          const stored = await this.storeGeolocation(results);
          storedCount += stored;
          batchesProcessed++;

          Logger.info(`Batch ${i + 1} completed`, {
            fetched: results.length,
            stored,
          });
        }

        // Add delay between batches (except for the last one)
        if (i < chunks.length - 1) {
          await this.delay(MIN_DELAY_BETWEEN_REQUESTS_MS);
        }
      }

      Logger.info("Finished processing new IPs", {
        newIpsCount: newIps.length,
        storedCount,
        batchesProcessed,
      });

      return {
        newIpsCount: newIps.length,
        storedCount,
        batchesProcessed,
      };
    } catch (error) {
      Logger.error("Failed to process new IPs", { error });
      return { newIpsCount: 0, storedCount: 0, batchesProcessed: 0 };
    }
  }

  /**
   * Get all nodes with their geolocation data (including historical)
   */
  async getAllNodesWithGeolocation(): Promise<{
    locations: Array<{
      ip: string;
      lat: number;
      lon: number;
      city: string | null;
      region: string | null;
      country: string | null;
      countryCode: string | null;
      isp: string | null;
      org: string | null;
      nodeCount: number;
      pubkeys: string[];
      firstSeen: Date;
      lastSeen: Date;
    }>;
    totalNodes: number;
    totalLocations: number;
  }> {
    try {
      const { podsSnapshot } = await import("@/db/schema");
      const { sql } = await import("drizzle-orm");

      // Get all unique address-pubkey combinations with their timestamps
      const nodesData = await db
        .select({
          address: podsSnapshot.address,
          pubkey: podsSnapshot.pubkey,
          firstSeen: sql<Date>`MIN(${podsSnapshot.snapshotTimestamp})`,
          lastSeen: sql<Date>`MAX(${podsSnapshot.snapshotTimestamp})`,
        })
        .from(podsSnapshot)
        .groupBy(podsSnapshot.address, podsSnapshot.pubkey);

      // Get all geolocations
      const geolocations = await db.select().from(ipGeolocation);
      const geoMap = new Map(geolocations.map((g) => [g.ip, g]));

      // Group nodes by IP location
      const locationMap = new Map<
        string,
        {
          ip: string;
          lat: number;
          lon: number;
          city: string | null;
          region: string | null;
          country: string | null;
          countryCode: string | null;
          isp: string | null;
          org: string | null;
          pubkeys: Set<string>;
          firstSeen: Date;
          lastSeen: Date;
        }
      >();

      for (const node of nodesData) {
        const ip = this.extractIp(node.address);
        if (!ip) continue;

        const geo = geoMap.get(ip);
        if (!geo || geo.status !== "success" || !geo.lat || !geo.lon) continue;

        const existing = locationMap.get(ip);
        if (existing) {
          if (node.pubkey) existing.pubkeys.add(node.pubkey);
          if (node.firstSeen < existing.firstSeen)
            existing.firstSeen = node.firstSeen;
          if (node.lastSeen > existing.lastSeen)
            existing.lastSeen = node.lastSeen;
        } else {
          locationMap.set(ip, {
            ip,
            lat: geo.lat,
            lon: geo.lon,
            city: geo.city,
            region: geo.regionName,
            country: geo.country,
            countryCode: geo.countryCode,
            isp: geo.isp,
            org: geo.org,
            pubkeys: new Set(node.pubkey ? [node.pubkey] : []),
            firstSeen: node.firstSeen,
            lastSeen: node.lastSeen,
          });
        }
      }

      const locations = Array.from(locationMap.values()).map((loc) => ({
        ...loc,
        pubkeys: Array.from(loc.pubkeys),
        nodeCount: loc.pubkeys.size,
      }));

      const totalNodes = new Set(locations.flatMap((l) => l.pubkeys)).size;

      return {
        locations,
        totalNodes,
        totalLocations: locations.length,
      };
    } catch (error) {
      Logger.error("Failed to get all nodes with geolocation", { error });
      throw error;
    }
  }

  /**
   * Get geolocation data for a specific pubkey with historical timestamps
   */
  async getNodeLocationsWithHistory(pubkey: string): Promise<{
    locations: Array<{
      ip: string;
      lat: number;
      lon: number;
      city: string | null;
      region: string | null;
      country: string | null;
      countryCode: string | null;
      isp: string | null;
      org: string | null;
      firstSeen: Date;
      lastSeen: Date;
      snapshotCount: number;
    }>;
  }> {
    try {
      const { podsSnapshot } = await import("@/db/schema");
      const { eq, sql } = await import("drizzle-orm");

      // Get all addresses for this pubkey with timestamps
      const addressData = await db
        .select({
          address: podsSnapshot.address,
          firstSeen: sql<Date>`MIN(${podsSnapshot.snapshotTimestamp})`,
          lastSeen: sql<Date>`MAX(${podsSnapshot.snapshotTimestamp})`,
          snapshotCount: sql<number>`COUNT(*)::int`,
        })
        .from(podsSnapshot)
        .where(eq(podsSnapshot.pubkey, pubkey))
        .groupBy(podsSnapshot.address);

      if (addressData.length === 0) {
        return { locations: [] };
      }

      // Get geolocations for all IPs
      const ips = addressData
        .map((a) => this.extractIp(a.address))
        .filter((ip) => ip && this.isValidIp(ip)) as string[];

      const geoMap = await this.getGeolocationBatch(ips);

      // Aggregate by IP to handle multiple addresses with same IP (different ports)
      const ipAggregation = new Map<
        string,
        {
          ip: string;
          lat: number;
          lon: number;
          city: string | null;
          region: string | null;
          country: string | null;
          countryCode: string | null;
          isp: string | null;
          org: string | null;
          firstSeen: Date;
          lastSeen: Date;
          snapshotCount: number;
        }
      >();

      for (const addr of addressData) {
        const ip = this.extractIp(addr.address);
        if (!ip) continue;

        const geo = geoMap.get(ip);
        if (!geo || geo.status !== "success" || !geo.lat || !geo.lon) continue;

        const existing = ipAggregation.get(ip);
        if (existing) {
          // Merge: earliest firstSeen, latest lastSeen, sum snapshotCount
          if (addr.firstSeen < existing.firstSeen) {
            existing.firstSeen = addr.firstSeen;
          }
          if (addr.lastSeen > existing.lastSeen) {
            existing.lastSeen = addr.lastSeen;
          }
          existing.snapshotCount += addr.snapshotCount;
        } else {
          ipAggregation.set(ip, {
            ip,
            lat: geo.lat,
            lon: geo.lon,
            city: geo.city ?? null,
            region: geo.regionName ?? null,
            country: geo.country ?? null,
            countryCode: geo.countryCode ?? null,
            isp: geo.isp ?? null,
            org: geo.org ?? null,
            firstSeen: addr.firstSeen,
            lastSeen: addr.lastSeen,
            snapshotCount: addr.snapshotCount,
          });
        }
      }

      const locations = Array.from(ipAggregation.values());

      return { locations };
    } catch (error) {
      Logger.error("Failed to get node locations with history", {
        pubkey,
        error,
      });
      throw error;
    }
  }
}

// Export singleton instance
export const ipGeolocationService = new IpGeolocationService();
