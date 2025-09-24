import Database from 'better-sqlite3';
import path from 'path';
const dbPath = path.resolve(process.cwd(), process.env.DB_PATH || 'db/geometa.db');
const db = new Database(dbPath, { verbose: console.log });
function init() {
    console.log('🔄 Initializing GeoMeta Gallery database schema...');
    // Drop old table (backup should be made before running this)
    try {
        db.exec(`DROP TABLE IF EXISTS screenshots;`);
        console.log('✅ Removed old screenshots table');
    }
    catch (error) {
        console.log('ℹ️ No old screenshots table to remove');
    }
    // Create new simplified schema for location data
    db.exec(`
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
  `);
    // Create indexes for performance
    db.exec(`CREATE INDEX IF NOT EXISTS idx_pano_id ON locations (pano_id);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_country ON locations (country);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_map_id ON locations (map_id);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_created_at ON locations (created_at DESC);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_meta_name ON locations (meta_name);`);
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_raw_data_unique ON locations (raw_data);`);
    // Create full-text search index for notes and footer
    db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS locations_fts USING fts5(
      country, meta_name, note, footer,
      content='locations',
      content_rowid='id'
    );
  `);
    // Create triggers to keep FTS table in sync
    db.exec(`
    CREATE TRIGGER IF NOT EXISTS locations_fts_insert AFTER INSERT ON locations BEGIN
      INSERT INTO locations_fts(rowid, country, meta_name, note, footer)
      VALUES (new.id, new.country, new.meta_name, new.note, new.footer);
    END;
  `);
    db.exec(`
    CREATE TRIGGER IF NOT EXISTS locations_fts_delete AFTER DELETE ON locations BEGIN
      INSERT INTO locations_fts(locations_fts, rowid, country, meta_name, note, footer)
      VALUES('delete', old.id, old.country, old.meta_name, old.note, old.footer);
    END;
  `);
    db.exec(`
    CREATE TRIGGER IF NOT EXISTS locations_fts_update AFTER UPDATE ON locations BEGIN
      INSERT INTO locations_fts(locations_fts, rowid, country, meta_name, note, footer)
      VALUES('delete', old.id, old.country, old.meta_name, old.note, old.footer);
      INSERT INTO locations_fts(rowid, country, meta_name, note, footer)
      VALUES (new.id, new.country, new.meta_name, new.note, new.footer);
    END;
  `);
    // Create updated_at trigger
    db.exec(`
    CREATE TRIGGER IF NOT EXISTS locations_updated_at
    AFTER UPDATE ON locations FOR EACH ROW
    BEGIN
      UPDATE locations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `);
    console.log('✅ Created locations table with indexes');
    console.log('✅ Created full-text search capabilities');
    console.log('✅ Created automatic triggers');
    // Create memorizer_progress table for spaced repetition
    db.exec(`
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
  `);
    // Create indexes for memorizer performance
    db.exec(`CREATE INDEX IF NOT EXISTS idx_memorizer_due_date ON memorizer_progress (due_date);`);
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_memorizer_location_id ON memorizer_progress (location_id);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_memorizer_state ON memorizer_progress (state);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_memorizer_state_due_date ON memorizer_progress (state, due_date);`);
    // Trigger to automatically update the 'updated_at' timestamp for memorizer
    db.exec(`
    CREATE TRIGGER IF NOT EXISTS memorizer_progress_updated_at
    AFTER UPDATE ON memorizer_progress FOR EACH ROW
    BEGIN
      UPDATE memorizer_progress SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `);
    console.log('✅ Created memorizer_progress table with spaced repetition support');
    // Verify the schema
    const tableInfo = db.prepare("PRAGMA table_info(locations)").all();
    console.log('📋 New schema structure:');
    tableInfo.forEach((col) => {
        console.log(`   ${col.name}: ${col.type}${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''}`);
    });
    const indexInfo = db.prepare("PRAGMA index_list(locations)").all();
    console.log('📋 Created indexes:');
    indexInfo.forEach((idx) => {
        console.log(`   ${idx.name}`);
    });
    console.log('🎉 GeoMeta Gallery database schema initialized successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Install the userscript from userscript.js');
    console.log('2. Start your backend: npm run dev');
    console.log('3. Play GeoGuessr to start collecting locations!');
}
init();
//# sourceMappingURL=init-db.js.map