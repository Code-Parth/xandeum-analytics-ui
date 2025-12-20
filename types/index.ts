export type NodeStatus = "active" | "inactive" | "syncing";

export interface Performance {
  storageCapacity: number;
  storageUsed: number;
  storageUsagePercent?: number;
  rpcPort?: number;
  shredVersion?: number;
  featureSet?: number;
}

export interface PNode {
  id: string;
  publicKey: string;
  ipAddress: string;
  port: number;
  version: string;
  status: NodeStatus;
  lastSeen: Date;
  firstSeen: Date;
  uptime: number;
  performance?: Performance;
  metadata?: Record<string, unknown>;
}

export interface NetworkStats {
  totalNodes: number;
  activeNodes: number;
  inactiveNodes: number;
  averageUptime: number;
  totalStorage: number;
  usedStorage: number;
  networkHealth: number;
  lastUpdated: Date;
}

export interface NodeMetricPoint {
  timestamp: Date;
  address: string;
  latencyMs: number;
  version?: string;
  uptime?: number;
  storageCapacityBytes?: number;
  storageUsedBytes?: number;
  storageUsagePercent?: number;
}

export interface NodeDetail extends PNode {
  availableVersions?: string[];
}

// Activity tracking types
export type ActivityStatus = "active" | "inactive";

export interface ActivityPeriod {
  address: string;
  startTime: Date;
  endTime: Date;
  status: ActivityStatus;
  durationMs: number;
}

export interface AddressActivitySummary {
  address: string;
  periods: ActivityPeriod[];
  totalActiveMs: number;
  totalInactiveMs: number;
  activePercent: number;
  gapCount: number;
}

export interface NodeActivityResponse {
  pubkey: string;
  addresses: AddressActivitySummary[];
  startTime: Date;
  endTime: Date;
}

// Heatmap types
export interface HeatmapCell {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  hour: number; // 0-23
  totalSnapshots: number;
  activeSnapshots: number;
  activityPercent: number;
}

export interface AddressHeatmapData {
  address: string;
  cells: HeatmapCell[];
  totalSnapshots: number;
  overallActivityPercent: number;
}

export interface NodeHeatmapResponse {
  pubkey: string;
  addresses: AddressHeatmapData[];
  startTime: Date;
  endTime: Date;
  totalSnapshots: number;
}

// Downtime report types
export interface DowntimeIncident {
  startTime: Date;
  endTime: Date;
  durationMs: number;
  addressesAffected: string[];
  totalAddresses: number;
}

export interface DowntimeSummary {
  totalIncidents: number;
  totalDowntimeMs: number;
  longestOutageMs: number;
  longestOutageTime: Date | null;
  mttrMs: number; // Mean time to recovery
  currentStreakMs: number;
  currentStreakStatus: ActivityStatus;
  incidents: DowntimeIncident[];
}

// Backend response types (before transformation)
export interface PodResponse {
  address: string;
  is_public: boolean | null;
  last_seen_timestamp: number;
  pubkey: string | null;
  rpc_port: number | null;
  storage_committed: number | null;
  storage_usage_percent: number | null;
  storage_used: number | null;
  uptime: number | null;
  version: string;
}

export interface RPCResponse {
  jsonrpc: string;
  id: number;
  result?: {
    pods: PodResponse[];
    total_count?: number;
  };
  error?: {
    code: number;
    message: string;
    details?: unknown[];
  };
}

export * from "./jsonrpc";
export * from "./pod";

// IP Geolocation types
export interface IpApiResponse {
  status: "success" | "fail";
  message?: string; // Only present when status is "fail"
  country?: string;
  countryCode?: string;
  region?: string;
  regionName?: string;
  city?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  as?: string;
  query: string; // The IP address that was queried
}

export interface GeolocationData {
  ip: string;
  status: string;
  country?: string | null;
  countryCode?: string | null;
  region?: string | null;
  regionName?: string | null;
  city?: string | null;
  zip?: string | null;
  lat?: number | null;
  lon?: number | null;
  timezone?: string | null;
  isp?: string | null;
  org?: string | null;
  asInfo?: string | null;
}
