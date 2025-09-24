# GeoMeta Backend - Standalone API Server

A standalone Express.js API server for GeoMeta Gallery, providing all backend functionality independently from the Next.js frontend.

## Features

- **Complete API**: All 6 API endpoints from the original Next.js app
- **SQLite Database**: Portable database with full-text search
- **Spaced Repetition**: Complete memorizer functionality  
- **Image Proxy**: Handle image caching and serving
- **CORS Support**: Ready for cross-origin requests from frontend
- **Health Checks**: Built-in monitoring endpoint

## API Endpoints

- `GET /health` - Server health check
- `GET /api/gallery` - List locations with filtering and pagination
- `DELETE /api/gallery/:id` - Delete specific location
- `POST /api/collect` - Collect new location data from userscript
- `GET /api/memorizer` - Get next card for spaced repetition
- `POST /api/memorizer/:id` - Update memorizer progress
- `GET /api/stats` - Review statistics
- `GET /api/meta/:id` - Get location details
- `GET /api/img` - Image proxy endpoint

## Quick Start

### 1. Installation

```bash
cd geometa-backend
npm install
```

### 2. Environment Setup

Copy `.env` and configure:

```bash
PORT=3001
NODE_ENV=production
DB_PATH=db/geometa.db
FRONTEND_URL=http://localhost:3000
LEARNABLEMETA_API_URL=https://learnablemeta.com/api/userscript/location
CACHE_DIR=.cache/images
LOG_LEVEL=info
```

### 3. Database Initialization

```bash
npm run db:init
```

### 4. Development

```bash
npm run dev    # Development with hot reload
```

### 5. Production

```bash
npm run build  # TypeScript compilation
npm start      # Start production server
```

## Production Deployment

### Systemd Service

Create `/etc/systemd/system/geometa-backend.service`:

```ini
[Unit]
Description=GeoMeta Backend API
After=network.target

[Service]
Type=simple
User=geometa
WorkingDirectory=/opt/geometa-backend
Environment=NODE_ENV=production
Environment=PORT=3001
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable geometa-backend
sudo systemctl start geometa-backend
sudo systemctl status geometa-backend
```

### Docker Deployment

```bash
# Build image
docker build -t geometa-backend .

# Run container
docker run -d --name geometa-api -p 3001:3001 \
  -v $(pwd)/db:/app/db \
  -e NODE_ENV=production \
  geometa-backend
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.geometa.example.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Database Management

### Backup
```bash
npm run db:backup
```

### Manual Operations
```bash
# Connect to SQLite CLI
sqlite3 db/geometa.db

# View tables
.tables

# Query locations
SELECT country, COUNT(*) FROM locations GROUP BY country;
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port |
| `NODE_ENV` | development | Environment mode |
| `DB_PATH` | db/geometa.db | SQLite database path |
| `FRONTEND_URL` | http://localhost:3000 | CORS origin |
| `LEARNABLEMETA_API_URL` | https://learnablemeta.com/api/userscript/location | External API |
| `CACHE_DIR` | .cache/images | Image cache directory |
| `LOG_LEVEL` | info | Logging level |

## Monitoring

### Health Check
```bash
curl http://localhost:3001/health
```

### Log Files
- Development: Console output
- Production: Use PM2 or systemd logs

### Performance
- SQLite with indexes for fast queries
- Full-text search for location filtering
- Connection pooling handled by better-sqlite3

## API Compatibility

This standalone backend is **100% compatible** with:

- ✅ Original Next.js frontend
- ✅ Existing userscripts (userscript.js, geometa-enhanced.user.js)
- ✅ All existing API clients
- ✅ Database schema and data

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
lsof -ti:3001 | xargs kill -9
```

**Database locked:**
```bash
pkill -f geometa-backend
npm run db:init
```

**CORS errors:**
- Verify FRONTEND_URL matches your frontend origin
- Check browser network tab for exact error

### Debug Mode

```bash
LOG_LEVEL=debug npm run dev
```

## Migration from Next.js

The backend runs independently - you can:

1. **Gradual migration**: Run both Next.js and standalone backend
2. **Complete separation**: Point frontend to standalone backend URL
3. **Different servers**: Deploy backend on separate infrastructure

Update frontend API calls to point to backend URL:
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
```