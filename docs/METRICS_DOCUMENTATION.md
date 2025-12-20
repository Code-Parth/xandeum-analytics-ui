# Xandeum Analytics - Metrics Documentation

This document provides comprehensive information about all charts, metrics, and calculations used in the Xandeum Analytics platform.

## Table of Contents

- [Data Source](#data-source)
- [Core Calculations](#core-calculations)
- [Dashboard Metrics](#dashboard-metrics)
- [Node Detail Page Metrics](#node-detail-page-metrics)
- [Geographic Distribution](#geographic-distribution)
- [Data Flow Architecture](#data-flow-architecture)

---

## Data Source

The platform uses two main data sources:

### 1. `pods_snapshot` Table

Stores periodic snapshots of node states captured every minute via a cron job.

#### Snapshot Fields

| Field                   | Type      | Description                                       |
| ----------------------- | --------- | ------------------------------------------------- |
| `address`               | string    | Node address in format `IP:port`                  |
| `pubkey`                | string    | Node's public key identifier                      |
| `version`               | string    | Node software version                             |
| `last_seen_timestamp`   | number    | Unix timestamp when node was last seen responding |
| `snapshot_timestamp`    | timestamp | When this snapshot was captured                   |
| `uptime`                | number    | Node uptime in seconds                            |
| `storage_committed`     | number    | Total storage capacity in bytes                   |
| `storage_used`          | number    | Used storage in bytes                             |
| `storage_usage_percent` | number    | Storage usage percentage                          |
| `is_public`             | boolean   | Whether the node is publicly accessible           |
| `rpc_port`              | number    | RPC port number                                   |

### 2. `ip_geolocation` Table

Stores geographic location data for unique IP addresses extracted from node addresses.

#### Geolocation Fields

| Field         | Type   | Description                                |
| ------------- | ------ | ------------------------------------------ |
| `ip`          | string | IP address (IPv4 or IPv6)                  |
| `status`      | string | Lookup status ("success" or "fail")        |
| `country`     | string | Country name                               |
| `countryCode` | string | ISO country code (e.g., "US", "DE")        |
| `region`      | string | Region/state code                          |
| `regionName`  | string | Full region/state name                     |
| `city`        | string | City name                                  |
| `zip`         | string | ZIP/postal code                            |
| `lat`         | number | Latitude coordinate                        |
| `lon`         | number | Longitude coordinate                       |
| `timezone`    | string | Timezone (e.g., "America/New_York")        |
| `isp`         | string | Internet Service Provider name             |
| `org`         | string | Organization name                          |
| `asInfo`      | string | Autonomous System information              |
| `createdAt`   | date   | When the geolocation data was first stored |

**Data Source**: [ip-api.com](http://ip-api.com) - Free IP geolocation API

**Rate Limits**:

- 45 requests per minute
- 100 IPs per batch request
- Data is cached to minimize API calls

---

## Core Calculations

### Active/Inactive State Detection

A node is considered **active** or **inactive** based on the time difference between when the snapshot was taken and when the node was last seen responding.

```
latency = snapshot_timestamp - last_seen_timestamp

if latency ≤ 120 seconds (2 minutes):
    status = "active"
else if latency ≤ 300 seconds (5 minutes):
    status = "syncing"
else:
    status = "inactive"
```

**Code Reference**: `services/api.service.ts` - `determineStatus()` method

### Latency Calculation

Latency represents how recently the node was seen at any given snapshot point:

```
latency_ms = (snapshot_timestamp - last_seen_timestamp) × 1000
```

- **Low latency** (< 30s): Node is responsive and healthy
- **Medium latency** (30s - 120s): Node may be experiencing delays
- **High latency** (> 120s): Node is considered inactive

### Uptime Percentage

Uptime is calculated based on a 30-day rolling window:

```
max_uptime_seconds = 30 × 24 × 60 × 60  // 2,592,000 seconds
uptime_percentage = min(100, (uptime_seconds / max_uptime_seconds) × 100)
```

**Note**: Nodes running longer than 30 days are capped at 100%.

### Gap Detection

A "gap" in data indicates a period when the node was not present in snapshots:

```
gap_threshold = 5 minutes (300,000 ms)

if (current_snapshot_time - previous_snapshot_time) > gap_threshold:
    // This is an inactive period (gap)
```

---

## Dashboard Metrics

### Node Status Distribution (Pie Chart)

**What it shows**: Current distribution of nodes by status.

**Categories**:

- **Active**: Nodes with latency ≤ 120 seconds
- **Inactive**: Nodes with latency > 300 seconds or missing pubkey
- **Syncing**: Nodes with latency between 120-300 seconds

**Calculation**:

```
active_count = count(nodes where status = "active")
inactive_count = count(nodes where status = "inactive")
syncing_count = count(nodes where status = "syncing")
```

### Storage Usage (Pie Chart)

**What it shows**: Network-wide storage utilization.

**Calculation**:

```
total_storage = sum(storage_committed) for all nodes
used_storage = sum(storage_used) for all nodes
available_storage = total_storage - used_storage
usage_percent = (used_storage / total_storage) × 100
```

### Network Health Score

**What it shows**: Overall network health on a 0-100 scale.

**Formula**:

```
active_ratio = active_nodes / total_nodes  // 0.0 to 1.0
average_uptime = avg(uptime_percentage)    // 0 to 100

network_health = (active_ratio × 60) + (average_uptime × 0.4)
```

- Active ratio contributes 60 points (60%)
- Average uptime contributes 40 points (40%)
- Maximum possible score: 100

### Active Nodes Trend (Line Chart)

**What it shows**: Historical count of total and active nodes over time.

**Data points** (per snapshot):

```
total_nodes = count(distinct addresses)
active_nodes = count(distinct addresses where is_public = true
                     AND pubkey is not null
                     AND latency ≤ 120 seconds)
```

### Storage Trend (Line Chart)

**What it shows**: Historical storage capacity and usage over time.

**Data points** (per snapshot):

```
total_storage_gb = sum(storage_committed) / (1024³)
used_storage_gb = sum(storage_used) / (1024³)
```

---

## Node Detail Page Metrics

### Identity Card

**What it shows**: Node identification information.

**Data**:

- Full public key
- All known IP addresses and ports
- Primary address (most recently seen)

### Versions Card

**What it shows**: Software version information.

**Data**:

- Current version (from latest snapshot)
- Historical versions (all unique versions seen in the time range)

### Status Card

**What it shows**: Current node health.

**Data**:

- Last seen: Time since node was last responsive
- Uptime: Percentage based on 30-day window

---

### Latency Chart (Per Address)

**What it shows**: Response time trend for each address over the selected time range.

**Y-axis**: Latency in seconds
**X-axis**: Time

**Calculation per data point**:

```
latency_seconds = (snapshot_timestamp - last_seen_timestamp) / 1000
```

**Interpretation**:

- Flat low line: Node is consistently responsive
- Spikes: Temporary delays or brief outages
- Rising trend: Node becoming less responsive

---

### Storage Usage Chart (Per Address)

**What it shows**: Storage capacity and usage over time per address.

**Lines**:

- **Committed (GB)**: Total storage capacity
- **Used (GB)**: Actual storage used

**Calculation**:

```
committed_gb = storage_committed / (1024³)
used_gb = storage_used / (1024³)
```

---

### Activity Timeline

**What it shows**: Visual timeline of active and inactive periods for each address.

**How it works**:

1. **Fetch snapshots** for the pubkey within the time range
2. **Group by address**
3. **Detect gaps** between consecutive snapshots (gap > 5 minutes = inactive)
4. **Determine status** at each snapshot based on latency
5. **Merge consecutive periods** of the same status

**Visual representation**:

- **Green segments**: Active periods (latency ≤ 120s)
- **Gray segments**: Inactive periods (gaps or high latency)

**Summary stats per address**:

```
uptime_percent = (total_active_ms / total_duration_ms) × 100
gap_count = count(inactive periods)
```

**Code Reference**: `services/pods-db.service.ts` - `getNodeActivityPeriods()`

---

### Activity Heatmap

**What it shows**: When the node is typically active, displayed as a 7×24 grid (days × hours).

**Grid structure**:

- **Rows**: Hours (0-23)
- **Columns**: Days of week (Sunday-Saturday)
- **Cells**: Activity percentage for that time slot

**Calculation per cell**:

```
For each (day_of_week, hour) bucket:
  total_snapshots = count(snapshots in this bucket)
  active_snapshots = count(snapshots where latency ≤ 120s)
  activity_percent = (active_snapshots / total_snapshots) × 100
```

**Color scale**:
| Activity % | Color |
|------------|-------|
| ≥ 90% | Bright green (highly active) |
| 70-89% | Light green |
| 50-69% | Medium green |
| 30-49% | Pale green |
| 1-29% | Very pale green |
| 0% (with data) | Red (inactive) |
| No data | Gray |

**Summary stats**:

- **Overall Activity**: Average activity across all cells with data
- **Data Coverage**: Number of hour slots with data (out of 168 possible)
- **Most Active**: Day/hour with highest activity %
- **Least Active**: Day/hour with lowest activity %

**Code Reference**: `services/pods-db.service.ts` - `getNodeActivityHeatmap()`

---

### Downtime Report

**What it shows**: Summary of historical downtime incidents.

**How incidents are detected**:

1. Collect all **inactive periods** from all addresses
2. Sort by start time
3. **Merge overlapping** inactive periods into single incidents
4. Calculate summary statistics

**Metrics**:

| Metric                           | Calculation                                |
| -------------------------------- | ------------------------------------------ |
| **Total Incidents**              | Count of distinct downtime events          |
| **Total Downtime**               | Sum of all incident durations              |
| **Longest Outage**               | Maximum incident duration                  |
| **MTTR** (Mean Time To Recovery) | `total_downtime / total_incidents`         |
| **Current Streak**               | Duration of current active/inactive period |

**Incident table columns**:

- **Time**: When the incident started
- **Duration**: How long the outage lasted
- **Addresses Affected**: How many addresses were down (e.g., "1 of 2")

**Code Reference**: `components/downtime-report.tsx`

---

## Geographic Distribution

The platform tracks and visualizes the geographic distribution of network nodes using IP geolocation data.

### Node Geographic Distribution (World Map)

**What it shows**: Interactive world map displaying the global distribution of all network nodes.

**Location**: Dashboard main page

**Data aggregation**:

```
For each unique IP address:
  1. Extract IP from node address (IP:port format)
  2. Lookup geolocation data (country, city, coordinates)
  3. Group nodes by IP location
  4. Track first seen and last seen timestamps
  5. Count unique pubkeys per location
```

**Metrics displayed**:

- **Total Nodes**: Unique count of pubkeys across all locations
- **Total Locations**: Number of unique geographic locations (by IP)
- **Countries**: Number of countries where nodes are present
- **Top Countries**: Ranking by node count with IP count breakdowns

**Visual elements**:

- **Connection Lines**: Display connections between major node locations (max 20 connections)
- **Location Markers**: Show geographic coordinates with node count labels
- **Country Badges**: List top 10 countries with node and IP counts

**Connection algorithm**:

```
1. Sort locations by node count (descending)
2. For each location (max 20 connections):
   - Find locations in different countries
   - Create connection between them
   - Skip if locations have same coordinates
   - Avoid duplicate pairs
3. Display as curved lines on world map
```

**Code Reference**: `components/node-world-map.tsx`, `components/ui/world-map.tsx`

---

### Node Location Map (Individual Node)

**What it shows**: Geographic locations where a specific node has operated over time.

**Location**: Individual node detail page

**Data per location**:

| Metric             | Description                                  |
| ------------------ | -------------------------------------------- |
| **IP Address**     | The IP where the node was seen               |
| **Coordinates**    | Latitude and longitude                       |
| **Location**       | City, region, country                        |
| **ISP/Org**        | Internet service provider and organization   |
| **First Seen**     | Earliest snapshot timestamp at this location |
| **Last Seen**      | Most recent snapshot timestamp               |
| **Snapshot Count** | Total snapshots captured from this IP        |

**Calculation**:

```sql
For a given pubkey:
  SELECT
    address,
    MIN(snapshot_timestamp) as first_seen,
    MAX(snapshot_timestamp) as last_seen,
    COUNT(*) as snapshot_count
  FROM pods_snapshot
  WHERE pubkey = :pubkey
  GROUP BY address

Then:
  1. Extract unique IPs from addresses
  2. Join with ip_geolocation table
  3. Aggregate multiple ports from same IP
  4. Merge first_seen (earliest) and last_seen (latest)
  5. Sum snapshot_count per IP
```

**IP Aggregation Logic**:

- Multiple addresses with same IP but different ports are merged
- Coordinates and location info come from the IP (not port-specific)
- Timestamps show the full time range the node was active from that IP
- Snapshot count represents total observations across all ports

**Code Reference**: `components/node-location-map.tsx`

---

### IP Extraction & Geolocation Process

**How IP addresses are processed**:

1. **Snapshot Creation** (`POST /api/snapshot`):
   - New node snapshots are stored in `pods_snapshot` table
   - Each snapshot includes `address` field (format: `IP:port`)

2. **IP Extraction**:

   ```
   address = "192.168.1.100:8899"
   ip = address.split(":")[0]  // "192.168.1.100"
   ```

3. **Deduplication Check**:

   ```
   Query ip_geolocation table for existing IP
   If IP exists: Skip (data already cached)
   If IP is new: Add to lookup queue
   ```

4. **Batch Geolocation Lookup**:

   ```
   Batch new IPs (max 100 per request)
   POST to ip-api.com/batch with IP list
   Wait for rate limit (45 requests/min)
   Store results in ip_geolocation table
   ```

5. **Data Caching**:
   - Each IP is looked up **only once**
   - Results are permanently cached in database
   - Future snapshots from same IP use cached data

**Rate Limiting Strategy**:

- Track request timestamps in memory
- Maximum 45 requests per 60-second window
- Minimum ~1334ms delay between requests
- Automatic wait/retry if limit is approached
- Graceful handling of 429 (rate limit exceeded) responses

**Code Reference**: `services/ip-geolocation.service.ts`

---

### Geographic Distribution Metrics

**Country Statistics**:

```
For each country:
  unique_ips = count(distinct IP addresses in that country)
  total_nodes = count(distinct pubkeys from IPs in that country)

Display format: "US: 15 nodes (8 IPs)"
```

**Time Range Metadata**:

```
earliest_first_seen = MIN(first_seen) across all locations
latest_last_seen = MAX(last_seen) across all locations

This shows the full time span of geographic data collection
```

**Data Coverage**:

- Geographic data is **cumulative and historical**
- Once a node is seen at a location, that location is tracked forever
- `firstSeen` and `lastSeen` show when the node was active at each location
- Nodes may appear in multiple locations if they've moved IPs

---

## Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                           XANDEUM NETWORK                        │
│                          (pNodes via pRPC)                       │
└──────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                       CRON JOB (Every 1 minute)                  │
│                          POST /api/snapshot                      │
└──────────────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
┌──────────────────────────────────┐  ┌──────────────────────────┐
│     PostgreSQL DATABASE          │  │   IP Geolocation         │
│     pods_snapshot table          │  │   Service                │
│  ┌────────────────────────────┐  │  │  (ip-api.com)            │
│  │ id | address | pubkey |... │  │  │  Rate limit: 45 req/min  │
│  └────────────────────────────┘  │  └──────────────────────────┘
└──────────────────────────────────┘              │
                    │                             ▼
                    │              ┌──────────────────────────────┐
                    │              │  PostgreSQL DATABASE         │
                    │              │  ip_geolocation table        │
                    │              │  ┌──────────────────────┐    │
                    │              │  │ ip | lat | lon | ... │    │
                    │              │  └──────────────────────┘    │
                    │              └──────────────────────────────┘
                    │                             │
                    └──────────────┬──────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────┐
│  /api/pods/     │    │  /api/nodes/    │    │ /api/geolocation    │
│    latest       │    │   [pubkey]/     │    │ /api/nodes/         │
│  /api/pods/     │    │    metrics      │    │  [pubkey]/          │
│    history      │    │    activity     │    │  geolocation        │
│                 │    │    heatmap      │    │                     │
└─────────────────┘    └─────────────────┘    └─────────────────────┘
         │                         │                         │
         ▼                         ▼                         ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────┐
│  useNodes()     │    │ useNodeMetrics()│    │ useNodesGeolocation()│
│  useNetworkStats│    │ useNodeActivity()│   │ useNodeGeolocation() │
│                 │    │ useNodeHeatmap() │   │                     │
└─────────────────┘    └─────────────────┘    └─────────────────────┘
         │                         │                         │
         └─────────────────────────┼─────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                         REACT COMPONENTS                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │Dashboard │ │ Node     │ │ Activity │ │ Downtime │ │ World  │ │
│  │ Charts   │ │ Metrics  │ │ Heatmap  │ │ Report   │ │ Map    │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints Reference

| Endpoint                          | Method | Description                                |
| --------------------------------- | ------ | ------------------------------------------ |
| `/api/pods/latest`                | GET    | Latest snapshot for all nodes              |
| `/api/pods/history`               | GET    | Historical network statistics              |
| `/api/nodes/[pubkey]/metrics`     | GET    | Node-specific snapshot history             |
| `/api/nodes/[pubkey]/activity`    | GET    | Activity periods per address               |
| `/api/nodes/[pubkey]/heatmap`     | GET    | Activity heatmap data                      |
| `/api/nodes/[pubkey]/geolocation` | GET    | Node geographic locations with history     |
| `/api/geolocation`                | GET    | All nodes geolocation data for world map   |
| `/api/snapshot`                   | POST   | Create snapshot (protected, requires auth) |

### Query Parameters

**Common parameters**:

- `hours`: Time range in hours (default: 24)
- `days`: Time range in days (for heatmap, default: 7)
- `startTime`: ISO timestamp for custom range start
- `endTime`: ISO timestamp for custom range end
- `gapThreshold`: Minutes to consider as gap (default: 5)

---

## Glossary

| Term               | Definition                                                       |
| ------------------ | ---------------------------------------------------------------- |
| **Latency**        | Time since node was last seen responding                         |
| **Snapshot**       | Point-in-time capture of all node states                         |
| **Gap**            | Period when node was missing from snapshots (>5 min)             |
| **MTTR**           | Mean Time To Recovery - average incident duration                |
| **Uptime**         | Percentage of time node was active over 30 days                  |
| **Active**         | Node responding within 120 seconds                               |
| **Inactive**       | Node not seen for >300 seconds or missing from snapshots         |
| **Geolocation**    | Geographic coordinates and location info derived from IP         |
| **IP Aggregation** | Merging multiple addresses with the same IP but different ports  |
| **Location**       | Unique geographic point defined by IP address                    |
| **First Seen**     | Earliest timestamp a node was observed at a specific location    |
| **Last Seen**      | Most recent timestamp a node was observed at a specific location |

---

## Code References

For implementation details, see:

### Core Services

- **Status Detection**: `services/api.service.ts`
- **Activity Periods**: `services/pods-db.service.ts` → `getNodeActivityPeriods()`
- **Heatmap Data**: `services/pods-db.service.ts` → `getNodeActivityHeatmap()`
- **Network Stats**: `services/pods-db.service.ts` → `getNetworkHistory()`
- **IP Geolocation**: `services/ip-geolocation.service.ts`
  - `extractIp()` - Extract IP from address string
  - `getNewIps()` - Check for IPs not yet in database
  - `fetchGeolocationBatch()` - Batch fetch from ip-api.com
  - `storeGeolocation()` - Cache results in database
  - `getAllNodesWithGeolocation()` - Get all nodes with location data
  - `getNodeLocationsWithHistory()` - Get locations for specific node

### React Components

- **World Map**: `components/node-world-map.tsx`, `components/ui/world-map.tsx`
- **Node Location**: `components/node-location-map.tsx`
- **Activity Heatmap**: `components/activity-heatmap.tsx`
- **Activity Timeline**: `components/activity-timeline.tsx`
- **Downtime Report**: `components/downtime-report.tsx`

### React Hooks

- **Geolocation**: `hooks/useNodesGeolocation.ts`, `hooks/useNodeGeolocation.ts`
- **Activity**: `hooks/useNodeActivity.ts`, `hooks/useNodeHeatmap.ts`
- **Metrics**: `hooks/useNodeMetrics.ts`, `hooks/useNodes.ts`

### Database Schema

- **Tables**: `db/schema.ts` - `podsSnapshot`, `ipGeolocation`
- **Migrations**: `db/migrations/` - Database migration files

### API Routes

- **Geolocation Endpoints**: `app/api/geolocation/route.ts`, `app/api/nodes/[pubkey]/geolocation/route.ts`
- **Node Endpoints**: `app/api/nodes/[pubkey]/metrics/route.ts`, `app/api/nodes/[pubkey]/activity/route.ts`
- **Snapshot**: `app/api/snapshot/route.ts`

### Types

- **TypeScript Definitions**: `types/index.ts` - All type definitions including geolocation types

---
