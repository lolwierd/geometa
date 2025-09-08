# GeoMeta Gallery - GitHub Copilot Instructions

**Always follow these instructions first and only fallback to additional search and context gathering if the information here is incomplete or found to be in error.**

## Repository Overview

GeoMeta Gallery is a Next.js 15 application that helps users collect and study GeoGuessr meta information through:
- **Main app**: Next.js frontend and API routes in `app/` directory (TypeScript/React 19)
- **Userscripts**: Browser automation scripts (`userscript.js`, `geometa-enhanced.user.js`)
- **Database**: SQLite with better-sqlite3 for fast local storage
- **Features**: Spaced repetition memorizer, full-text search, meta collection from GeoGuessr

## Critical Build Requirements

### NEVER CANCEL Long-Running Commands
- **NEVER CANCEL** any build or test commands - they may take up to 45+ minutes
- **Always set timeouts of 60+ minutes** for build commands
- **Always set timeouts of 30+ minutes** for test commands
- If a command appears to hang, **wait at least 60 minutes** before considering alternatives

### Exact Build Times (Measured)
- `npm install`: ~60 seconds (expect security warnings - this is normal)
- `npm run db:init`: ~2 seconds (database initialization)
- `npm run lint`: ~10 seconds (ESLint + TypeScript check)
- `npm run build`: ~35 seconds (Next.js production build)
- `npm run test`: ~5 seconds (Vitest with 13 tests)
- `npm run dev`: ~2 seconds startup (development server)

## Bootstrap Instructions

### Prerequisites
Run these exact commands to set up the environment:

```bash
# Ensure you're in the repository root
cd /path/to/geometa

# Navigate to app directory - ALL commands run from here
cd app

# Install dependencies - NEVER CANCEL, wait full 60+ seconds
npm install

# Initialize SQLite database - required for any functionality
npm run db:init
```

### Build and Test Workflow

```bash
# Run linting (always do this before commits) - 10 seconds
npm run lint

# Fix linting issues automatically if needed
npm run lint -- --fix

# Run tests - 5 seconds, all 13 tests should pass
npm run test

# Build for production - 35 seconds, NEVER CANCEL (set 60+ min timeout)
npm run build

# Start development server - 2 seconds startup
npm run dev
# App available at http://localhost:3000
```

## Manual Validation Requirements

**CRITICAL**: After making any changes, you MUST test actual functionality:

### Required Validation Scenarios
1. **Homepage Test**:
   - Navigate to http://localhost:3000
   - Verify gallery loads with search functionality
   - Check stats show "0 locations, 0 countries, 0 loaded"

2. **Memorizer Test**:
   - Navigate to http://localhost:3000/memorizer
   - Should show "Finding the next card for you..." (empty state)
   - Verify navigation back to gallery works

3. **Stats Page Test**:
   - Navigate to http://localhost:3000/stats
   - Should display review stats interface

4. **API Endpoint Test**:
   - Test: `curl http://localhost:3000/api/gallery`
   - Should return JSON with empty locations array and proper structure

5. **Database Test**:
   - Database file should exist at `app/db/geometa.db`
   - Command `npm run db:init` should complete without errors

### Build Validation
After running `npm run build`, verify:
- No compilation errors
- Build artifacts created in `.next` directory
- All pages prerendered successfully (static/dynamic routes shown)

## Project Structure Navigation

### Key Directories
- `app/src/app/`: Next.js app router pages and API routes
- `app/src/components/`: React components (MetaCard, MemorizerCard, UI components)
- `app/src/lib/`: Utilities (db.ts, memorizer.ts, utils.ts)
- `app/db/`: Database schema and migration scripts
- Root: Userscripts and documentation

### Important Files to Check After Changes
- Always check `app/src/app/layout.tsx` after layout changes
- Always check `app/src/lib/db.ts` after database-related changes
- Always check `app/package.json` after dependency changes
- Always run `npm run lint` before committing any TypeScript changes

