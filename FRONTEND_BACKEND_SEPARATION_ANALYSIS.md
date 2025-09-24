# Frontend/Backend Separation Analysis - GeoMeta Gallery

## Executive Summary

This document provides a comprehensive analysis of the current Next.js 15 monolithic architecture and outlines a plan for separating the GeoMeta Gallery into standalone frontend and backend applications.

**Current Status**: Single Next.js application with server-side API routes and client-side React components
**Proposed Architecture**: Separate frontend (React SPA) and backend (Node.js API server)
**Complexity Level**: Medium - Moderate refactoring required but clean separation is achievable

---

## Current Architecture Analysis

### 1. Application Structure

```
app/
├── src/
│   ├── app/                    # Next.js App Router pages and API routes
│   │   ├── api/               # Backend API routes (6 endpoints)
│   │   │   ├── collect/       # Data collection from external APIs
│   │   │   ├── gallery/       # CRUD operations for locations
│   │   │   ├── img/           # Image proxy/caching service
│   │   │   ├── memorizer/     # Spaced repetition algorithm
│   │   │   ├── meta/[id]/     # Individual location retrieval
│   │   │   └── stats/         # Learning statistics
│   │   ├── memorizer/         # Memorizer UI page
│   │   ├── stats/             # Statistics UI page
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Gallery homepage
│   ├── components/            # React components
│   │   ├── ui/               # Reusable UI components
│   │   ├── MetaCard.tsx      # Location display component
│   │   ├── MemorizerCard.tsx # Spaced repetition card
│   │   └── ProgressDashboard.tsx # Statistics visualization
│   └── lib/                   # Shared utilities
│       ├── db.ts             # SQLite database connection
│       ├── memorizer.ts      # Spaced repetition algorithm
│       ├── continents.ts     # Geography utilities
│       ├── countryCodes.ts   # Country mapping utilities
│       ├── logger.ts         # Logging utilities
│       └── utils.ts          # General utilities
├── db/                        # Database files and schema
├── package.json               # Dependencies and scripts
├── next.config.mjs           # Next.js configuration
└── Dockerfile                # Container configuration
```

### 2. Technology Stack

**Current Monolithic Stack:**
- **Framework**: Next.js 15 with App Router
- **Frontend**: React 19, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Next.js API routes, Node.js runtime
- **Database**: SQLite with better-sqlite3
- **Build System**: Next.js built-in bundler
- **Testing**: Vitest (68 tests passing)
- **Deployment**: Docker container with single service

**Dependencies Analysis:**
- **Frontend-only**: React, Tailwind CSS, Framer Motion, Chart.js, Lucide icons
- **Backend-only**: SQLite, better-sqlite3, crypto (Node.js built-in)
- **Shared**: TypeScript, utility functions, country/geography data

---

## API Routes Catalog

### 2.1 Backend API Endpoints

| Endpoint | Method | Purpose | Frontend Usage | Database Access |
|----------|--------|---------|----------------|-----------------|
| `/api/gallery` | GET | Retrieve locations with filtering/search | Homepage gallery display | ✅ Direct SQLite queries |
| `/api/gallery` | DELETE | Delete specific location | MetaCard delete action | ✅ Direct SQLite queries |
| `/api/collect` | POST | Collect new location data from external API | Userscript integration | ✅ Direct SQLite inserts |
| `/api/memorizer` | GET | Get next card for spaced repetition | Memorizer page | ✅ Complex SQLite queries |
| `/api/memorizer` | POST | Update review progress | Memorizer card interactions | ✅ Direct SQLite updates |
| `/api/stats` | GET | Learning statistics and progress | ProgressDashboard component | ✅ SQLite aggregation queries |
| `/api/meta/[id]` | GET | Get individual location details | Direct access via URL | ✅ Direct SQLite queries |
| `/api/img` | GET | Image proxy/caching service | Image optimization | ❌ File system access only |

### 2.2 Frontend API Integration Points

**Direct API Calls in Frontend Components:**
1. **Homepage** (`app/page.tsx`): `fetch('/api/gallery?${params})`
2. **Memorizer Page** (`app/memorizer/page.tsx`): `fetch('/api/memorizer')`
3. **MetaCard Component** (`components/MetaCard.tsx`): `fetch('/api/gallery?id=${id}', {method: 'DELETE'})`
4. **ProgressDashboard Component** (`components/ProgressDashboard.tsx`): `fetch('/api/stats')`

