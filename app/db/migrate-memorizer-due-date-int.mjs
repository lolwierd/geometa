import Database from 'better-sqlite3';

const db = new Database('db/geometa.db', { verbose: console.log });

function migrate() {
  console.log('🚀 Migrating memorizer_progress.due_date to integer timestamps...');

  const tableInfo = db.prepare('PRAGMA table_info(memorizer_progress)').all();
  const dueDateCol = tableInfo.find(col => col.name === 'due_date');

  if (!dueDateCol) {
    console.log('ℹ️ Table memorizer_progress does not exist. Skipping.');
    return;
  }

  if (dueDateCol.type.toUpperCase() === 'INTEGER') {
    console.log('ℹ️ due_date is already INTEGER. Skipping migration.');
    return;
  }

  db.exec('BEGIN TRANSACTION;');

  db.exec(`
    CREATE TABLE memorizer_progress_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id INTEGER NOT NULL UNIQUE,
      repetitions INTEGER NOT NULL DEFAULT 0,
      ease_factor REAL NOT NULL DEFAULT 2.5,
      "interval" INTEGER NOT NULL DEFAULT 0,
      due_date INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      state TEXT NOT NULL DEFAULT 'new',
      lapses INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    INSERT INTO memorizer_progress_new (
      id, location_id, repetitions, ease_factor, "interval", due_date, state, lapses, created_at, updated_at
    )
    SELECT
      id,
      location_id,
      repetitions,
      ease_factor,
      "interval",
      CAST(strftime('%s', due_date) AS INTEGER) AS due_date,
      state,
      lapses,
      created_at,
      updated_at
    FROM memorizer_progress;
  `);

  db.exec('DROP TABLE memorizer_progress;');
  db.exec('ALTER TABLE memorizer_progress_new RENAME TO memorizer_progress;');

  db.exec(`CREATE INDEX IF NOT EXISTS idx_memorizer_due_date ON memorizer_progress (due_date);`);
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_memorizer_location_id ON memorizer_progress (location_id);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_memorizer_state ON memorizer_progress (state);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_memorizer_state_due_date ON memorizer_progress (state, due_date);`);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS memorizer_progress_updated_at
    AFTER UPDATE ON memorizer_progress FOR EACH ROW
    BEGIN
      UPDATE memorizer_progress SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `);

  db.exec('COMMIT;');

  console.log('✅ Completed due_date migration to integer timestamps.');
}

migrate();

