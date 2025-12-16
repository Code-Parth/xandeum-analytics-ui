# Cron Setup Guide for Xandeum Analytics

This guide explains how to set up automated snapshots for historical data collection.

## Overview

The Xandeum Analytics platform requires periodic snapshots of pNode data to build historical trends. You can set up automated snapshots using either:

1. **GitHub Actions** (Recommended) - Free, integrated with your repository
2. **cron-job.org** - External service, works with any hosting platform

---

## Option 1: GitHub Actions (Recommended)

### Prerequisites

- GitHub repository for your project
- Deployed application (e.g., on Vercel)

### Setup Steps

1. **Generate CRON_SECRET**

   ```bash
   openssl rand -hex 32
   ```

   Save this value - you'll need it for both GitHub and Vercel.

2. **Add Secret to GitHub**
   - Go to your repository on GitHub
   - Navigate to **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `CRON_SECRET`
   - Value: Paste the generated secret from step 1
   - Click **Add secret**

3. **Add Environment Variable to Vercel**
   - Go to your project on Vercel
   - Navigate to **Settings** → **Environment Variables**
   - Add new variable:
     - Name: `CRON_SECRET`
     - Value: Same secret from step 1
     - Scope: All environments (Production, Preview, Development)
   - Click **Save**

4. **Enable GitHub Actions**
   - The workflow files already exist:
     - `.github/workflows/snapshot-cron.yml` - Snapshot job
     - `.github/workflows/cleanup-cron.yml` - Cleanup job
   - GitHub Actions will automatically run based on the schedule:
     - **Snapshot job**: Every 1 minute
     - **Cleanup job**: Every 90 days (quarterly on 1st of Jan, Apr, Jul, Oct)

5. **Verify Workflow**
   - Go to **Actions** tab in your GitHub repository
   - You should see both workflows:
     - "Snapshot Cron Job" - Runs every minute
     - "Cleanup Cron Job" - Runs every 90 days
   - Click on each to view runs
   - You can manually trigger either using "Run workflow" button

### Manual Trigger

To manually test the snapshot:

```bash
curl -X POST https://your-app.vercel.app/api/snapshot \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

---

## Option 2: cron-job.org

If you prefer an external cron service (e.g., if using Vercel free tier limitations):

### Setup Steps

1. **Create Account**
   - Go to https://cron-job.org
   - Sign up for a free account

2. **Create Snapshot Job**
   - Click **Create cronjob**
   - Configuration:
     - **Title**: Xandeum Snapshot
     - **URL**: `https://your-app.vercel.app/api/snapshot`
     - **Method**: POST
     - **Schedule**: Every 1 minute (`*/1 * * * *`)
     - **Headers**:
       - `Authorization: Bearer YOUR_CRON_SECRET`
       - `Content-Type: application/json`
   - Click **Save**

3. **Create Cleanup Job**
   - Click **Create cronjob**
   - Configuration:
     - **Title**: Xandeum Cleanup
     - **URL**: `https://your-app.vercel.app/api/cleanup`
     - **Method**: POST
     - **Schedule**: Every 90 days - Quarterly (`0 0 1 */3 *`)
     - **Headers**:
       - `Authorization: Bearer YOUR_CRON_SECRET`
       - `Content-Type: application/json`
   - Click **Save**

4. **Monitor Executions**
   - cron-job.org provides execution logs
   - Check regularly to ensure jobs are running successfully

---

## Verifying Data Collection

After setting up cron jobs, verify data is being collected:

1. **Check Snapshot API**

   ```bash
   curl https://your-app.vercel.app/api/pods/latest
   ```

   Should return recent pod data with timestamps.

2. **Check Historical Data**

   ```bash
   curl https://your-app.vercel.app/api/pods/history?hours=1
   ```

   After 1 hour of running, should return historical data points.

3. **Monitor Database**
   - Use Drizzle Studio: `npm run db:studio`
   - Check `pods_snapshot` table for growing data

---

## Troubleshooting

### Problem: "Unauthorized" error

**Solution**: Verify `CRON_SECRET` matches in all locations:

- GitHub Secrets (if using GitHub Actions)
- Vercel Environment Variables
- cron-job.org headers (if using external service)

### Problem: No historical data showing

**Solution**:

1. Check cron job is running (check logs)
2. Verify PostgreSQL database is accessible
3. Check `DATABASE_URL` environment variable is set correctly
4. Ensure at least 1-2 snapshots have been stored

### Problem: GitHub Actions not running

**Solution**:

1. Verify workflow file exists at `.github/workflows/snapshot-cron.yml`
2. Check GitHub Actions are enabled for your repository
3. Review Actions tab for error messages
4. Note: Scheduled workflows may have up to 10-minute delay on GitHub

### Problem: Database filling up too fast

**Solution**:

1. Cleanup job should run daily to remove old data
2. Manually trigger cleanup:
   ```bash
   curl -X POST https://your-app.vercel.app/api/cleanup \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```
3. Adjust retention period in cleanup API if needed

---

## Advanced Configuration

### Change Snapshot Frequency

**GitHub Actions**:
Edit `.github/workflows/snapshot-cron.yml`:

```yaml
schedule:
  - cron: "*/5 * * * *" # Every 5 minutes instead of 1
```

**cron-job.org**:

- Edit the job schedule to `*/5 * * * *`

### Change Data Retention Period

Edit `/app/api/cleanup/route.ts`:

```typescript
const deletedCount = await podsDbService.cleanupOldSnapshots(180); // 180 days instead of 90
```

---

## Monitoring Best Practices

1. **Set up Alerts**: Configure monitoring for failed cron jobs
2. **Check Logs**: Review Vercel logs regularly for errors
3. **Database Size**: Monitor PostgreSQL storage usage
4. **API Performance**: Track response times for `/api/snapshot`

---

## Cost Considerations

- **GitHub Actions**: Free for public repositories, 2000 minutes/month for private
- **cron-job.org**: Free tier supports frequent jobs
- **Database**: ~50-100 MB for 90 days of 1-minute snapshots
- **Vercel**: Serverless function invocations count toward quota

**Recommendation**: Start with 1-minute snapshots, adjust based on needs and costs.
