CREATE TABLE "pods_snapshot" (
	"id" serial PRIMARY KEY NOT NULL,
	"address" varchar(256) NOT NULL,
	"pubkey" varchar(256),
	"is_public" boolean,
	"version" varchar(50) NOT NULL,
	"last_seen_timestamp" bigint NOT NULL,
	"uptime" bigint,
	"rpc_port" integer,
	"storage_committed" bigint,
	"storage_used" bigint,
	"storage_usage_percent" real,
	"snapshot_timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "address_idx" ON "pods_snapshot" USING btree ("address");--> statement-breakpoint
CREATE INDEX "pubkey_idx" ON "pods_snapshot" USING btree ("pubkey");--> statement-breakpoint
CREATE INDEX "snapshot_timestamp_idx" ON "pods_snapshot" USING btree ("snapshot_timestamp");--> statement-breakpoint
CREATE INDEX "address_snapshot_idx" ON "pods_snapshot" USING btree ("address","snapshot_timestamp");