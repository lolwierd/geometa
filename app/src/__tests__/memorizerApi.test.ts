import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../lib/db';
import { GET, POST } from '../app/api/memorizer/route';

describe('memorizer API', () => {
  beforeEach(() => {
    db.exec(`
      DROP TABLE IF EXISTS locations;
      CREATE TABLE locations (id INTEGER PRIMARY KEY AUTOINCREMENT);
      DROP TABLE IF EXISTS memorizer_progress;
      CREATE TABLE memorizer_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        location_id INTEGER NOT NULL UNIQUE,
        repetitions INTEGER NOT NULL DEFAULT 0,
        ease_factor REAL NOT NULL DEFAULT 2.5,
        "interval" INTEGER NOT NULL DEFAULT 0,
        due_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        state TEXT NOT NULL DEFAULT 'new',
        lapses INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    db.prepare('INSERT INTO locations (id) VALUES (1)').run();
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
      .get(1) as { due_date: string };
    const pastIso = new Date(Date.parse(due_date) - 2 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('UPDATE memorizer_progress SET due_date = ? WHERE location_id = ?').run(pastIso, 1);

    const res = await GET();
    const data = await res.json();

    expect(data.locationId).toBe(1);
    expect(data.stats).toEqual({ new: 1, review: 0, lapsed: 0 });
  });
});

