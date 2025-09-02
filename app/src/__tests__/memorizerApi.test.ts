import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../lib/db';
import { GET, POST } from '../app/api/memorizer/route';

describe('memorizer API', () => {
  beforeEach(() => {
    db.exec(`
      DROP TABLE IF EXISTS locations;
      CREATE TABLE locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        country TEXT,
        images TEXT,
        raw_data TEXT
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
    `);
    db.prepare(
      "INSERT INTO locations (id, country, images, raw_data) VALUES (?, ?, ?, ?)",
    ).run(1, "Testland", "[]", "{}");
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
      "INSERT INTO memorizer_progress (location_id, repetitions, ease_factor, \"interval\", due_date, state, lapses) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 'lapsed', 1)",
    ).run(1, 0, 2.5, 7);

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
      "INSERT INTO locations (id, country, images, raw_data) VALUES (?, ?, ?, ?)",
    ).run(2, 'Otherland', '[]', '{}');

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