## Common Development Commands

```bash
# From app/ directory (ALWAYS work here):

# Development workflow:
npm run dev              # Start dev server (2 seconds)
npm run lint             # Lint code (10 seconds)
npm run test             # Run tests (5 seconds) 

# Database management:
npm run db:init          # Initialize/reset database (2 seconds)
npm run db:migrate       # Run migrations (alias for db:init)
npm run db:backup        # Backup database with timestamp

# Production:
npm run build            # Build for production (35 seconds, NEVER CANCEL)
npm run start            # Start production server (requires build first)
```

## Troubleshooting Guide

### Build Failures
- **"Failed to fetch Inter from Google Fonts"**: Fixed in layout.tsx by using system fonts
- **"Module not found"**: Run `rm -rf node_modules package-lock.json && npm install`
- **"Database locked"**: Run `pkill -f "node" && npm run db:init`

### Development Server Issues
- **Port 3000 busy**: Kill existing processes or change port
- **"Database not found"**: Run `npm run db:init` from `app/` directory
- **Hot reload not working**: Restart dev server

### Test Failures
- Tests should always pass (13 tests total)
- If tests fail, check database initialization: `npm run db:init`
- Check file permissions on SQLite database file

## Environment Details

### Node.js Requirements
- **Node.js 18+** required (specified in package.json engines)
- Use `npm` package manager (lockfile committed)
- SQLite database runs locally (no external dependencies)

### Development Tools
- **ESLint**: Next.js config with TypeScript support
- **Vitest**: Fast unit testing with jsdom environment  
- **TypeScript**: Strict mode enabled
- **Tailwind CSS**: Styling framework with Radix UI components

## Key Features to Understand

### Memorizer Algorithm (Spaced Repetition)
- Uses simplified SM-2 algorithm
- "Again" (quality 0): marks lapsed, schedules ~1 week later
- "Hard" (quality 2): halves interval without lapse
- "Good" (quality 3): increases interval (1→6→15 days)
- "Easy" (quality 5): 1.3× bonus after second review (1→6→20 days)

### API Endpoints
- `GET /api/gallery` - Retrieve locations with search/filtering
- `POST /api/collect` - Collect new location data
- `DELETE /api/gallery?id=X` - Delete specific location
- `GET /api/memorizer` - Spaced repetition API
- `GET /api/stats` - Review statistics

### Database Schema
- Main table: `locations` (pano_id, country, meta_name, note, etc.)
- Full-text search: `locations_fts` virtual table
- Auto-updating triggers for search index

## CI/Build Validation

Before committing, ALWAYS run:
```bash
npm run lint    # Must pass with no errors
npm run test    # All 13 tests must pass
npm run build   # Must complete successfully (35 sec, NEVER CANCEL)
```

## Userscripts

Two userscripts are available:
- **`userscript.js`**: GeoMeta Collector - collects data from GeoGuessr
- **`geometa-enhanced.user.js`**: Enhanced Gallery - captures LearnableMeta screenshots

Both require Tampermonkey/Violentmonkey browser extension for installation.

## Common File Locations

```
Repository root commands:
ls -la                   # Shows: AGENTS.md, README.md, USERSCRIPT.md, app/, *.user.js

App directory structure:
app/package.json         # Dependencies and npm scripts
app/db/geometa.db       # SQLite database file
app/src/app/page.tsx    # Homepage component
app/src/components/     # React components
```

## Final Validation Checklist

Before completing any work:
- [ ] `npm run lint` passes
- [ ] `npm run test` passes (13/13 tests)
- [ ] `npm run build` completes successfully
- [ ] `npm run dev` starts without errors
- [ ] Homepage loads at http://localhost:3000
- [ ] Memorizer page accessible at /memorizer  
- [ ] Stats page accessible at /stats
- [ ] API endpoints return proper JSON responses
- [ ] Database operations work (via `npm run db:init`)

**Remember: NEVER CANCEL builds or long-running commands. Wait for completion.**