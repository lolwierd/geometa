import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../lib/db';
import { GET } from '../app/api/stats/route';

describe('stats API', () => {
  beforeEach(() => {
    // Clean up and recreate tables for each test
    db.exec(`
      DROP TABLE IF EXISTS memorizer_reviews;
      CREATE TABLE memorizer_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        location_id INTEGER NOT NULL,
        quality INTEGER NOT NULL,
        reviewed_at INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  });

  it('should return empty data array when no reviews exist', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data).toEqual({
      success: true,
      data: []
    });
    expect(response.status).toBe(200);
  });

  it('should return daily statistics when reviews exist', async () => {
    // Insert test review data for multiple days
    const today = Math.floor(Date.now() / 1000);
    const yesterday = today - 24 * 60 * 60;
    const twoDaysAgo = today - 2 * 24 * 60 * 60;

    // Today: 3 reviews, 2 successful (quality >= 3)
    db.prepare('INSERT INTO memorizer_reviews (location_id, quality, reviewed_at) VALUES (?, ?, ?)').run(1, 5, today);
    db.prepare('INSERT INTO memorizer_reviews (location_id, quality, reviewed_at) VALUES (?, ?, ?)').run(2, 4, today);
    db.prepare('INSERT INTO memorizer_reviews (location_id, quality, reviewed_at) VALUES (?, ?, ?)').run(3, 2, today);

    // Yesterday: 2 reviews, 1 successful
    db.prepare('INSERT INTO memorizer_reviews (location_id, quality, reviewed_at) VALUES (?, ?, ?)').run(4, 3, yesterday);
    db.prepare('INSERT INTO memorizer_reviews (location_id, quality, reviewed_at) VALUES (?, ?, ?)').run(5, 1, yesterday);

    // Two days ago: 1 review, 1 successful
    db.prepare('INSERT INTO memorizer_reviews (location_id, quality, reviewed_at) VALUES (?, ?, ?)').run(6, 4, twoDaysAgo);

    const response = await GET();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(3);
    
    // Results should be ordered by day ASC
    const sortedData = data.data.sort((a: any, b: any) => a.day.localeCompare(b.day));
    
    // Check structure of returned data
    sortedData.forEach((dayData: any) => {
      expect(dayData).toHaveProperty('day');
      expect(dayData).toHaveProperty('count');
      expect(dayData).toHaveProperty('successRate');
      expect(typeof dayData.day).toBe('string');
      expect(typeof dayData.count).toBe('number');
      expect(typeof dayData.successRate).toBe('number');
      expect(dayData.successRate).toBeGreaterThanOrEqual(0);
      expect(dayData.successRate).toBeLessThanOrEqual(1);
    });

    // Find today's data and verify calculations
    const todayFormatted = new Date(today * 1000).toISOString().split('T')[0];
    const todayData = data.data.find((d: any) => d.day === todayFormatted);
    expect(todayData).toBeDefined();
    expect(todayData.count).toBe(3);
    expect(todayData.successRate).toBeCloseTo(2/3, 10); // 2 out of 3 successful

    // Find yesterday's data
    const yesterdayFormatted = new Date(yesterday * 1000).toISOString().split('T')[0];
    const yesterdayData = data.data.find((d: any) => d.day === yesterdayFormatted);
    expect(yesterdayData).toBeDefined();
    expect(yesterdayData.count).toBe(2);
    expect(yesterdayData.successRate).toBeCloseTo(0.5, 10); // 1 out of 2 successful

    // Find two days ago data
    const twoDaysAgoFormatted = new Date(twoDaysAgo * 1000).toISOString().split('T')[0];
    const twoDaysAgoData = data.data.find((d: any) => d.day === twoDaysAgoFormatted);
    expect(twoDaysAgoData).toBeDefined();
    expect(twoDaysAgoData.count).toBe(1);
    expect(twoDaysAgoData.successRate).toBe(1); // 1 out of 1 successful
  });

  it('should handle edge case where all reviews have quality < 3', async () => {
    const today = Math.floor(Date.now() / 1000);
    
    // Insert reviews with low quality
    db.prepare('INSERT INTO memorizer_reviews (location_id, quality, reviewed_at) VALUES (?, ?, ?)').run(1, 0, today);
    db.prepare('INSERT INTO memorizer_reviews (location_id, quality, reviewed_at) VALUES (?, ?, ?)').run(2, 1, today);
    db.prepare('INSERT INTO memorizer_reviews (location_id, quality, reviewed_at) VALUES (?, ?, ?)').run(3, 2, today);

    const response = await GET();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    
    const todayData = data.data[0];
    expect(todayData.count).toBe(3);
    expect(todayData.successRate).toBe(0); // 0 out of 3 successful
  });

  it('should handle edge case where all reviews have quality >= 3', async () => {
    const today = Math.floor(Date.now() / 1000);
    
    // Insert reviews with high quality
    db.prepare('INSERT INTO memorizer_reviews (location_id, quality, reviewed_at) VALUES (?, ?, ?)').run(1, 3, today);
    db.prepare('INSERT INTO memorizer_reviews (location_id, quality, reviewed_at) VALUES (?, ?, ?)').run(2, 4, today);
    db.prepare('INSERT INTO memorizer_reviews (location_id, quality, reviewed_at) VALUES (?, ?, ?)').run(3, 5, today);

    const response = await GET();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    
    const todayData = data.data[0];
    expect(todayData.count).toBe(3);
    expect(todayData.successRate).toBe(1); // 3 out of 3 successful
  });

  it('should return gracefully when memorizer_reviews table does not exist', async () => {
    // Drop the table to simulate missing table scenario
    db.exec('DROP TABLE IF EXISTS memorizer_reviews;');

    const response = await GET();
    const data = await response.json();

    expect(data).toEqual({
      success: true,
      data: []
    });
    expect(response.status).toBe(200);
  });

  it('should handle database errors gracefully', async () => {
    // Mock database to throw an error that's not "no such table"
    const originalPrepare = db.prepare;
    db.prepare = vi.fn().mockImplementation(() => {
      throw new Error('Database connection failed');
    });

    const response = await GET();
    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.message).toBe('Internal Server Error');
    expect(response.status).toBe(500);

    // Restore original method
    db.prepare = originalPrepare;
  });

  it('should properly aggregate reviews across multiple locations per day', async () => {
    const today = Math.floor(Date.now() / 1000);
    
    // Insert multiple reviews for same locations on same day
    db.prepare('INSERT INTO memorizer_reviews (location_id, quality, reviewed_at) VALUES (?, ?, ?)').run(1, 5, today);
    db.prepare('INSERT INTO memorizer_reviews (location_id, quality, reviewed_at) VALUES (?, ?, ?)').run(1, 3, today);
    db.prepare('INSERT INTO memorizer_reviews (location_id, quality, reviewed_at) VALUES (?, ?, ?)').run(2, 2, today);
    db.prepare('INSERT INTO memorizer_reviews (location_id, quality, reviewed_at) VALUES (?, ?, ?)').run(2, 4, today);

    const response = await GET();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    
    const todayData = data.data[0];
    expect(todayData.count).toBe(4); // Total reviews for the day
    expect(todayData.successRate).toBe(0.75); // 3 out of 4 successful (quality >= 3)
  });
});