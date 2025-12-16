# Xandeum Network Analytics

A real-time analytics and monitoring platform for the Xandeum network. This dashboard provides insights into pNode status, network health, storage usage, and performance metrics, similar to Solana validator dashboards.

## Overview

Xandeum is building a scalable storage layer for Solana dApps. This analytics platform monitors the network of pNodes by:

- Retrieving real-time pNode data from the Xandeum gossip network via pRPC (pNode RPC) calls
- Storing historical snapshots in a PostgreSQL database
- Displaying analytics through an intuitive web interface
- Providing detailed node-level metrics and network-wide statistics

## Features

### Dashboard Features

- **Network Overview**
  - Total nodes, active nodes, and network health score
  - Real-time status distribution (active, inactive, syncing)
  - Storage usage visualization (used vs available)
  - Average uptime statistics

- **Historical Trends**
  - Network activity over time (1 hour to 30 days)
  - Active nodes trend
  - Storage usage trends
  - Configurable time ranges

- **Node Management**
  - Sortable and searchable node table
  - Grouped by public key with multiple addresses
  - Storage capacity and usage per node
  - Version tracking

- **Node Detail Pages**
  - Individual node metrics and status
  - Latency tracking over time
  - Storage usage per address
  - Version history
  - Uptime and last seen information

- **UI/UX**
  - Dark/light theme support
  - Responsive design
  - Real-time data updates
  - Interactive charts and visualizations
  - Loading states and error handling

## Tech Stack

### Frontend

- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **shadcn/ui** - UI component library
- **Recharts** - Charting library
- **TanStack Query** - Data fetching and caching
- **TanStack Table** - Data table with sorting/filtering

### Backend

- **Next.js API Routes** - Server-side API endpoints
- **PostgreSQL** - Database for historical snapshots
- **Drizzle ORM** - Type-safe database queries
- **Zod** - Schema validation

### Infrastructure

- **Vercel Analytics** - Analytics tracking
- **JSON-RPC 2.0** - Communication with Xandeum pRPC endpoints

## Architecture

### Data Flow

```
Xandeum Network (pRPC)
    ↓
Telegram Bot (Cron) → POST /api/snapshot (every 1 minute)
    ↓
PostgreSQL Database (Historical Snapshots)
    ↓
Next.js API Routes
    ↓
React Components (TanStack Query)
    ↓
User Interface
```

### Key Components

1. **RPC Client Service** (`services/rpc-client.service.ts`)
   - Handles JSON-RPC 2.0 communication
   - Automatic failover across multiple Xandeum endpoints
   - Timeout and error handling

2. **Database Service** (`services/pods-db.service.ts`)
   - Stores pod snapshots
   - Retrieves historical data
   - Network statistics aggregation
   - Cleanup operations

3. **API Service** (`services/api.service.ts`)
   - Transforms pod data to node format
   - Calculates network statistics
   - Status determination logic

4. **React Hooks** (`hooks/`)
   - `useNodes` - Fetch all nodes
   - `useNodeMetrics` - Fetch node-specific metrics
   - `useNetworkStats` - Network-wide statistics
   - `useNetworkHistory` - Historical trends

## Getting Started

### Prerequisites

- Node.js 20+ (or Bun)
- PostgreSQL database
- Access to Xandeum pRPC endpoints

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/Code-Parth/xandeum-analytics-ui.git
cd xandeum-analytics-ui
```

2. **Install dependencies**

```bash
bun install
# or
bun install
```

3. **Set up environment variables**

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

4. **Set up the database**

```bash
# Generate migration files
bun run db:generate

# Run migrations
bun run db:migrate

# Or push schema directly (development)
bun run db:push
```

5. **Start the development server**

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/xandeum_analytics"

# Cron secret for snapshot API authentication
# Generate with: openssl rand -hex 32
CRON_SECRET="your-random-secret-here"

# RPC timeout (optional, default: 10000ms)
RPC_TIMEOUT_MS=10000
```

### Environment Variable Details

- **DATABASE_URL**: PostgreSQL connection string
- **CRON_SECRET**: Secret token for authenticating snapshot API calls (used by the Telegram bot)
- **RPC_TIMEOUT_MS**: Timeout for RPC calls in milliseconds (default: 10000)

## Database Setup

### Schema

The database stores pod snapshots with the following key fields:

- `address` - Node address (IP:port)
- `pubkey` - Public key identifier
- `version` - Node software version
- `lastSeenTimestamp` - Last seen timestamp
- `uptime` - Uptime in seconds
- `storageCommitted` - Committed storage capacity
- `storageUsed` - Used storage
- `storageUsagePercent` - Storage usage percentage
- `snapshotTimestamp` - When the snapshot was taken

### Database Commands

```bash
# Generate migration from schema changes
bun run db:generate

# Run migrations
bun run db:migrate

# Push schema directly (development only)
bun run db:push

# Open Drizzle Studio (database GUI)
bun run db:studio
```

## API Endpoints

### Public Endpoints

- `GET /api/health` - Health check endpoint
- `GET /api/pods/latest` - Get latest pod snapshot
- `GET /api/pods/history` - Get historical pod data
- `GET /api/nodes/[pubkey]/metrics` - Get node metrics
- `POST /api/rpc` - Proxy for JSON-RPC calls

### Protected Endpoints (require CRON_SECRET)

- `POST /api/snapshot` - Create new snapshot (called by cron)
- `POST /api/cleanup` - Cleanup old snapshots (90+ days)

