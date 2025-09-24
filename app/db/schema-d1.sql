-- Migration script for Cloudflare D1
-- Converts existing SQLite schema to D1-compatible format
-- Note: FTS5 virtual tables are NOT supported in D1

-- Create locations table (same structure as SQLite version)
CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pano_id TEXT NOT NULL UNIQUE,
  map_id TEXT NOT NULL,
  country TEXT NOT NULL,
  country_code TEXT,
  meta_name TEXT,
  note TEXT,
  footer TEXT,
  images TEXT DEFAULT '[]', -- JSON array of image URLs
  raw_data TEXT DEFAULT '{}', -- Full API response for future use  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance (same as SQLite)
CREATE INDEX IF NOT EXISTS idx_pano_id ON locations (pano_id);
CREATE INDEX IF NOT EXISTS idx_country ON locations (country);
CREATE INDEX IF NOT EXISTS idx_map_id ON locations (map_id); 
CREATE INDEX IF NOT EXISTS idx_created_at ON locations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meta_name ON locations (meta_name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_raw_data_unique ON locations (raw_data);

-- Create memorizer_progress table for spaced repetition
CREATE TABLE IF NOT EXISTS memorizer_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER NOT NULL UNIQUE,
  -- Spaced Repetition Fields (based on a simplified SM-2 algorithm)
  repetitions INTEGER NOT NULL DEFAULT 0,
  ease_factor REAL NOT NULL DEFAULT 2.5, -- A factor controlling interval growth
  "interval" INTEGER NOT NULL DEFAULT 0, -- Days until next review
  due_date INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  state TEXT NOT NULL DEFAULT 'new',
  lapses INTEGER NOT NULL DEFAULT 0,
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE
);

-- Create indexes for memorizer performance
CREATE INDEX IF NOT EXISTS idx_memorizer_due_date ON memorizer_progress (due_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_memorizer_location_id ON memorizer_progress (location_id);
CREATE INDEX IF NOT EXISTS idx_memorizer_state ON memorizer_progress (state);
CREATE INDEX IF NOT EXISTS idx_memorizer_state_due_date ON memorizer_progress (state, due_date);

-- Create memorizer_reviews table for tracking review history  
CREATE TABLE IF NOT EXISTS memorizer_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER NOT NULL,
  quality INTEGER NOT NULL, -- Quality of review (0-5 scale)
  reviewed_at INTEGER NOT NULL, -- Unix timestamp
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE
);

-- Create index for review statistics queries
CREATE INDEX IF NOT EXISTS idx_memorizer_reviews_date ON memorizer_reviews (reviewed_at);
CREATE INDEX IF NOT EXISTS idx_memorizer_reviews_location ON memorizer_reviews (location_id);

-- IMPORTANT: D1 does NOT support triggers, so we'll handle updated_at in application code
-- The following triggers from SQLite version are NOT compatible with D1:
-- - locations_updated_at trigger
-- - memorizer_progress_updated_at trigger  
-- - FTS5 virtual table and related triggers

-- Instead, we'll update updated_at field in application code when needed