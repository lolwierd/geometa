import Database from 'better-sqlite3';

const db = new Database('db/geometa.db', { verbose: console.log });

function init() {
  console.log('🔄 Migrating to GeoMeta Gallery v2.0 schema...');

  // Drop old table (backup should be made before running this)
  try {
    db.exec(`DROP TABLE IF EXISTS screenshots;`);
    console.log('✅ Removed old screenshots table');
  } catch (error) {
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

  // Verify the schema
  const tableInfo = db.prepare("PRAGMA table_info(locations)").all();
  console.log('📋 New schema structure:');
  tableInfo.forEach(col => {
    console.log(`   ${col.name}: ${col.type}${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''}`);
  });

  const indexInfo = db.prepare("PRAGMA index_list(locations)").all();
  console.log('📋 Created indexes:');
  indexInfo.forEach(idx => {
    console.log(`   ${idx.name}`);
  });

  console.log('🎉 GeoMeta Gallery v2.0 database schema initialized successfully!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Install the new userscript');
  console.log('2. Start your backend: npm run dev');
  console.log('3. Play GeoGuessr to start collecting!');
}

init();
