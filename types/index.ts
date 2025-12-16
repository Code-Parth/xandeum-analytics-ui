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
