import Database from 'better-sqlite3';
import path from 'path';
const isTest = process.env.NODE_ENV === 'test' ||
    process.env.VITEST === 'true';
const dbPath = isTest ? ':memory:' :
    path.resolve(process.cwd(), process.env.DB_PATH || 'db/geometa.db');
export const db = new Database(dbPath);
// Cleanup handlers
process.on('exit', () => db.close());
process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));
//# sourceMappingURL=db.js.map