### Example API Usage

```bash
# Get latest snapshot
curl http://localhost:3000/api/pods/latest

# Create snapshot (requires auth)
curl -X POST http://localhost:3000/api/snapshot \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Health check
curl http://localhost:3000/api/health
```

## Cron Jobs & Data Collection

This application relies on external cron jobs to collect and store network snapshots. The cron job system is implemented as a separate Telegram bot that periodically calls the snapshot API.

### Telegram Bot Repository

For detailed information about setting up and running the cron job system, please refer to the separate Telegram bot repository:

**[Telegram Bot Repository](https://github.com/Code-Parth/xandeum-analytics-cron-bot)**

The Telegram bot:

- Calls `POST /api/snapshot` every 1 minute
- Authenticates using the `CRON_SECRET` environment variable
- Handles errors and retries
- Provides monitoring and alerts via Telegram

### Snapshot Process

1. The Telegram bot calls `/api/snapshot` every minute
2. The API fetches current pod data from Xandeum pRPC endpoints
3. Data is validated and stored in PostgreSQL
4. The dashboard displays the latest snapshot data

### Cleanup Process

The cleanup endpoint (`POST /api/cleanup`) should be called every 90 days to remove old snapshots:

```bash
curl -X POST http://localhost:3000/api/cleanup \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Development

### Available Scripts

```bash
# Development
bun run dev          # Start development server

# Build
bun run build        # Build for production
bun run start        # Start production server

# Code Quality
bun run lint         # Run ESLint
bun run lint:fix     # Fix ESLint errors and format
bun run typecheck    # TypeScript type checking

# Database
bun run db:generate  # Generate migrations
bun run db:migrate   # Run migrations
bun run db:push      # Push schema (dev only)
bun run db:studio    # Open Drizzle Studio
```

### Development Workflow

1. Make changes to the codebase
2. Run `bun run typecheck` to check for TypeScript errors
3. Run `bun run lint` to check for linting issues
4. Test locally with `bun run dev`
5. If schema changes are made, run `bun run db:generate` and `bun run db:migrate`

### Code Structure

- `app/` - Next.js App Router pages and API routes
- `components/` - React components
- `hooks/` - Custom React hooks
- `services/` - Business logic and API services
- `db/` - Database schema and migrations
- `types/` - TypeScript type definitions
- `schemas/` - Zod validation schemas
- `config/` - Configuration files
- `utils/` - Utility functions

## Deployment

### Vercel Deployment

1. **Connect your repository to Vercel**

2. **Set environment variables** in Vercel dashboard:
   - `DATABASE_URL`
   - `CRON_SECRET`
   - `RPC_TIMEOUT_MS` (optional)

3. **Deploy**

Vercel will automatically:

- Build the Next.js application
- Run database migrations (if configured)
- Deploy to production

### Database Migrations

For production deployments, ensure migrations are run:

```bash
# On your deployment platform or CI/CD
bun run db:migrate
```

### Setting Up the Cron Bot

After deploying the main application:

1. Deploy the Telegram bot (see separate repository)
2. Configure the bot with:
   - Your application URL
   - `CRON_SECRET` value
   - Snapshot interval (recommended: 1 minute)

## Project Structure

```
xandeum-analytics-ui/
├── app/
│   ├── api/              # API routes
│   │   ├── cleanup/      # Cleanup endpoint
│   │   ├── health/       # Health check
│   │   ├── nodes/        # Node metrics
│   │   ├── pods/         # Pod data endpoints
│   │   ├── rpc/          # RPC proxy
│   │   └── snapshot/     # Snapshot creation
│   ├── node/[pubkey]/    # Node detail pages
│   ├── page.tsx          # Dashboard home
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── components/
│   ├── ui/               # shadcn/ui components
│   └── chart-info-hover.tsx
├── config/
│   └── endpoints.ts      # Xandeum RPC endpoints
├── constants/
│   └── index.ts
├── db/
│   ├── migrations/       # Database migrations
│   ├── schema.ts         # Drizzle schema
│   └── index.ts          # Database connection
├── hooks/                # React hooks
├── lib/
│   └── utils.ts          # Utility functions
├── provider/             # React providers
├── schemas/              # Zod schemas
├── services/             # Business logic
├── theme/                # Theme configuration
├── types/                # TypeScript types
└── utils/                # Utility functions
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`bun run lint` and `bun run typecheck`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style

- Follow TypeScript best practices
- Use ESLint and Prettier (configured)
- Write descriptive commit messages
- Add comments for complex logic

## License

This project is licensed under the MIT License.

## Links

- **Xandeum Network**: [xandeum.network](https://xandeum.network)
- **Xandeum Discord**: [discord.gg/uqRSmmM5m](https://discord.gg/uqRSmmM5m)
- **Cron Bot Repository**: [GitHub Repository](https://github.com/Code-Parth/xandeum-analytics-cron-bot)

## Acknowledgments

- Thanks to [Bernie Blume](https://x.com/bernieblume) for helpful clarifications and insights about Xandeum’s architecture
- Built for the Xandeum Labs analytics platform challenge on [Superteam Earn](https://earn.superteam.fun/listing/develop-analytics-platform-for-xandeum-pnodes)
- Inspired by Solana validator dashboards (stakewiz.com, topvalidators.app, validators.app)

---

**Note**: This platform is designed to monitor the Xandeum network of pNodes and provide analytics similar to Solana validator dashboards based on provided data
