# Cloudflare Migration Research and Planning

## Overview
Migrating GeoMeta Gallery from local Next.js + SQLite to Cloudflare Pages + D1.

## Cloudflare Pages + Next.js 15 Compatibility

### Next.js Runtime
- **Supported**: Next.js 13+ with App Router ✅
- **Runtime**: Edge Runtime (subset of Node.js APIs)
- **Static Generation**: Supported with `output: 'export'` for static sites
- **API Routes**: Supported as Edge API Routes
- **Serverless Functions**: Auto-converted to Cloudflare Functions

### Deployment Options
1. **Static Export**: `next build && next export` → upload to Pages
2. **Full-Stack**: Deploy with Functions for API routes (recommended)
3. **Hybrid**: Static pages + separate Workers for API

## Cloudflare D1 Database Analysis

### D1 Capabilities ✅
- SQLite-compatible SQL database
- Supports transactions, prepared statements
- Built for global distribution
- Scales automatically

### D1 Limitations ❌
- **No FTS5**: Full-text search not supported
- **No PRAGMA**: Some SQLite pragmas unavailable  
- **Read Replicas**: Eventually consistent reads
- **Query Timeout**: 30 second limit per query
- **Storage Limit**: 10GB per database (free tier: 5GB)

### D1 API Differences
- **Async Only**: All queries return Promises
- **Batch Operations**: Efficient bulk operations
- **Prepared Statements**: `.prepare()` then `.bind()` and `.all()/.first()/.run()`

## Current Schema Analysis

### Tables to Migrate
1. **locations** (main data table)
   - Complex JSON fields: `images`, `raw_data`
   - FTS5 virtual table for search
   - Triggers for auto-updating search index

2. **memorizer_progress** (spaced repetition)
   - Foreign key constraints
   - Indexes for performance

3. **memorizer_reviews** (review history)
   - Time-based queries for stats

### Critical Migration Issues

#### 1. Full-Text Search (CRITICAL)
**Problem**: D1 doesn't support FTS5 virtual tables
**Current**: `CREATE VIRTUAL TABLE locations_fts USING fts5(...)`
**Solutions**:
1. **Client-side search**: Filter in application code (simple, limited scale)
2. **LIKE queries**: Use `WHERE country LIKE '%term%'` (slower, basic)
3. **External search**: Integrate with Algolia/Elasticsearch (complex)
4. **Manual indexing**: Create custom search index tables

**Recommended**: Start with LIKE queries, upgrade to external search if needed

#### 2. Database Driver Migration
**Current**: `better-sqlite3` (synchronous)
```javascript
const result = db.prepare("SELECT * FROM locations").all();
```

**New**: `@cloudflare/d1` (asynchronous)
```javascript
const result = await env.DB.prepare("SELECT * FROM locations").all();
```

#### 3. Environment Variables
**Current**: `process.env.NODE_ENV`
**New**: Cloudflare environment bindings in `wrangler.toml`

## Migration Strategy

### Phase 1: Preparation
1. Create Cloudflare account and D1 database
2. Configure `wrangler.toml` and deployment settings
3. Update package.json with Cloudflare-compatible dependencies

### Phase 2: Database Migration
1. Replace better-sqlite3 with D1-compatible queries
2. Convert FTS5 to alternative search solution
3. Update all API routes to use async D1 queries
4. Create data export/import scripts

### Phase 3: Frontend Migration  
1. Update Next.js config for Cloudflare Pages compatibility
2. Configure static export settings
3. Update environment variable handling
4. Test local development with Wrangler

### Phase 4: Deployment & Testing
1. Deploy to Cloudflare Pages
2. Set up D1 database in production
3. Migrate existing data
4. Validate all functionality

## Technical Implementation Plan

### 1. Dependencies Update
```bash
# Remove
npm remove better-sqlite3 @types/better-sqlite3

# Add  
npm install @cloudflare/d1 wrangler
```

### 2. New Configuration Files
- `wrangler.toml` - Cloudflare Workers/Pages configuration
- `app/lib/db-d1.ts` - New D1 database client
- `migrations/` - SQL migration scripts for D1

### 3. API Route Updates
Convert from synchronous SQLite to asynchronous D1:
- `GET /api/gallery` - Main data fetching
- `POST /api/collect` - Data collection
- `GET /api/memorizer` - Spaced repetition
- `GET /api/stats` - Review statistics
- `GET /api/meta/[id]` - Individual location data

### 4. Search Solution
Replace FTS5 with LIKE-based search:
```sql
-- Old FTS5
SELECT * FROM locations_fts WHERE locations_fts MATCH ?

-- New LIKE-based
SELECT * FROM locations 
WHERE country LIKE ? OR meta_name LIKE ? OR note LIKE ? OR footer LIKE ?
```

## Deployment Configuration

### Cloudflare Pages Settings
```yaml
# Build command
npm run build

# Build output directory  
out/ # for static export
.next/ # for full-stack

# Environment variables
NODE_VERSION: 18
NPM_VERSION: latest
```

### Wrangler Configuration
```toml
# wrangler.toml
name = "geometa-gallery"
compatibility_date = "2024-01-01"

[env.production]
vars = { NODE_ENV = "production" }

[[env.production.d1_databases]]
binding = "DB"
database_name = "geometa-production"
database_id = "..."
```

## Risk Assessment

### High Risk ⚠️
- **FTS search functionality** - Complete rewrite needed
- **Performance degradation** - LIKE queries slower than FTS5
- **Async migration complexity** - All DB calls need async/await

### Medium Risk ⚡
- **API compatibility** - D1 query syntax differences
- **Local development** - Wrangler dev environment setup
- **Data migration** - Ensuring no data loss during transfer

### Low Risk ✅
- **Frontend compatibility** - Next.js works well with Cloudflare Pages
- **Deployment process** - Well-documented Cloudflare tooling
- **Cost** - Cloudflare free tier sufficient for development

## Success Metrics

### Functional Requirements
- [ ] All existing features work (gallery, memorizer, stats)
- [ ] Search functionality maintained (even if slower)
- [ ] Data migration successful with no loss
- [ ] API endpoints respond correctly

### Performance Requirements  
- [ ] Page load times comparable to current setup
- [ ] Search response time < 2 seconds for reasonable datasets
- [ ] Database queries execute within D1 limits

### Operational Requirements
- [ ] Easy local development with `wrangler dev`
- [ ] Automated deployment from GitHub
- [ ] Clear migration documentation for users