# Cloudflare Migration Summary

## 🎉 Migration Complete!

GeoMeta Gallery now supports both **Local SQLite** and **Cloudflare D1** deployment modes.

## Quick Start

### Option 1: Local Development (SQLite)
```bash
cd app
npm install
npm run db:init
npm run dev
```

### Option 2: Cloudflare Deployment (D1)
```bash
cd app
npm install

# Switch to D1 mode
npm run migrate:d1

# Set up Cloudflare D1 (see DEPLOYMENT.md for full guide)
wrangler d1 create geometa-gallery
# Update wrangler.toml with database ID
wrangler d1 execute geometa-gallery --file=db/schema-d1.sql

# Deploy to Cloudflare Pages
wrangler pages deploy
```

## Migration Commands

| Command | Description |
|---------|-------------|
| `npm run migrate:d1` | Switch to Cloudflare D1 mode |
| `npm run migrate:sqlite` | Switch back to SQLite mode |
| `npm run migrate:status` | Check current mode |
| `npm run cloudflare:export` | Export SQLite data for D1 |

## Key Differences

### SQLite Mode (Default)
- ✅ **Local Development**: No external dependencies
- ✅ **Full-Text Search**: Fast FTS5 virtual tables
- ✅ **Synchronous**: Simple database operations
- ❌ **Scalability**: Single server deployment

### Cloudflare D1 Mode  
- ✅ **Global Scale**: Distributed database
- ✅ **Auto-scaling**: Handles traffic spikes
- ✅ **Edge Runtime**: Faster cold starts
- ❌ **Search Performance**: LIKE queries (slower than FTS5)
- ❌ **Setup Complexity**: Requires Cloudflare account

## Architecture

### Database Layer
```
SQLite Mode:     better-sqlite3 → Local SQLite DB
D1 Mode:        @cloudflare/d1 → Cloudflare D1 DB
```

### Search Implementation
```
SQLite Mode:    FTS5 Virtual Tables (fast)
D1 Mode:       LIKE Queries across multiple fields (slower but functional)
```

### Runtime Environment
```
SQLite Mode:    Node.js Runtime
D1 Mode:       Cloudflare Edge Runtime
```

## Migration Path

1. **Start with SQLite** for local development
2. **Export data** when ready to deploy: `npm run cloudflare:export`
3. **Switch to D1** mode: `npm run migrate:d1`
4. **Deploy to Cloudflare** following `DEPLOYMENT.md`
5. **Import data** to D1: `npm run d1:import`

## Performance Notes

- **SQLite**: Excellent for development, single-server production
- **D1**: Better for global scale, high availability production
- **Search**: SQLite FTS5 ~5-10x faster than D1 LIKE queries
- **Latency**: D1 provides global edge distribution

## Documentation

- `DEPLOYMENT.md` - Complete Cloudflare deployment guide
- `CLOUDFLARE_MIGRATION.md` - Technical migration details
- `MIGRATION.md` - Original v1→v2 migration guide

---

Both modes maintain **100% feature compatibility** - choose based on your deployment needs!