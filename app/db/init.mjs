import Database from 'better-sqlite3';

const db = new Database('db/geometa.db', { verbose: console.log });

function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS screenshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image_path TEXT NOT NULL,
      metadata TEXT NOT NULL,
      country TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_country ON screenshots (country);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_created_at ON screenshots (created_at);
  `);

  console.log('Database initialized successfully.');
}

init();
