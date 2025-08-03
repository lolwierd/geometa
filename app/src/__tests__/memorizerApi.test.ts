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

    const res = await GET();
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

  it('schedules consistently regardless of server timezone', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-01-01T00:00:00Z'));

    process.env.TZ = 'UTC';
    await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ locationId: 1, quality: 5 }),
      }),
    );

    const { due_date: dueUtc } = db
      .prepare('SELECT due_date FROM memorizer_progress WHERE location_id = ?')
      .get(1) as { due_date: string };

    db.prepare(
      'INSERT INTO locations (id, country, images, raw_data) VALUES (?, ?, ?, ?)',
    ).run(2, 'Otherland', '[]', '{}');

    process.env.TZ = 'Pacific/Honolulu';
    vi.setSystemTime(new Date('2023-01-01T00:00:00Z'));
    await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ locationId: 2, quality: 5 }),
      }),
    );

    const { due_date: dueHon } = db
      .prepare('SELECT due_date FROM memorizer_progress WHERE location_id = ?')
      .get(2) as { due_date: string };

    expect(dueUtc).toBe(dueHon);

    vi.useRealTimers();

  });
});

