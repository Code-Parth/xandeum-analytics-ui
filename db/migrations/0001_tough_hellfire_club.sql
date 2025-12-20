CREATE TABLE "ip_geolocation" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip" varchar(45) NOT NULL,
	"status" varchar(20) NOT NULL,
	"country" varchar(100),
	"country_code" varchar(10),
	"region" varchar(20),
	"region_name" varchar(100),
	"city" varchar(100),
	"zip" varchar(20),
	"lat" real,
	"lon" real,
	"timezone" varchar(100),
	"isp" varchar(256),
	"org" varchar(256),
	"as_info" varchar(256),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ip_geolocation_ip_unique" UNIQUE("ip")
);
--> statement-breakpoint
CREATE INDEX "ip_geolocation_ip_idx" ON "ip_geolocation" USING btree ("ip");--> statement-breakpoint
CREATE INDEX "ip_geolocation_country_code_idx" ON "ip_geolocation" USING btree ("country_code");