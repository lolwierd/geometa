import Database from 'better-sqlite3';

const db = new Database('db/geometa.db', { verbose: console.log });

function migrate() {
  console.log('🚀 Applying memorizer progress migration...');

  // Create memorizer_progress table
  db.exec(`
    CREATE TABLE IF NOT EXISTS memorizer_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id INTEGER NOT NULL UNIQUE,
      -- Spaced Repetition Fields (based on a simplified SM-2 algorithm)
      repetitions INTEGER NOT NULL DEFAULT 0,
      ease_factor REAL NOT NULL DEFAULT 2.5, -- A factor controlling interval growth
      "interval" INTEGER NOT NULL DEFAULT 0, -- Days until next review
      due_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      state TEXT NOT NULL DEFAULT 'new',
      lapses INTEGER NOT NULL DEFAULT 0,
      -- Timestamps
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE
    );
  `);

  // Create indexes for performance
  db.exec(`CREATE INDEX IF NOT EXISTS idx_memorizer_due_date ON memorizer_progress (due_date);`);
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_memorizer_location_id ON memorizer_progress (location_id);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_memorizer_state ON memorizer_progress (state);`);
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_memorizer_state_due_date ON memorizer_progress (state, due_date);`,
  );

  // Trigger to automatically update the 'updated_at' timestamp
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS memorizer_progress_updated_at
    AFTER UPDATE ON memorizer_progress FOR EACH ROW
    BEGIN
      UPDATE memorizer_progress SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `);

  console.log('✅ Created memorizer_progress table with indexes and triggers.');

  // Verify the schema
  const tableInfo = db.prepare("PRAGMA table_info(memorizer_progress)").all();
  console.log('📋 New memorizer_progress schema:');
  tableInfo.forEach(col => {
    console.log(`   ${col.name}: ${col.type}${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''}`);
  });

  console.log('🎉 Memorizer migration applied successfully!');
}

migrate();
