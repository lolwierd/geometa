import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../lib/db';
import { GET, POST } from '../app/api/memorizer/route';

describe('memorizer API', () => {
  beforeEach(() => {
    // Clean up test data without dropping tables
    db.exec('DELETE FROM memorizer_reviews');
    db.exec('DELETE FROM memorizer_progress');
    db.exec('DELETE FROM locations');
    
    db.prepare(
      "INSERT INTO locations (id, pano_id, map_id, country, images, raw_data) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(1, "test-pano", "test-map", "Testland", "[]", "{}");
  });

  it('returns scheduled cards as due after time advances', async () => {
    await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ locationId: 1, quality: 5 }),
      }),
    );

    const { due_date } = db
      .prepare('SELECT due_date FROM memorizer_progress WHERE location_id = ?')
      .get(1) as { due_date: number };
    const pastTs = due_date - 2 * 24 * 60 * 60;
    db.prepare('UPDATE memorizer_progress SET due_date = ? WHERE location_id = ?').run(pastTs, 1);

    const res = await GET(new Request('http://localhost/api/memorizer'));
    const data = await res.json();

    expect(data.location).toEqual(
      expect.objectContaining({
        id: 1,
        country: 'Testland',
        images: [],
        raw_data: {},
      }),
    );
    expect(data.stats).toEqual({
      new: 1,
      review: 0,
      lapsed: 0,
      newTotal: 1,
      reviewTotal: 0,
      lapsedTotal: 0,
    });
  });

  it('re-queues lapsed cards for a quick follow-up review', async () => {
    db.prepare(
      "INSERT INTO memorizer_progress (location_id, repetitions, ease_factor, \"interval\", due_date, next_review, state, lapses) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, 'lapsed', 1)",
    ).run(1, 0, 2.5, 7, Math.floor(Date.now() / 1000));

    const before = Date.now();

    await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ locationId: 1, quality: 4 }),
      }),
    );

    const { due_date } = db
      .prepare('SELECT due_date FROM memorizer_progress WHERE location_id = ?')
      .get(1) as { due_date: string };
    const diffMs = Date.parse(due_date) - before;

    expect(diffMs).toBeGreaterThanOrEqual(9 * 60 * 1000);
    expect(diffMs).toBeLessThanOrEqual(11 * 60 * 1000);
  });
  it('filters by country parameter', async () => {
    db.prepare(
      "INSERT INTO locations (id, pano_id, map_id, country, images, raw_data) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(2, 'test-pano-2', 'test-map-2', 'Otherland', '[]', '{"lat": 123, "lng": 456}');

    const res = await GET(
      new Request('http://localhost/api/memorizer?country=Otherland'),
    );
    const data = await res.json();

    expect(data.location).toEqual(
      expect.objectContaining({ id: 2, country: 'Otherland' }),
    );
    expect(data.stats).toEqual({
      new: 1,
      review: 0,
      lapsed: 0,
      newTotal: 1,
      reviewTotal: 0,
      lapsedTotal: 0,
    });
  });
});

