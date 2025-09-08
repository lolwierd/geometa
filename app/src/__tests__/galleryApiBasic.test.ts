import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../lib/db';
import { GET } from '../app/api/gallery/route';
import { NextRequest } from 'next/server';

describe('gallery API (basic functionality)', () => {
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
        raw_data TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      DROP TABLE IF EXISTS memorizer_progress;
      CREATE TABLE memorizer_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        location_id INTEGER NOT NULL UNIQUE,
        repetitions INTEGER NOT NULL DEFAULT 0,
        ease_factor REAL NOT NULL DEFAULT 2.5,
        "interval" INTEGER NOT NULL DEFAULT 0,
        due_date INTEGER NOT NULL DEFAULT (strftime('%s','now')),
        state TEXT NOT NULL DEFAULT 'new',
        lapses INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      DROP TABLE IF EXISTS locations_fts;
      CREATE VIRTUAL TABLE locations_fts USING fts5(
        content=locations,
        country,
        meta_name,
        note,
        footer
      );
    `);

    // Insert test data
    const testLocations = [
      {
        id: 1,
        pano_id: 'pano1',
        map_id: 'map1',
        country: 'France',
        country_code: 'fr',
        meta_name: 'Eiffel Tower',
        note: 'Famous landmark',
        footer: 'Paris',
        images: JSON.stringify(['image1.jpg']),
        raw_data: JSON.stringify({ lat: 48.8584, lng: 2.2945 })
      },
      {
        id: 2,
        pano_id: 'pano2',
        map_id: 'map2',
        country: 'Germany',
        country_code: 'de',
        meta_name: 'Brandenburg Gate',
        note: 'Historic gate',
        footer: 'Berlin',
        images: JSON.stringify(['image2.jpg', 'image3.jpg']),
        raw_data: JSON.stringify({ lat: 52.5163, lng: 13.3777 })
      },
      {
        id: 3,
        pano_id: 'pano3',
        map_id: 'map3',
        country: 'Japan',
        country_code: 'jp',
        meta_name: 'Tokyo Tower',
        note: 'Red tower',
        footer: 'Tokyo',
        images: JSON.stringify([]),
        raw_data: JSON.stringify({ lat: 35.6586, lng: 139.7454 })
      }
    ];

    testLocations.forEach(location => {
      db.prepare(`
        INSERT INTO locations (id, pano_id, map_id, country, country_code, meta_name, note, footer, images, raw_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        location.id, location.pano_id, location.map_id, location.country,
        location.country_code, location.meta_name, location.note,
        location.footer, location.images, location.raw_data
      );

      // Insert into FTS table
      db.prepare(`
        INSERT INTO locations_fts(rowid, country, meta_name, note, footer)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        location.id, location.country, location.meta_name, location.note, location.footer
      );
    });

    // Add some memorizer progress
    db.prepare(`
      INSERT INTO memorizer_progress (location_id, state)
      VALUES (?, ?)
    `).run(1, 'review');
    
    db.prepare(`
      INSERT INTO memorizer_progress (location_id, state)
      VALUES (?, ?)
    `).run(2, 'new');
  });

  describe('GET', () => {
    it('should return all locations with default pagination', async () => {
      const request = new NextRequest('http://localhost/api/gallery');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.locations).toHaveLength(3);
      expect(data.total).toBe(3);
      expect(data.pagination).toEqual({
        limit: 50,
        offset: 0,
        hasMore: false,
        page: 1,
        totalPages: 1
      });

      // Verify location structure
      const location = data.locations[0];
      expect(location).toHaveProperty('id');
      expect(location).toHaveProperty('images');
      expect(location).toHaveProperty('raw_data');
      expect(Array.isArray(location.images)).toBe(true);
      expect(typeof location.raw_data).toBe('object');
    });

    it('should filter by country', async () => {
      const request = new NextRequest('http://localhost/api/gallery?country=France');
      const response = await GET(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.locations).toHaveLength(1);
      expect(data.locations[0].country).toBe('France');
      expect(data.total).toBe(1);
    });

    it('should handle pagination correctly', async () => {
      const request = new NextRequest('http://localhost/api/gallery?limit=2&offset=1');
      const response = await GET(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.locations).toHaveLength(2);
      expect(data.pagination).toEqual({
        limit: 2,
        offset: 1,
        hasMore: false,
        page: 1,
        totalPages: 2
      });
    });

    it('should return metadata including countries, continents, and states', async () => {
      const request = new NextRequest('http://localhost/api/gallery');
      const response = await GET(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.countries).toContain('France');
      expect(data.countries).toContain('Germany');
      expect(data.countries).toContain('Japan');
      
      expect(data.continents).toContain('Europe');
      expect(data.continents).toContain('Asia');
      
      expect(data.states).toContain('new');
      expect(data.states).toContain('review');
      
      expect(data.stats).toHaveProperty('total_locations');
      expect(data.stats).toHaveProperty('total_countries');
      expect(data.stats.total_locations).toBe(3);
      expect(data.stats.total_countries).toBe(3);
    });

    it('should handle malformed JSON in location data gracefully', async () => {
      // Insert location with malformed JSON
      db.prepare(`
        INSERT INTO locations (id, pano_id, map_id, country, images, raw_data)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(4, 'bad-pano', 'bad-map', 'TestCountry', '{invalid}', '[malformed');

      const request = new NextRequest('http://localhost/api/gallery');
      const response = await GET(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.locations).toHaveLength(4);
      
      // Find the location with malformed JSON
      const badLocation = data.locations.find((loc: any) => loc.id === 4);
      expect(badLocation.images).toEqual([]);
      expect(badLocation.raw_data).toEqual({});
    });
  });
});