import type {
  PNode,
  NetworkStats,
  PodResponse,
  RPCResponse,
  NodeStatus,
} from "@/types";

class XandeumAPIService {
  private rpcUrl: string;

  constructor() {
    this.rpcUrl = "/api/rpc";
  }

  /**
   * Make JSON-RPC 2.0 call
   */
  private async makeRPCCall(
    method: string,
    params: unknown[] = [],
  ): Promise<unknown> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(this.rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method,
          params,
          id: 1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: RPCResponse = await response.json();

      if (data.error) {
        throw new Error(`RPC Error: ${JSON.stringify(data.error)}`);
      }

      return data.result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Get all pNodes with statistics from gossip network
   */
  async getAllNodes(): Promise<PNode[]> {
    const result = (await this.makeRPCCall("get-pods-with-stats")) as {
      pods: PodResponse[];
    };

    if (!result || !result.pods) {
      throw new Error("Invalid response from pRPC - no pods data");
    }

    return this.transformPodsToNodes(result.pods);
  }

  /**
   * Transform Pod responses to PNode format
   */
  private transformPodsToNodes(pods: PodResponse[]): PNode[] {
    return pods.map((pod, index) => {
      // Parse address to get IP and port
      const [ipAddress, portStr] = pod.address.split(":");
      const port = parseInt(portStr) || 9001;

      return {
        id: pod.address || `node-${index}`,
        publicKey: pod.pubkey || `unknown-${index}`,
        ipAddress,
        port,
        version: pod.version,
        status: this.determineStatus(pod),
        lastSeen: new Date(pod.last_seen_timestamp * 1000),
        firstSeen: new Date(
          (pod.last_seen_timestamp - (pod.uptime || 0)) * 1000,
        ),
        uptime: this.calculateUptimePercentage(pod.uptime),
        performance: pod.is_public
          ? {
              storageCapacity: pod.storage_committed || 0,
              storageUsed: pod.storage_used || 0,
            }
          : undefined,
      };
    });
  }

  /**
   * Determine node status based on pod data
   */
  private determineStatus(pod: PodResponse): NodeStatus {
    if (!pod.is_public || !pod.pubkey) {
      return "inactive";
    }

    const timeSinceLastSeen = Date.now() / 1000 - pod.last_seen_timestamp;

    if (timeSinceLastSeen > 300) {
      return "inactive";
    }

    if (timeSinceLastSeen > 120) {
      return "syncing";
    }

    return "active";
  }

  /**
   * Calculate uptime percentage from uptime seconds
   */
  private calculateUptimePercentage(uptimeSeconds: number | null): number {
    if (!uptimeSeconds) return 0;

    // Calculate real uptime percentage based on 30-day window
    const maxUptimeSeconds = 30 * 24 * 60 * 60;
    const percentage = (uptimeSeconds / maxUptimeSeconds) * 100;

    // Cap at 100% for nodes running longer than 30 days
    return Math.min(100, percentage);
  }

  /**
   * Get specific node by ID
   */
  async getNodeById(id: string): Promise<PNode | null> {
    const nodes = await this.getAllNodes();
    return nodes.find((node) => node.id === id) || null;
  }

  /**
   * Get network statistics
   */
  async getNetworkStats(): Promise<NetworkStats> {
    const nodes = await this.getAllNodes();
    return this.calculateStatsFromNodes(nodes);
  }

  /**
   * Calculate network statistics from nodes
   */
  private calculateStatsFromNodes(nodes: PNode[]): NetworkStats {
    const totalNodes = nodes.length;
    const activeNodes = nodes.filter((n) => n.status === "active").length;
    const inactiveNodes = nodes.filter((n) => n.status === "inactive").length;

    const uptimes = nodes.map((n) => n.uptime).filter((u) => u > 0);
    const averageUptime =
      uptimes.length > 0
        ? uptimes.reduce((sum, u) => sum + u, 0) / uptimes.length
        : 0;

    const totalStorage = nodes.reduce(
      (sum, n) => sum + (n.performance?.storageCapacity || 0),
      0,
    );

    const usedStorage = nodes.reduce(
      (sum, n) => sum + (n.performance?.storageUsed || 0),
      0,
    );

    // Calculate network health score
    const activeRatio = totalNodes > 0 ? activeNodes / totalNodes : 0;
    const networkHealth = activeRatio * 60 + averageUptime * 0.4;

    return {
      totalNodes,
      activeNodes,
      inactiveNodes,
      averageUptime,
      totalStorage,
      usedStorage,
      networkHealth,
      lastUpdated: new Date(),
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: "ok" | "degraded" | "down" }> {
    try {
      await this.makeRPCCall("get-pods-with-stats");
      return { status: "ok" };
    } catch {
      return { status: "down" };
    }
  }
}

// Export singleton instance
export const apiService = new XandeumAPIService();
export default apiService;
