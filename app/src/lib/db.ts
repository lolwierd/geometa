import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'db/geometa.db');

export const db = new Database(dbPath, {
  // readonly: false, // uncomment for read-write access
  // fileMustExist: true, // uncomment to throw error if db file doesn't exist
});

// This is to ensure that the database connection is closed when the app exits.
process.on('exit', () => db.close());
process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));

