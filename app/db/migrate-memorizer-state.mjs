import Database from 'better-sqlite3';

const db = new Database('db/geometa.db', { verbose: console.log });

function migrate() {
  console.log('🚀 Applying memorizer state migration...');

  try {
    // Add a 'state' column to track if a card is new, learning, review, or lapsed.
    // - new: Never seen before.
    // - learning: Seen for the first time, still being actively learned.
    // - review: Graduated from learning, in long-term review schedule.
    // - lapsed: Was in review, but forgotten. Must be relearned.
    db.exec(`
      ALTER TABLE memorizer_progress
      ADD COLUMN state TEXT NOT NULL DEFAULT 'new';
    `);

    // Add a 'lapses' counter
    db.exec(`
      ALTER TABLE memorizer_progress
      ADD COLUMN lapses INTEGER NOT NULL DEFAULT 0;
    `);

    // Index the state column for faster lookups
    db.exec(`CREATE INDEX IF NOT EXISTS idx_memorizer_state ON memorizer_progress (state);`);
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_memorizer_state_due_date ON memorizer_progress (state, due_date);`,
    );

    console.log('✅ Added "state" and "lapses" columns to memorizer_progress table.');

  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('ℹ️ Columns "state" and "lapses" already exist. Skipping.');
    } else {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  // Verify the schema
  const tableInfo = db.prepare("PRAGMA table_info(memorizer_progress)").all();
  console.log('📋 Updated memorizer_progress schema:');
  tableInfo.forEach(col => {
    console.log(`   ${col.name}: ${col.type}${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''}`);
  });

  console.log('🎉 Memorizer state migration applied successfully!');
}

migrate();
