// Cloudflare D1 database client
// Replaces better-sqlite3 with async D1 operations

// Type definitions for D1 (since @cloudflare/workers-types may not be available at build time)
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<void>;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}

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
    try {
      if (!this.db) {
        throw new Error('D1 database not initialized');
      }
      
      const stmt = this.db.prepare(sql);
      if (!stmt) {
        throw new Error('Failed to prepare SQL statement');
      }
      
      return stmt;
    } catch (error) {
      console.error('D1 prepare error:', { sql, error });
      throw error;
    }
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
    try {
      const stmt = this.db.prepare(sql);
      if (!stmt) {
        throw new Error('Failed to prepare SQL statement');
      }
      
      const bound = params.length > 0 ? stmt.bind(...params) : stmt;
      if (!bound) {
        throw new Error('Failed to bind parameters to statement');
      }
      
      const result = await bound.all<T>();
      if (!result || typeof result.results === 'undefined') {
        console.warn('D1 query result missing results property:', { sql, params, result });
        return [];
      }
      
      return result.results || [];
    } catch (error) {
      console.error('D1 selectAll error:', { sql, params, error });
      throw error;
    }
  }

  // Helper for SELECT queries that return a single row
  async selectFirst<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    try {
      const stmt = this.db.prepare(sql);
      if (!stmt) {
        throw new Error('Failed to prepare SQL statement');
      }
      
      const bound = params.length > 0 ? stmt.bind(...params) : stmt;
      if (!bound) {
        throw new Error('Failed to bind parameters to statement');
      }
      
      const result = await bound.first<T>();
      return result || null;
    } catch (error) {
      console.error('D1 selectFirst error:', { sql, params, error });
      throw error;
    }
  }

  // Helper for INSERT/UPDATE/DELETE queries
  async run(sql: string, params: any[] = []): Promise<D1Result> {
    try {
      const stmt = this.db.prepare(sql);
      if (!stmt) {
        throw new Error('Failed to prepare SQL statement');
      }
      
      const bound = params.length > 0 ? stmt.bind(...params) : stmt;
      if (!bound) {
        throw new Error('Failed to bind parameters to statement');
      }
      
      const result = await bound.run();
      if (!result) {
        throw new Error('D1 query returned no result');
      }
      
      return result;
    } catch (error) {
      console.error('D1 run error:', { sql, params, error });
      throw error;
    }
  }

  // Helper for INSERT queries that need to return the inserted ID
  async insert(sql: string, params: any[] = []): Promise<number> {
    const result = await this.run(sql, params);
    
    // Add defensive checks for D1 result structure
    if (!result) {
      throw new Error('Insert operation failed - no result returned');
    }
    
    if (!result.meta) {
      console.warn('Insert operation - no metadata returned, using fallback');
      return 0;
    }
    
    // D1 returns the inserted row ID in the meta object
    const rowsWritten = result.meta.rows_written || 0;
    const lastRowId = result.meta.size_after || 0;
    
    return rowsWritten > 0 ? lastRowId : 0;
  }
}

// Export types for use in API routes
export type { CloudflareEnv, D1Result, D1PreparedStatement };