import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../lib/db';
import { GET } from '../app/api/meta/[id]/route';
import { NextRequest } from 'next/server';

describe('meta/[id] API', () => {
  beforeEach(() => {
    // Clean up and recreate tables for each test
    db.exec(`
      DROP TABLE IF EXISTS locations;
      CREATE TABLE locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pano_id TEXT,
        map_id TEXT,
        country TEXT,
        country_code TEXT,
        meta_name TEXT,
        note TEXT,
        footer TEXT,
        images TEXT DEFAULT '[]',
        raw_data TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  });

  it('should return location data for valid ID', async () => {
    // Insert test location
    const testImages = JSON.stringify(['https://example.com/image1.jpg', 'https://example.com/image2.jpg']);
    const testRawData = JSON.stringify({ 
      latitude: 40.7128,
      longitude: -74.0060,
      metaName: 'Test Location'
    });

    db.prepare(`
      INSERT INTO locations (id, pano_id, map_id, country, country_code, meta_name, note, footer, images, raw_data) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      1, 
      'test-pano-123', 
      'test-map-456', 
      'United States', 
      'us', 
      'New York City',
      'Test note',
      'Test footer',
      testImages,
      testRawData
    );

    const request = new NextRequest('http://localhost/api/meta/1');
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.location).toBeDefined();
    expect(data.location).toEqual({
      id: 1,
      pano_id: 'test-pano-123',
      map_id: 'test-map-456',
      country: 'United States',
      country_code: 'us',
      meta_name: 'New York City',
      note: 'Test note',
      footer: 'Test footer',
      images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
      raw_data: { 
        latitude: 40.7128,
        longitude: -74.0060,
        metaName: 'Test Location'
      },
      created_at: expect.any(String),
      updated_at: expect.any(String)
    });
    expect(response.status).toBe(200);
  });

  it('should handle empty/null JSON fields gracefully', async () => {
    // Insert location with null/empty JSON fields
    db.prepare(`
      INSERT INTO locations (id, pano_id, map_id, country, images, raw_data) 
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(2, 'pano-null', 'map-null', 'TestCountry', null, null);

    const request = new NextRequest('http://localhost/api/meta/2');
    const response = await GET(request, { params: Promise.resolve({ id: '2' }) });
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.location.images).toEqual([]);
    expect(data.location.raw_data).toEqual({});
  });

  it('should handle empty string JSON fields', async () => {
    // Insert location with empty string JSON fields
    db.prepare(`
      INSERT INTO locations (id, pano_id, map_id, country, images, raw_data) 
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(3, 'pano-empty', 'map-empty', 'TestCountry', '', '');

    const request = new NextRequest('http://localhost/api/meta/3');
    const response = await GET(request, { params: Promise.resolve({ id: '3' }) });
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.location.images).toEqual([]);
    expect(data.location.raw_data).toEqual({});
  });

  it('should handle malformed JSON gracefully', async () => {
    // Insert location with malformed JSON
    db.prepare(`
      INSERT INTO locations (id, pano_id, map_id, country, images, raw_data) 
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(4, 'pano-malformed', 'map-malformed', 'TestCountry', '{invalid json}', '[malformed');

    const request = new NextRequest('http://localhost/api/meta/4');
    const response = await GET(request, { params: Promise.resolve({ id: '4' }) });
    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.message).toBe('Internal Server Error');
    expect(response.status).toBe(500);
  });

  it('should return 404 for non-existent location ID', async () => {
    const request = new NextRequest('http://localhost/api/meta/999');
    const response = await GET(request, { params: Promise.resolve({ id: '999' }) });
    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.message).toBe('Location not found');
    expect(response.status).toBe(404);
  });

  it('should return 400 for invalid ID format', async () => {
    const request = new NextRequest('http://localhost/api/meta/invalid');
    const response = await GET(request, { params: Promise.resolve({ id: 'invalid' }) });
    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.message).toBe('Invalid ID');
    expect(response.status).toBe(400);
  });

  it('should return 404 for negative ID', async () => {
    // parseInt('-1', 10) returns -1, which is a valid integer
    // The ID will be processed but the location won't be found
    const request = new NextRequest('http://localhost/api/meta/-1');
    const response = await GET(request, { params: Promise.resolve({ id: '-1' }) });
    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.message).toBe('Location not found');
    expect(response.status).toBe(404);
  });

  it('should return 404 for ID with decimal', async () => {
    // parseInt('1.5', 10) returns 1, which is a valid integer
    // If location with id=1 doesn't exist, it will return 404
    const request = new NextRequest('http://localhost/api/meta/1.5');
    const response = await GET(request, { params: Promise.resolve({ id: '1.5' }) });
    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.message).toBe('Location not found');
    expect(response.status).toBe(404);
  });

  it('should handle complex JSON data correctly', async () => {
    const complexImages = JSON.stringify([
      'https://example.com/img1.jpg',
      'https://example.com/img2.png',
      'https://example.com/img3.webp'
    ]);
    
    const complexRawData = JSON.stringify({
      coordinates: { lat: 51.5074, lng: -0.1278 },
      metadata: {
        source: 'streetview',
        quality: 'high',
        tags: ['urban', 'landmark', 'historical']
      },
      nested: {
        level1: {
          level2: {
            value: 'deep nesting test'
          }
        }
      }
    });

    db.prepare(`
      INSERT INTO locations (id, pano_id, map_id, country, meta_name, images, raw_data) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(5, 'complex-pano', 'complex-map', 'United Kingdom', 'London', complexImages, complexRawData);

    const request = new NextRequest('http://localhost/api/meta/5');
    const response = await GET(request, { params: Promise.resolve({ id: '5' }) });
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.location.images).toHaveLength(3);
    expect(data.location.images[0]).toBe('https://example.com/img1.jpg');
    
    expect(data.location.raw_data.coordinates).toEqual({ lat: 51.5074, lng: -0.1278 });
    expect(data.location.raw_data.metadata.tags).toEqual(['urban', 'landmark', 'historical']);
    expect(data.location.raw_data.nested.level1.level2.value).toBe('deep nesting test');
  });

  it('should handle zero ID correctly', async () => {
    const request = new NextRequest('http://localhost/api/meta/0');
    const response = await GET(request, { params: Promise.resolve({ id: '0' }) });
    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.message).toBe('Location not found');
    expect(response.status).toBe(404);
  });
});