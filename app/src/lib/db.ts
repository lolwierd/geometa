import Database from 'better-sqlite3';
import path from 'path';

// Use in-memory database for tests, real database for production
// Check multiple ways to detect test environment
const isTest = process.env.NODE_ENV === 'test' || 
               process.env.VITEST === 'true' ||
               process.argv.some(arg => arg.includes('vitest')) ||
               // Check if running in vitest by looking at the stack trace
               (new Error().stack?.includes('vitest') ?? false);

const dbPath = isTest ? ':memory:' : path.resolve(process.cwd(), 'db/geometa.db');

export const db = new Database(dbPath, {
  // readonly: false, // uncomment for read-write access
  // fileMustExist: true, // uncomment to throw error if db file doesn't exist
});

// Disable foreign key constraints for the in-memory test database
if (isTest) {
  db.pragma('foreign_keys = OFF');
}

// Initialize test database schema if running in test mode
if (isTest) {
  // Create locations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS locations (
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

  // Create memorizer_progress table
  db.exec(`
    CREATE TABLE IF NOT EXISTS memorizer_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id INTEGER NOT NULL UNIQUE,
      repetitions INTEGER NOT NULL DEFAULT 0,
      easiness_factor REAL NOT NULL DEFAULT 2.5,
      ease_factor REAL NOT NULL DEFAULT 2.5,
      next_review INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      interval_days INTEGER NOT NULL DEFAULT 1,
      "interval" INTEGER NOT NULL DEFAULT 0,
      due_date INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      state TEXT NOT NULL DEFAULT 'new',
      lapses INTEGER NOT NULL DEFAULT 0,
      is_lapsed BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create memorizer_reviews table
  db.exec(`
    CREATE TABLE IF NOT EXISTS memorizer_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id INTEGER NOT NULL,
      quality INTEGER NOT NULL,
      reviewed_at INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create FTS virtual table for locations
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS locations_fts USING fts5(
      content=locations,
      country,
      meta_name,
      note,
      footer
    );
  `);
}

// This is to ensure that the database connection is closed when the app exits.
process.on('exit', () => db.close());
process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));