**API Communication Pattern:**
- All frontend-backend communication is RESTful JSON over HTTP
- No direct database access from frontend components
- Clean separation already exists between UI and data layers

---

## Database and Server-Side Analysis

### 3.1 Database Architecture

**Current Database Setup:**
- **Type**: SQLite with better-sqlite3 (synchronous, local file)
- **Tables**: `locations`, `memorizer_progress`, `memorizer_reviews`, `locations_fts` (full-text search)
- **Schema Management**: `db/schema-new.mjs` initialization script
- **Location**: `db/geometa.db` (local file)

**Database Access Patterns:**
- ✅ All database access is contained within API routes
- ✅ No direct database imports in frontend components
- ✅ Clean abstraction through REST API layer
- ⚠️ Database file is local to server filesystem

### 3.2 Server-Side Dependencies

**Backend-Only Libraries:**
```json
{
  "better-sqlite3": "^12.2.0",        // SQLite database driver
  "countries-list": "^3.1.1",         // Geography data (could be shared)
  "dompurify": "^3.2.6"               // HTML sanitization (frontend only)
}
```

**Shared Utilities:**
- `lib/continents.ts` - Geography mapping functions
- `lib/countryCodes.ts` - Country code utilities  
- `lib/memorizer.ts` - Spaced repetition algorithm
- `lib/utils.ts` - General utility functions
- `lib/logger.ts` - Logging functions

---

## Static Assets and Deployment Analysis

### 4.1 Static Assets

**Current Static Asset Usage:**
- ❌ **No public/ directory**: Application has no static assets
- ✅ **External Images**: Uses image proxy (`/api/img`) for external images from `learnablemeta.com` and `flagcdn.com`
- ✅ **Icons**: Uses Lucide React icons (bundled with frontend)
- ✅ **Fonts**: Uses system fonts (no external font dependencies)

**Next.js Configuration:**
```javascript
// next.config.mjs
const nextConfig = {
  images: {
    domains: ["learnablemeta.com"], // External image optimization
  },
};
```

### 4.2 Build and Deployment

**Current Build Process:**
1. `npm run build` - Next.js production build
2. **Output**: Static pages + API routes in `.next/` directory
3. **Deployment**: Docker container running `npm start`

**Build Artifacts:**
- **Static Pages**: Homepage (`/`), Memorizer (`/memorizer`), Stats (`/stats`)
- **Dynamic API Routes**: 6 server-side endpoints
- **Client Bundle**: ~169KB JavaScript for main pages

---

## Code Dependencies Analysis

### 5.1 Frontend Dependencies

**React Components Requiring Minimal Changes:**
- ✅ `components/MetaCard.tsx` - Only needs API endpoint URL updates
- ✅ `components/MemorizerCard.tsx` - Purely presentational, no API calls
- ✅ `components/ProgressDashboard.tsx` - Only needs API endpoint URL updates
- ✅ `components/ui/*` - Pure UI components, no external dependencies

**Frontend Pages Requiring Updates:**
- ✅ `app/page.tsx` - Update API base URL for gallery calls
- ✅ `app/memorizer/page.tsx` - Update API base URL for memorizer calls
- ✅ `app/stats/page.tsx` - No API calls (contains ProgressDashboard)

### 5.2 Backend Dependencies

**API Routes Analysis:**
- ✅ All API routes are self-contained
- ✅ No frontend-specific dependencies in API code
- ⚠️ Shared utilities in `lib/` directory need to be duplicated or published as shared package

**Database Layer:**
- ✅ Database access is cleanly abstracted in `lib/db.ts`
- ✅ No coupling to Next.js-specific features
- ✅ Can be migrated to standalone Node.js server

### 5.3 Shared Code Analysis

**Modules That Need Duplication or Packaging:**
1. **Type Definitions**: Location interfaces, API response types
2. **Geography Utilities**: `lib/continents.ts`, `lib/countryCodes.ts`
3. **Algorithm Logic**: `lib/memorizer.ts` (spaced repetition calculations)
4. **Validation Logic**: Request/response validation schemas

