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

// IP Geolocation table - stores geolocation data for unique IP addresses
export const ipGeolocation = pgTable(
  "ip_geolocation",
  {
    id: serial("id").primaryKey(),
    ip: varchar("ip", { length: 45 }).notNull().unique(), // IPv4/IPv6
    status: varchar("status", { length: 20 }).notNull(), // "success" or "fail"
    country: varchar("country", { length: 100 }),
    countryCode: varchar("country_code", { length: 10 }),
    region: varchar("region", { length: 20 }),
    regionName: varchar("region_name", { length: 100 }),
    city: varchar("city", { length: 100 }),
    zip: varchar("zip", { length: 20 }),
    lat: real("lat"),
    lon: real("lon"),
    timezone: varchar("timezone", { length: 100 }),
    isp: varchar("isp", { length: 256 }),
    org: varchar("org", { length: 256 }),
    asInfo: varchar("as_info", { length: 256 }), // "as" is reserved keyword
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("ip_geolocation_ip_idx").on(table.ip),
    index("ip_geolocation_country_code_idx").on(table.countryCode),
  ],
);

// Type inference for IP Geolocation
export type IpGeolocation = typeof ipGeolocation.$inferSelect;
export type NewIpGeolocation = typeof ipGeolocation.$inferInsert;
