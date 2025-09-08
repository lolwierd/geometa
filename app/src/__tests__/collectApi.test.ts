import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../lib/db';
import { POST, OPTIONS } from '../app/api/collect/route';
import { NextRequest } from 'next/server';

// Mock the external API fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('collect API', () => {
  beforeEach(() => {
    // Clean up and recreate tables for each test
    db.exec(`
      DROP TABLE IF EXISTS locations;
      CREATE TABLE locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pano_id TEXT NOT NULL,
        map_id TEXT NOT NULL,
        country TEXT,
        country_code TEXT,
        meta_name TEXT,
        note TEXT,
        footer TEXT,
        images TEXT DEFAULT '[]',
        raw_data TEXT DEFAULT '{}' UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('should successfully collect and store location data', async () => {
      const mockMetaData = {
        country: 'France',
        metaName: 'Eiffel Tower',
        note: 'Famous landmark',
        footer: 'Paris, France',
        images: ['https://example.com/image1.jpg'],
        latitude: 48.8584,
        longitude: 2.2945
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockMetaData),
      });

      const request = new NextRequest('http://localhost/api/collect', {
        method: 'POST',
        body: JSON.stringify({
          panoId: 'test-pano-123',
          mapId: 'test-map-456',
          roundNumber: 1,
          source: 'map'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Location collected successfully');
      expect(data.location).toEqual({
        id: 1,
        pano_id: 'test-pano-123',
        map_id: 'test-map-456',
        country: 'France',
        country_code: 'fr',
        meta_name: 'Eiffel Tower',
        note: 'Famous landmark',
        footer: 'Paris, France',
        images: ['https://example.com/image1.jpg'],
        raw_data: mockMetaData,
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });

      // Verify the external API was called correctly
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://learnablemeta.com/api/userscript/location'),
        expect.objectContaining({
          method: 'GET',
          headers: {
            'User-Agent': 'GeoMetaGallery/2.0',
            Accept: 'application/json'
          },
          timeout: 10000
        })
      );
    });

    it('should handle duplicate locations with ON CONFLICT', async () => {
      const mockMetaData = {
        country: 'Germany',
        metaName: 'Brandenburg Gate'
      };

      // Insert a location first
      const rawData = JSON.stringify(mockMetaData);
      db.prepare(`
        INSERT INTO locations (pano_id, map_id, country, country_code, raw_data) 
        VALUES (?, ?, ?, ?, ?)
      `).run('existing-pano', 'existing-map', 'Germany', 'de', rawData);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockMetaData),
      });

      const request = new NextRequest('http://localhost/api/collect', {
        method: 'POST',
        body: JSON.stringify({
          panoId: 'new-pano',
          mapId: 'new-map'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Location already exists');
      expect(data.location.id).toBe(1); // Should return the existing location
    });

    it('should return 400 for missing required fields', async () => {
      const request = new NextRequest('http://localhost/api/collect', {
        method: 'POST',
        body: JSON.stringify({
          panoId: 'test-pano' // Missing mapId
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('panoId and mapId are required');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle 404 from LearnableMeta API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const request = new NextRequest('http://localhost/api/collect', {
        method: 'POST',
        body: JSON.stringify({
          panoId: 'unknown-pano',
          mapId: 'unknown-map'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Meta for this location not found');
      expect(data.notFound).toBe(true);
    });

    it('should handle external API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const request = new NextRequest('http://localhost/api/collect', {
        method: 'POST',
        body: JSON.stringify({
          panoId: 'error-pano',
          mapId: 'error-map'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500); // Server error, not network error
      expect(data.error).toContain('LearnableMeta API error: 500');
      expect(data.type).toBe('server'); // Not network error
    });

    it('should handle network timeouts', async () => {
      mockFetch.mockRejectedValueOnce(new Error('fetch failed'));

      const request = new NextRequest('http://localhost/api/collect', {
        method: 'POST',
        body: JSON.stringify({
          panoId: 'timeout-pano',
          mapId: 'timeout-map'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(502); // Network error status
      expect(data.error).toBe('fetch failed');
      expect(data.type).toBe('network');
    });

    it('should handle missing country data gracefully', async () => {
      const mockMetaDataWithoutCountry = {
        metaName: 'Unknown Location',
        note: 'No country info'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockMetaDataWithoutCountry),
      });

      const request = new NextRequest('http://localhost/api/collect', {
        method: 'POST',
        body: JSON.stringify({
          panoId: 'no-country-pano',
          mapId: 'no-country-map'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.location.country).toBe('Unknown');
      expect(data.location.country_code).toBe(null); // getCountryCode returns null for "Unknown"
    });

    it('should handle malformed JSON request body', async () => {
      const request = new NextRequest('http://localhost/api/collect', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Unexpected token');
      expect(data.type).toBe('server');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should pass through optional parameters correctly', async () => {
      const mockMetaData = {
        country: 'Japan',
        metaName: 'Tokyo Tower'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockMetaData),
      });

      const request = new NextRequest('http://localhost/api/collect', {
        method: 'POST',
        body: JSON.stringify({
          panoId: 'tokyo-pano',
          mapId: 'tokyo-map',
          roundNumber: 3,
          source: 'userscript'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      
      // Verify the API was called with the right parameters
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('panoId=tokyo-pano');
      expect(callUrl).toContain('mapId=tokyo-map');
      expect(callUrl).toContain('source=userscript');
      // Note: roundNumber is not passed to fetchLearnableMetaData function
    });
  });

  describe('OPTIONS', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await OPTIONS();
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
      expect(response.headers.get('Access-Control-Max-Age')).toBe('86400');
    });
  });
});