**Utility Functions:**
- `lib/utils.ts` - General utilities (can be duplicated)
- `lib/logger.ts` - Logging (backend-only after separation)

---

## Migration Plan for Frontend/Backend Separation

### 6.1 Proposed Architecture

**New Structure:**
```
geometa-frontend/          # React SPA
├── src/
│   ├── components/        # Existing React components
│   ├── pages/            # Convert from Next.js pages to React Router
│   ├── hooks/            # Custom React hooks for API calls
│   ├── services/         # API service layer
│   ├── types/            # Shared TypeScript interfaces
│   └── utils/            # Frontend-only utilities
├── public/               # Static assets
├── package.json          # Frontend dependencies
└── vite.config.ts        # Vite build configuration

geometa-backend/           # Node.js + Express API
├── src/
│   ├── routes/           # Express route handlers (migrated from Next.js API)
│   ├── models/           # Database models and queries
│   ├── services/         # Business logic layer
│   ├── middleware/       # Express middleware
│   ├── utils/            # Backend utilities
│   └── types/            # Shared TypeScript interfaces
├── db/                   # Database files and migrations
├── package.json          # Backend dependencies
└── server.ts             # Express server entry point
```

### 6.2 Step-by-Step Migration Plan

**Phase 1: Backend Extraction (Estimated: 2-3 days)**
1. **Create Express Server**
   - Set up new Node.js project with Express
   - Migrate API routes from `app/src/app/api/*` to Express routes
   - Port database connection and models
   - Set up CORS for cross-origin requests

2. **Migrate API Endpoints**
   - `/api/gallery` → Express route with same functionality
   - `/api/collect` → Express route maintaining userscript compatibility  
   - `/api/memorizer` → Express route with spaced repetition logic
   - `/api/stats` → Express route with statistics queries
   - `/api/meta/[id]` → Express route with parameter handling
   - `/api/img` → Express route with image proxy functionality

3. **Database Migration**
   - Copy SQLite database file to backend project
   - Update database initialization scripts
   - Test all database operations

4. **Testing Backend**
   - Port existing Vitest tests to new backend structure
   - Ensure all API endpoints work independently
   - Test with Postman/curl for verification

**Phase 2: Frontend Migration (Estimated: 2-3 days)**
1. **Create React SPA**
   - Set up Vite + React + TypeScript project
   - Migrate components from Next.js to standard React
   - Set up React Router for navigation
   - Configure Tailwind CSS and other styling

2. **API Integration Layer**
   - Create API service layer with configurable base URL
   - Update all fetch calls to use new backend endpoints
   - Implement error handling for cross-origin requests
   - Add loading states and error boundaries

3. **Component Migration**
   - Convert Next.js pages to React Router pages
   - Update API calls in components
   - Ensure all functionality works with new backend

4. **Build and Deployment**
   - Configure Vite for production builds
   - Set up environment configuration for API URLs
   - Test frontend against new backend API

**Phase 3: Integration and Testing (Estimated: 1-2 days)**
1. **End-to-End Testing**
   - Test complete application flow
   - Verify userscript compatibility
   - Test image proxy functionality
   - Verify spaced repetition algorithm

2. **Environment Configuration**
   - Set up development and production configurations
   - Configure CORS policies
   - Set up Docker containers for both services

3. **Documentation Update**
   - Update README with new setup instructions
   - Update userscript configuration
   - Document API endpoints separately

### 6.3 Required Changes by Component

**Frontend Components (Minimal Changes Required):**
```typescript
// Before (Next.js)
const response = await fetch('/api/gallery');

// After (React SPA)
const response = await fetch(`${API_BASE_URL}/api/gallery`);
```

**API Routes (Structural Changes):**
```typescript
// Before (Next.js API Route)
export async function GET(request: NextRequest) {
  // ... implementation
  return NextResponse.json(data);
}

// After (Express Route)
app.get('/api/gallery', (req: Request, res: Response) => {
  // ... implementation
  res.json(data);
});
```

**Database Layer (Minimal Changes):**
- Update import paths for shared utilities
- Ensure database file location is configurable
- No changes to actual database queries

---

## Potential Blockers and Challenges

### 7.1 Technical Challenges

**Medium Priority Issues:**
1. **Image Proxy Service** (`/api/img`)
   - Currently uses Next.js-specific caching
   - Needs file system access for cache directory
   - **Solution**: Migrate to Express with `multer` or similar middleware

