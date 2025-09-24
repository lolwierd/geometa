# Cloudflare Deployment Guide

This guide walks you through migrating GeoMeta Gallery to Cloudflare Pages with D1 database.

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Wrangler CLI**: Install globally
   ```bash
   npm install -g wrangler
   ```
3. **Authenticate Wrangler**:
   ```bash
   wrangler login
   ```

## Step 1: Create Cloudflare D1 Database

```bash
# Create D1 database
wrangler d1 create geometa-gallery

# Note the database ID from the output - you'll need it for wrangler.toml
```

## Step 2: Update Configuration

Edit `wrangler.toml` and replace the placeholder database IDs:

```toml
[[d1_databases]]
binding = "DB"
database_name = "geometa-dev"
database_id = "YOUR-DATABASE-ID-HERE"  # Replace with actual ID

[[env.production.d1_databases]]
binding = "DB" 
database_name = "geometa-production"
database_id = "YOUR-PRODUCTION-DATABASE-ID"  # Replace with actual ID
```

## Step 3: Set Up Database Schema

```bash
# Navigate to app directory
cd app

# Apply D1 schema
wrangler d1 execute geometa-gallery --file=db/schema-d1.sql
```

## Step 4: Export and Migrate Existing Data (Optional)

If you have existing data to migrate:

```bash
# Export existing SQLite data
npm run cloudflare:export

# Import to D1
npm run d1:import
```

## Step 5: Replace API Routes

The D1-compatible API routes have been created. To activate them, replace the existing routes:

```bash
# Backup current routes
mv src/app/api/gallery/route.ts src/app/api/gallery/route.ts.bak
mv src/app/api/collect/route.js src/app/api/collect/route.js.bak
mv src/app/api/memorizer/route.ts src/app/api/memorizer/route.ts.bak
mv src/app/api/stats/route.ts src/app/api/stats/route.ts.bak
mv src/app/api/meta/[id]/route.ts src/app/api/meta/[id]/route.ts.bak

# Activate D1 routes
mv src/app/api/gallery/route-d1.ts src/app/api/gallery/route.ts
mv src/app/api/collect/route-d1.js src/app/api/collect/route.js
mv src/app/api/memorizer/route-d1.ts src/app/api/memorizer/route.ts
mv src/app/api/stats/route-d1.ts src/app/api/stats/route.ts
mv src/app/api/meta/[id]/route-d1.ts src/app/api/meta/[id]/route.ts
```

## Step 6: Test Locally with Wrangler

```bash
# Install additional D1 dependencies (if not already installed)
npm install @cloudflare/d1

# Start local development with D1
wrangler dev --local

# Alternative: Regular Next.js dev (won't have D1 database)
npm run dev
```

## Step 7: Deploy to Cloudflare Pages

### Option A: Connect GitHub Repository

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages
2. Click "Create a project" → "Connect to Git"
3. Select your geometa repository
4. Set build settings:
   - **Build command**: `cd app && npm install && npm run build`
   - **Build output directory**: `app/.next`
   - **Root directory**: `/` (leave empty)

### Option B: Direct Deploy

```bash
# Build the application
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy .next --project-name geometa-gallery
```

## Step 8: Configure Environment Variables

In Cloudflare Dashboard → Pages → Your Project → Settings → Environment Variables:

- `NODE_ENV`: `production`
- Add any other environment variables your app needs

## Step 9: Set up Custom Domain (Optional)

1. Go to Cloudflare Dashboard → Pages → Your Project → Custom domains
2. Add your domain
3. Configure DNS records

## Troubleshooting

### Local Development Issues

**D1 Database not found**:
- Make sure you've created the D1 database: `wrangler d1 create geometa-gallery`
- Update `wrangler.toml` with correct database ID
- Run schema setup: `wrangler d1 execute geometa-gallery --file=db/schema-d1.sql`

**Build errors**:
- Check that all dependencies are installed: `npm install`
- Verify TypeScript compilation: `npm run type-check`
- Run linting: `npm run lint`

### Production Deployment Issues

**API Routes not working**:
- Verify that D1 database binding is configured in `wrangler.toml`
- Check Cloudflare Dashboard → Workers & Pages → Your Project → Settings → Functions
- Make sure environment variables are set correctly

**Search functionality slow**:
- This is expected - D1 doesn't support FTS5, so we use LIKE queries
- Consider implementing external search (Algolia) for better performance
- Optimize queries by adding appropriate indexes

## Performance Considerations

### Search Performance
- D1 LIKE-based search is slower than SQLite FTS5
- Consider limiting search results to 50-100 items max
- Add appropriate database indexes for filtered columns

### Caching
- Cloudflare automatically caches static assets
- Consider implementing API response caching for frequently accessed data
- Use Cloudflare Cache API for dynamic content caching

### Database Limits
- D1 free tier: 5GB storage, 25M read requests/month
- D1 paid tier: 10GB+ storage, 100M+ requests/month
- Monitor usage in Cloudflare Dashboard

## Rollback Plan

If you need to rollback to SQLite:

```bash
# Restore original API routes
mv src/app/api/gallery/route.ts.bak src/app/api/gallery/route.ts
mv src/app/api/collect/route.js.bak src/app/api/collect/route.js
mv src/app/api/memorizer/route.ts.bak src/app/api/memorizer/route.ts
mv src/app/api/stats/route.ts.bak src/app/api/stats/route.ts
mv src/app/api/meta/[id]/route.ts.bak src/app/api/meta/[id]/route.ts

# Revert Next.js config if needed
# Remove D1-specific dependencies
# Resume using local SQLite database
```

## Next Steps

1. Monitor application performance in Cloudflare Analytics
2. Set up monitoring/alerting for API errors
3. Consider implementing external search for better performance
4. Optimize database queries based on usage patterns
5. Set up automated backups for D1 data

## Support

- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Next.js on Cloudflare Guide](https://developers.cloudflare.com/pages/framework-guides/deploy-a-nextjs-site/)

---

For questions or issues, refer to the project's GitHub issues or Cloudflare community forums.