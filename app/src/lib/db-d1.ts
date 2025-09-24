// Cloudflare D1 database client
// Replaces better-sqlite3 with async D1 operations

interface CloudflareEnv {
  DB: D1Database;
  NODE_ENV?: string;
}

// Type definitions for D1 results
interface D1Result<T = any> {
  results: T[];
  success: boolean;
  meta: {
    duration: number;
    size_after: number;
    rows_read: number;
    rows_written: number;
  };
}

interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = any>(): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = any>(): Promise<D1Result<T>>;
}

// Global D1 database instance
let db: D1Database | null = null;

// Initialize D1 database connection
export function initD1Database(database: D1Database) {
  db = database;
}

// Get D1 database instance
export function getD1Database(): D1Database {
  if (!db) {
    throw new Error('D1 database not initialized. Call initD1Database() first.');
  }
  return db;
}

// D1-compatible database operations wrapper
export class D1DatabaseAdapter {
  private db: D1Database;

  constructor(database: D1Database) {
    this.db = database;
  }

  // Prepare a SQL statement (returns D1PreparedStatement)
  prepare(sql: string): D1PreparedStatement {
    return this.db.prepare(sql);
  }

  // Execute a single SQL statement
  async exec(sql: string): Promise<void> {
    await this.db.exec(sql);
  }

  // Execute multiple SQL statements in a batch (more efficient)
  async batch(statements: D1PreparedStatement[]): Promise<D1Result[]> {
    return await this.db.batch(statements);
  }
}

// For backward compatibility with existing code, create adapter functions
export const d1 = {
  // Get database adapter instance
  getAdapter(): D1DatabaseAdapter {
    return new D1DatabaseAdapter(getD1Database());
  },

  // Direct access to D1 database for advanced operations
  raw(): D1Database {
    return getD1Database();
  }
};

// Environment-aware database initialization
// This will be called from API routes with the appropriate environment
export function createDatabaseConnection(env: CloudflareEnv): D1DatabaseAdapter {
  if (!env.DB) {
    throw new Error('D1 database binding not found. Check wrangler.toml configuration.');
  }
  
  initD1Database(env.DB);
  return new D1DatabaseAdapter(env.DB);
}

// Migration helpers for converting from better-sqlite3 patterns
export class D1QueryBuilder {
  private db: D1Database;

  constructor(database: D1Database) {
    this.db = database;
  }

  // Helper for SELECT queries that return all rows
  async selectAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    const result = await bound.all<T>();
    return result.results;
  }

  // Helper for SELECT queries that return a single row
  async selectFirst<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const stmt = this.db.prepare(sql);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    return await bound.first<T>();
  }

  // Helper for INSERT/UPDATE/DELETE queries
  async run(sql: string, params: any[] = []): Promise<D1Result> {
    const stmt = this.db.prepare(sql);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    return await bound.run();
  }

  // Helper for INSERT queries that need to return the inserted ID
  async insert(sql: string, params: any[] = []): Promise<number> {
    const result = await this.run(sql, params);
    if (!result.meta) {
      throw new Error('Insert operation failed - no metadata returned');
    }
    // D1 returns the inserted row ID in the meta object
    return result.meta.rows_written > 0 ? result.meta.size_after : 0;
  }
}

// Export types for use in API routes
export type { CloudflareEnv, D1Result, D1PreparedStatement };