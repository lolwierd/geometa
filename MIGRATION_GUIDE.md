# Migration Guide: Frontend/Backend Separation

This guide provides specific implementation details and code examples for migrating GeoMeta Gallery from a Next.js monolith to separate frontend and backend applications.

## Quick Reference

**Current**: Single Next.js app with API routes and React pages
**Target**: React SPA (frontend) + Express API server (backend)
**Estimated Time**: 5-8 development days
**Risk Level**: Low-Medium

## Migration Implementation Details

### Phase 1: Backend Migration (Express Server)

#### 1.1 Project Structure Setup

Create new backend project:
```bash
mkdir geometa-backend
cd geometa-backend
npm init -y
npm install express cors helmet morgan better-sqlite3 countries-list dotenv
npm install -D @types/express @types/cors @types/better-sqlite3 typescript tsx nodemon
```

**Package.json Scripts:**
```json
{
  "scripts": {
    "dev": "nodemon --exec tsx src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "db:init": "tsx src/scripts/init-db.ts"
  }
}
```

#### 1.2 Express Server Setup

**src/server.ts:**
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import galleryRouter from './routes/gallery.js';
import collectRouter from './routes/collect.js';
import memorizerRouter from './routes/memorizer.js';
import statsRouter from './routes/stats.js';
import metaRouter from './routes/meta.js';
import imgRouter from './routes/img.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// API Routes
app.use('/api/gallery', galleryRouter);
app.use('/api/collect', collectRouter);
app.use('/api/memorizer', memorizerRouter);
app.use('/api/stats', statsRouter);
app.use('/api/meta', metaRouter);
app.use('/api/img', imgRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 GeoMeta API server running on port ${PORT}`);
});
```

#### 1.3 Example Route Migration

**src/routes/gallery.ts** (migrated from `app/src/app/api/gallery/route.ts`):
```typescript
import { Router, Request, Response } from 'express';
import { db } from '../lib/db.js';
import { logger } from '../lib/logger.js';
import { getCountriesByContinent, getContinent, Continent } from '../lib/continents.js';

const router = Router();

// GET /api/gallery
router.get('/', async (req: Request, res: Response) => {
  try {
    const { country, continent, state, q: search, limit = '50', offset = '0' } = req.query;
    
    // ... (same logic as Next.js API route, but using Express res.json)
    
    res.json({
      success: true,
      locations: processedLocations,
      total,
      countries,
      continents,
      states,
      stats,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: parseInt(offset as string) + parseInt(limit as string) < total,
        page: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
      filters: {
        country: country === "all" ? null : (country as string)?.split(','),
        continent: continent === "all" ? null : (continent as string)?.split(','),
        state: state === "all" ? null : (state as string)?.split(','),
        search: search || null,
      },
    });
  } catch (error) {
    logger.error("❌ Gallery API error:", error);
    res.status(500).json({
      error: "Failed to fetch gallery data",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// DELETE /api/gallery/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: "Location ID is required" });
    }

    // ... (same logic as Next.js API route)
    
    res.json({
      success: true,
      message: "Location deleted successfully",
      deleted: existingLocation,
    });
  } catch (error) {
    logger.error("❌ Delete location error:", error);
    res.status(500).json({
      error: "Failed to delete location",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
```

#### 1.4 Database Migration

**src/lib/db.ts** (minimal changes from original):
```typescript
import Database from 'better-sqlite3';
import path from 'path';

const isTest = process.env.NODE_ENV === 'test' || 
               process.env.VITEST === 'true';

const dbPath = isTest ? ':memory:' : 
               path.resolve(process.cwd(), process.env.DB_PATH || 'db/geometa.db');

export const db = new Database(dbPath);

// Cleanup handlers
process.on('exit', () => db.close());
process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));
```

### Phase 2: Frontend Migration (React SPA)

#### 2.1 Project Structure Setup

Create new frontend project:
```bash
mkdir geometa-frontend
cd geometa-frontend
npm create vite@latest . -- --template react-ts
npm install react-router-dom @radix-ui/react-dialog @radix-ui/react-popover
npm install tailwindcss framer-motion chart.js react-chartjs-2 lucide-react
npm install clsx tailwind-merge class-variance-authority cmdk
npm install dompurify @types/dompurify
```

**Vite Configuration (vite.config.ts):**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
```

#### 2.2 API Service Layer

**src/services/api.ts:**
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(
      error.message || `Request failed: ${response.statusText}`,
      response.status,
      error
    );
  }

  return response.json();
}

// API service methods
export const galleryApi = {
  getLocations: (params: URLSearchParams) =>
    apiRequest(`/api/gallery?${params.toString()}`),
  deleteLocation: (id: number) =>
    apiRequest(`/api/gallery/${id}`, { method: 'DELETE' }),
};

export const memorizerApi = {
  getNextCard: (params?: URLSearchParams) =>
    apiRequest(`/api/memorizer${params ? `?${params}` : ''}`),
  updateProgress: (id: number, quality: number) =>
    apiRequest(`/api/memorizer/${id}`, {
      method: 'POST',
      body: JSON.stringify({ quality }),
    }),
};

export const statsApi = {
  getStats: () => apiRequest('/api/stats'),
};
```

#### 2.3 React Router Setup

**src/main.tsx:**
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
```

**src/App.tsx:**
```typescript
import { Routes, Route } from 'react-router-dom';
import Gallery from './pages/Gallery';
import Memorizer from './pages/Memorizer';
import Stats from './pages/Stats';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <Routes>
        <Route path="/" element={<Gallery />} />
        <Route path="/memorizer" element={<Memorizer />} />
        <Route path="/stats" element={<Stats />} />
      </Routes>
    </div>
  );
}
```

#### 2.4 Component Migration Example

**src/pages/Gallery.tsx** (migrated from `app/src/app/page.tsx`):
```typescript
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { galleryApi } from '../services/api';
import MetaCard from '../components/MetaCard';
// ... other imports

