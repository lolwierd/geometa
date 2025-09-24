# GeoMeta Gallery - Static Frontend Deployment Guide

This document explains how to deploy the GeoMeta Gallery frontend as static files on Cloudflare Pages or other CDN platforms.

## Build Process

### 1. Generate Static Build

```bash
cd app
npm install
npm run build:static
```

This will create a `out/` directory with static files suitable for CDN hosting.

### 2. Build Output

The static build generates:
- `index.html` - Homepage
- `memorizer/index.html` - Memorizer page  
- `stats/index.html` - Stats page
- `_next/static/` - Optimized JavaScript and CSS bundles
- `404.html` - Custom 404 page

## Deployment Configuration

### Cloudflare Pages

1. **Upload static files**:
   - Upload contents of `out/` directory to Cloudflare Pages
   - Set build command: `npm run build:static`
   - Set publish directory: `out`

2. **Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-api.example.com/api
   ```

3. **Routing Configuration**:
   Create `_redirects` file in `out/` directory:
   ```
   /*    /index.html   200
   ```

### Other CDN Platforms

For other platforms (Netlify, Vercel, AWS CloudFront), upload the `out/` directory contents as static files.

## Backend API Requirements

The static frontend requires a separate backend service providing these endpoints:

### Required API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/gallery` | GET | Retrieve locations with filtering |
| `/api/gallery` | DELETE | Delete locations |
| `/api/memorizer` | GET | Get next memorizer card |
| `/api/memorizer` | POST | Update memorizer progress |
| `/api/stats` | GET | Get learning statistics |
| `/api/meta/{id}` | GET | Get location details |
| `/api/collect` | POST | Collect new locations (userscript) |
| `/api/img` | GET | Image proxy service |

### CORS Configuration

The backend must allow cross-origin requests from your frontend domain:

```javascript
app.use(cors({
  origin: ['https://your-frontend-domain.pages.dev'],
  credentials: true
}));
```

## Configuration

### API Base URL

The frontend uses the `NEXT_PUBLIC_API_URL` environment variable to determine the backend location.

**During build**: Set via environment variable
```bash
NEXT_PUBLIC_API_URL=https://api.example.com/api npm run build:static
```

**At runtime**: Configure via global JavaScript variable
```html
<script>
  window.__GEOMETA_API_URL__ = 'https://api.example.com/api';
</script>
```

### Default Behavior

If no API URL is configured, the frontend will attempt to use relative paths (`/api/*`), which works if the backend is served from the same domain.

## File Structure

```
out/
├── _next/
│   └── static/           # Optimized JS/CSS bundles
├── index.html            # Homepage
├── memorizer/
│   └── index.html        # Memorizer app
├── stats/
│   └── index.html        # Statistics dashboard  
└── 404.html              # Error page
```

## Testing Static Build

To test the static build locally:

```bash
# Serve static files (requires Python or Node.js)
cd out
python -m http.server 8080
# or
npx serve -s . -p 8080
```

Visit `http://localhost:8080` to test the static frontend.

## Notes

- **No Server Dependencies**: The static build contains no Node.js or SQLite dependencies
- **Image Optimization Disabled**: Uses `unoptimized: true` for Next.js images
- **API-Independent**: Frontend works with any backend that implements the required API endpoints
- **SEO-Friendly**: All pages are pre-rendered as static HTML
- **CDN-Optimized**: Assets have long-term cache headers and are minified