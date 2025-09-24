import { Router, Request, Response } from 'express';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import path from 'path';

const router = Router();

// GET /api/img - Image proxy endpoint
router.get('/', async (req: Request, res: Response) => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Validate URL
    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Only allow HTTP/HTTPS URLs
    if (!['http:', 'https:'].includes(targetUrl.protocol)) {
      return res.status(400).json({ error: 'Only HTTP/HTTPS URLs are allowed' });
    }

    // Fetch the image
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GeoMetaGallery/2.0',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Failed to fetch image: ${response.statusText}` 
      });
    }

    // Set appropriate headers
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const contentLength = response.headers.get('content-length');

    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    if (contentLength) {
      res.set('Content-Length', contentLength);
    }

    // Stream the response
    if (response.body) {
      const reader = response.body.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      
      res.end();
    } else {
      res.status(500).json({ error: 'No response body' });
    }

  } catch (error: any) {
    console.error('Image proxy error:', error);
    
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return res.status(504).json({ error: 'Request timeout' });
    }
    
    res.status(500).json({ 
      error: 'Failed to proxy image',
      details: error.message 
    });
  }
});

export default router;