2. **SQLite Database**
   - Currently uses local file system
   - **Solution**: Continue with SQLite for local deployment, consider migration path to PostgreSQL for cloud deployment

3. **Shared Code Duplication**
   - Geography utilities, type definitions need to be shared
   - **Solution**: Create shared npm package or duplicate small utilities

4. **CORS Configuration**
   - Cross-origin requests will be required
   - **Solution**: Configure Express CORS middleware for frontend domain

**Low Priority Issues:**
5. **Build Process Changes**
   - Developers need to run two development servers
   - **Solution**: Create docker-compose for local development

6. **Environment Configuration**
   - API URLs need to be configurable
   - **Solution**: Use environment variables with defaults

### 7.2 Deployment Considerations

**Current Deployment**: Single Docker container
**Future Deployment**: Two separate containers or services

**Required Infrastructure Changes:**
- Separate deployment pipelines
- Load balancer or reverse proxy configuration
- Environment variable management for API URLs
- Database backup and migration procedures

### 7.3 Userscript Compatibility

**Critical Requirement**: Maintain userscript functionality
- Userscript calls `/api/collect` endpoint
- Must preserve same endpoint URL and functionality
- CORS must be configured to allow browser extension origins

---

## Migration Effort Estimation

### 8.1 Development Time Estimates

| Phase | Task | Estimated Time |
|-------|------|----------------|
| **Phase 1** | Backend Extraction | 2-3 days |
| | Express server setup | 4 hours |
| | API route migration | 8 hours |
| | Database migration | 4 hours |
| | Testing | 4 hours |
| **Phase 2** | Frontend Migration | 2-3 days |
| | React SPA setup | 4 hours |
| | Component migration | 8 hours |
| | API integration | 4 hours |
| | Testing | 4 hours |
| **Phase 3** | Integration | 1-2 days |
| | E2E testing | 4 hours |
| | Documentation | 2 hours |
| | Deployment setup | 2 hours |
| **Total** | | **5-8 days** |

### 8.2 Risk Assessment

**Low Risk:**
- ✅ Clean API boundaries already exist
- ✅ No complex state sharing between frontend/backend
- ✅ Comprehensive test coverage exists
- ✅ Database layer is well abstracted

**Medium Risk:**
- ⚠️ Image proxy service migration
- ⚠️ Shared utility code duplication
- ⚠️ CORS configuration for userscript
- ⚠️ Development workflow changes

**High Risk:**
- ❌ No significant high-risk items identified

---

## Recommended Next Steps

### 9.1 Immediate Actions

1. **Create Backend Prototype** (1 day)
   - Set up Express server
   - Migrate one API endpoint (e.g., `/api/gallery`)
   - Test with existing frontend

2. **Validate Migration Approach** (0.5 days)
   - Test CORS configuration
   - Verify database connectivity
   - Test userscript compatibility

3. **Create Deployment Strategy** (0.5 days)
   - Plan infrastructure changes
   - Design docker-compose for development
   - Plan production deployment approach

### 9.2 Decision Points

**Before Starting Full Migration:**
1. **Database Strategy**: Stick with SQLite or migrate to PostgreSQL?
2. **Shared Code Strategy**: Duplicate utilities or create shared package?
3. **Deployment Strategy**: Keep both services in same infrastructure or separate?

### 9.3 Success Criteria

**Technical Success:**
- ✅ All existing functionality preserved
- ✅ All tests passing
- ✅ Userscript compatibility maintained
- ✅ Performance equivalent or better

**Operational Success:**
- ✅ Independent deployment capabilities
- ✅ Improved development workflow
- ✅ Clear separation of concerns
- ✅ Maintainable codebase

---

## Conclusion

The GeoMeta Gallery application is **well-suited for frontend/backend separation** with a **medium complexity** migration effort. The existing architecture already has clean API boundaries and minimal coupling between frontend and backend code.

**Key Advantages:**
- Clean existing API layer
- No direct database access from frontend
- Comprehensive test coverage
- Minimal shared dependencies

**Migration Feasibility**: **High** - Estimated 5-8 days of development effort with low risk of complications.

The separation will provide improved scalability, independent deployment capabilities, and cleaner architecture for future development.