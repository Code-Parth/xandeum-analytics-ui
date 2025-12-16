import {
  pgTable,
  serial,
  varchar,
  boolean,
  bigint,
  integer,
  real,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const podsSnapshot = pgTable(
  "pods_snapshot",
  {
    id: serial("id").primaryKey(),

    // Pod identification
    address: varchar("address", { length: 256 }).notNull(),
    pubkey: varchar("pubkey", { length: 256 }),

    // Pod metadata
    isPublic: boolean("is_public"),
    version: varchar("version", { length: 50 }).notNull(),

    // Timing
    lastSeenTimestamp: bigint("last_seen_timestamp", {
      mode: "number",
    }).notNull(),
    uptime: bigint("uptime", { mode: "number" }),

    // Storage
    rpcPort: integer("rpc_port"),
    storageCommitted: bigint("storage_committed", { mode: "number" }),
    storageUsed: bigint("storage_used", { mode: "number" }),
    storageUsagePercent: real("storage_usage_percent"),

    // Snapshot metadata
    snapshotTimestamp: timestamp("snapshot_timestamp").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    // Indexes for query performance
    index("address_idx").on(table.address),
    index("pubkey_idx").on(table.pubkey),
    index("snapshot_timestamp_idx").on(table.snapshotTimestamp),
    index("address_snapshot_idx").on(table.address, table.snapshotTimestamp),
  ],
);

// Type inference
export type PodSnapshot = typeof podsSnapshot.$inferSelect;
export type NewPodSnapshot = typeof podsSnapshot.$inferInsert;