export default function Gallery() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const fetchLocations = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      setError(null);

      // Same logic as before, but using galleryApi.getLocations
      const data = await galleryApi.getLocations(searchParams);
      
      if (!data.success) {
        throw new Error("API returned an error");
      }

      // ... rest of the logic remains the same
    } catch (error) {
      console.error("Failed to fetch locations:", error);
      setError(
        error instanceof Error ? error.message : "An unknown error occurred",
      );
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  // ... rest of component logic remains largely the same
  
  return (
    // Same JSX as original component
  );
}
```

### Phase 3: Configuration and Deployment

#### 3.1 Environment Configuration

**Backend (.env):**
```env
PORT=3001
NODE_ENV=production
DB_PATH=db/geometa.db
FRONTEND_URL=http://localhost:3000
LEARNABLEMETA_API_URL=https://learnablemeta.com/api/userscript/location
CACHE_DIR=.cache/images
LOG_LEVEL=info
```

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:3001
VITE_APP_TITLE=GeoMeta Gallery
```

#### 3.2 Docker Configuration

**Backend Dockerfile:**
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN npm run build

EXPOSE 3001
CMD ["npm", "start"]
```

**Frontend Dockerfile:**
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine AS runtime
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

**Docker Compose (Development):**
```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./geometa-backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - FRONTEND_URL=http://localhost:3000
    volumes:
      - ./geometa-backend:/app
      - /app/node_modules
    command: npm run dev

  frontend:
    build:
      context: ./geometa-frontend
      args:
        VITE_API_URL: http://localhost:3001
    ports:
      - "3000:3000"
    volumes:
      - ./geometa-frontend:/app
      - /app/node_modules
    command: npm run dev

  database:
    image: alpine:latest
    volumes:
      - ./db:/data/db
    command: tail -f /dev/null
```

#### 3.3 Nginx Configuration (Frontend Production)

**nginx.conf:**
```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    server {
        listen 3000;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # Handle client-side routing
        location / {
            try_files $uri $uri/ /index.html;
        }

        # API proxy (optional, if not using CORS)
        location /api/ {
            proxy_pass http://backend:3001/api/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Static assets with long cache
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

### Phase 4: Testing Migration

#### 4.1 Backend Testing

**Test API endpoints individually:**
```bash
# Test gallery endpoint
curl http://localhost:3001/api/gallery

# Test health check
curl http://localhost:3001/health

# Test with parameters
curl "http://localhost:3001/api/gallery?country=France&limit=10"
```

#### 4.2 Frontend Testing

**Test API integration:**
```typescript
// src/__tests__/api.test.ts
import { describe, it, expect, vi } from 'vitest';
import { galleryApi } from '../services/api';

// Mock fetch
global.fetch = vi.fn();

describe('Gallery API', () => {
  it('should fetch locations successfully', async () => {
    const mockResponse = {
      success: true,
      locations: [],
      total: 0,
    };

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const params = new URLSearchParams({ limit: '50', offset: '0' });
    const result = await galleryApi.getLocations(params);

    expect(result).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/gallery?limit=50&offset=0',
      expect.any(Object)
    );
  });
});
```

#### 4.3 Integration Testing

**Test userscript compatibility:**
```javascript
// Test collect endpoint from browser console
fetch('http://localhost:3001/api/collect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    panoId: 'test-pano',
    mapId: 'test-map',
    roundNumber: 1,
    source: 'userscript'
  })
}).then(r => r.json()).then(console.log);
```

## Migration Checklist

### Pre-Migration
- [ ] Backup existing database
- [ ] Document current API endpoints
- [ ] Test all existing functionality
- [ ] Set up new project repositories

### Backend Migration
- [ ] Express server setup
- [ ] Database connection migrated
- [ ] All API routes migrated
- [ ] CORS configured
- [ ] Image proxy functional
- [ ] All tests passing

### Frontend Migration
- [ ] React SPA setup with Vite
- [ ] React Router configured
- [ ] API service layer implemented
- [ ] All components migrated
- [ ] Styling working correctly
- [ ] All pages functional

### Integration & Testing
- [ ] Frontend connects to backend
- [ ] All API calls working
- [ ] Userscript compatibility verified
- [ ] Image proxy working
- [ ] Database operations functional
- [ ] Error handling working
- [ ] Performance acceptable

### Deployment
- [ ] Environment configurations set
- [ ] Docker containers built
- [ ] Development workflow documented
- [ ] Production deployment tested
- [ ] Monitoring and logging configured

## Troubleshooting Common Issues

### CORS Errors
```typescript
// Backend: Ensure proper CORS setup
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
```

### API Base URL Issues
```typescript
// Frontend: Check environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
console.log('API Base URL:', API_BASE_URL);
```

### Database Path Issues
```bash
# Backend: Ensure database directory exists
mkdir -p db
npm run db:init
```

### Build Issues
```bash
# Frontend: Clear node_modules if needed
rm -rf node_modules package-lock.json
npm install

# Backend: Check TypeScript configuration
npx tsc --noEmit
```

This migration guide provides the specific implementation details needed to successfully separate the GeoMeta Gallery frontend and backend while maintaining all existing functionality.