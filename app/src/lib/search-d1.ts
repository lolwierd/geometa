// Search functionality for D1 database
// Replaces SQLite FTS5 virtual tables with LIKE-based search

import { D1QueryBuilder } from './db-d1';

export interface SearchOptions {
  query?: string;
  country?: string;
  continent?: string; 
  state?: string;
  limit?: number;
  offset?: number;
}

export interface SearchResult<T> {
  results: T[];
  total: number;
  hasMore: boolean;
}

/**
 * Search locations using LIKE queries (replacement for FTS5)
 * This is slower than FTS5 but works with Cloudflare D1
 */
export class LocationSearcher {
  private queryBuilder: D1QueryBuilder;

  constructor(queryBuilder: D1QueryBuilder) {
    this.queryBuilder = queryBuilder;
  }

  /**
   * Search locations with filters and pagination
   */
  async searchLocations<T = any>(options: SearchOptions): Promise<SearchResult<T>> {
    const {
      query,
      country,
      continent,
      state,
      limit = 50,
      offset = 0
    } = options;

    // Build WHERE clauses
    const conditions: string[] = [];
    const params: any[] = [];
    
    // Search query - check multiple fields
    if (query && query.trim()) {
      const searchTerm = `%${query.trim()}%`;
      conditions.push(`(
        country LIKE ? OR 
        meta_name LIKE ? OR 
        note LIKE ? OR 
        footer LIKE ? OR
        pano_id LIKE ?
      )`);
      // Add search term for each field
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Country filter
    if (country && country !== 'all') {
      const countries = country.split(',').map(c => c.trim()).filter(c => c);
      if (countries.length > 0) {
        const placeholders = countries.map(() => '?').join(',');
        conditions.push(`country IN (${placeholders})`);
        params.push(...countries);
      }
    }

    // State filter (if applicable)
    if (state && state !== 'all') {
      const states = state.split(',').map(s => s.trim()).filter(s => s);
      if (states.length > 0) {
        const placeholders = states.map(() => '?').join(',');
        conditions.push(`country_code IN (${placeholders})`);
        params.push(...states);
      }
    }

    // Continent filter (need to map continents to countries)
    if (continent && continent !== 'all') {
      // This would need to be implemented with a country-to-continent mapping
      // For now, we'll skip this complex filter
      console.warn('Continent filtering not yet implemented in D1 search');
    }

    // Build the main query
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const mainSql = `
      SELECT l.* FROM locations l
      LEFT JOIN memorizer_progress mp ON l.id = mp.location_id
      ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?
    `;

    // Add limit and offset parameters
    const queryParams = [...params, limit, offset];

    // Get count for pagination
    const countSql = `
      SELECT COUNT(*) as count FROM locations l
      ${whereClause}
    `;

    // Execute both queries
    const [results, countResult] = await Promise.all([
      this.queryBuilder.selectAll<T>(mainSql, queryParams),
      this.queryBuilder.selectFirst<{ count: number }>(countSql, params)
    ]);

    const total = countResult?.count || 0;
    const hasMore = offset + limit < total;

    return {
      results,
      total,
      hasMore
    };
  }

  /**
   * Get search suggestions based on partial input
   */
  async getSearchSuggestions(query: string, limit: number = 10): Promise<string[]> {
    if (!query || query.length < 2) return [];

    const searchTerm = `${query.trim()}%`;
    
    // Get suggestions from different fields
    const suggestions = await this.queryBuilder.selectAll<{ suggestion: string }>(`
      SELECT DISTINCT country as suggestion FROM locations 
      WHERE country LIKE ? 
      UNION
      SELECT DISTINCT meta_name as suggestion FROM locations 
      WHERE meta_name LIKE ? AND meta_name IS NOT NULL
      ORDER BY suggestion
      LIMIT ?
    `, [searchTerm, searchTerm, limit]);

    return suggestions
      .map(row => row.suggestion)
      .filter(s => s && s.toLowerCase().startsWith(query.toLowerCase()));
  }

  /**
   * Get popular search terms (most common locations)
   */
  async getPopularSearchTerms(limit: number = 20): Promise<{ term: string; count: number }[]> {
    const results = await this.queryBuilder.selectAll<{ term: string; count: number }>(`
      SELECT country as term, COUNT(*) as count
      FROM locations 
      WHERE country IS NOT NULL
      GROUP BY country
      ORDER BY count DESC, term ASC
      LIMIT ?
    `, [limit]);

    return results;
  }

  /**
   * Full-text search simulation using multiple LIKE queries
   * This is the closest we can get to FTS5 behavior with D1
   */
  async fullTextSearch<T = any>(
    searchTerms: string[], 
    options: { limit?: number; offset?: number } = {}
  ): Promise<SearchResult<T>> {
    const { limit = 50, offset = 0 } = options;
    
    if (searchTerms.length === 0) {
      return { results: [], total: 0, hasMore: false };
    }

    // Create LIKE conditions for each search term across multiple fields
    const conditions: string[] = [];
    const params: any[] = [];

    searchTerms.forEach(term => {
      const searchTerm = `%${term}%`;
      conditions.push(`(
        country LIKE ? OR 
        meta_name LIKE ? OR 
        note LIKE ? OR 
        footer LIKE ?
      )`);
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    });

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const mainSql = `
      SELECT l.* FROM locations l
      ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countSql = `
      SELECT COUNT(*) as count FROM locations l
      ${whereClause}
    `;

    const queryParams = [...params, limit, offset];

    const [results, countResult] = await Promise.all([
      this.queryBuilder.selectAll<T>(mainSql, queryParams),
      this.queryBuilder.selectFirst<{ count: number }>(countSql, params)
    ]);

    const total = countResult?.count || 0;
    const hasMore = offset + limit < total;

    return {
      results,
      total, 
      hasMore
    };
  }
}

/**
 * Create a search instance from D1 query builder
 */
export function createLocationSearcher(queryBuilder: D1QueryBuilder): LocationSearcher {
  return new LocationSearcher(queryBuilder);
}