import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getCountriesByContinent, getContinent, Continent } from "@/lib/continents";
import { D1QueryBuilder, CloudflareEnv } from "@/lib/db-d1";
import { LocationSearcher, createLocationSearcher } from "@/lib/search-d1";

// Runtime configuration for Cloudflare Edge
export const runtime = 'edge';

interface LocationRow {
  id: number;
  pano_id: string;
  map_id: string;
  country: string;
  country_code: string | null;
  meta_name: string | null;
  note: string | null;
  footer: string | null;
  images: string;
  raw_data: string;
  created_at: string;
  updated_at: string;
}

interface ProcessedLocation extends Omit<LocationRow, "images" | "raw_data"> {
  images: string[];
  raw_data: Record<string, any>;
}

export async function GET(request: NextRequest, context: any) {
  try {
    // Enhanced debugging for Cloudflare environment
    console.log('🔍 D1 Gallery API - Environment check:', {
      hasContext: !!context,
      contextKeys: context ? Object.keys(context) : [],
      hasEnv: !!(context && context.env),
      envKeys: context && context.env ? Object.keys(context.env) : [],
      hasDB: !!(context && context.env && context.env.DB),
      globalProcess: !!(globalThis as any).process,
      processEnv: (globalThis as any).process ? Object.keys((globalThis as any).process.env || {}) : []
    });

    // Get Cloudflare environment (D1 database binding)
    const env = context?.env || (globalThis as any).process?.env;
    
    if (!env) {
      console.error('❌ No environment found in context or global');
      throw new Error('Environment not available');
    }
    
    if (!env.DB) {
      console.error('❌ D1 database binding not found in env:', Object.keys(env));
      throw new Error('D1 database binding not found. Check wrangler.toml configuration.');
    }

    console.log('✅ D1 database binding found, initializing query builder');

    // Initialize D1 query builder with enhanced error handling
    const queryBuilder = new D1QueryBuilder(env.DB);
    const searcher = createLocationSearcher(queryBuilder);

    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country");
    const continent = searchParams.get("continent");
    const state = searchParams.get("state");
    const search = searchParams.get("q");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0);

    logger.info("🔍 Gallery API request (D1):", { country, continent, state, search, limit, offset });

    // Use the new search functionality with enhanced error handling
    console.log('🔍 Starting location search...');
    const searchResult = await searcher.searchLocations<LocationRow>({
      query: search || undefined,
      country: country || undefined,
      continent: continent || undefined,
      state: state || undefined,
      limit,
      offset
    });

    const { results: locations, total, hasMore } = searchResult;
    console.log(`✅ Search completed: ${locations.length} results, ${total} total`);

    // Process JSON fields (same as original)
    const processedLocations: ProcessedLocation[] = locations.map((location) => ({
      ...location,
      images: safeJsonParse(location.images, []),
      raw_data: safeJsonParse(location.raw_data, {}),
    }));

    console.log('🔍 Getting metadata for filters...');

    // Get metadata for filters (countries, continents, states)
    const [countriesResult, statesResult] = await Promise.all([
      queryBuilder.selectAll<{ country: string; count: number }>(`
        SELECT country, COUNT(*) as count 
        FROM locations 
        WHERE country IS NOT NULL 
        GROUP BY country 
        ORDER BY count DESC, country ASC
      `),
      queryBuilder.selectAll<{ state: string; count: number }>(`
        SELECT state, COUNT(*) as count 
        FROM memorizer_progress 
        WHERE state IS NOT NULL 
        GROUP BY state 
        ORDER BY state ASC
      `)
    ]);

    console.log(`✅ Metadata queries completed: ${countriesResult.length} countries, ${statesResult.length} states`);

    // Build countries array (simple string array to match SQLite API)
    const countries = countriesResult.map(row => row.country);

    // Build states array (memorizer progress states: new, review, lapsed)
    const states = statesResult.map(row => row.state);

    // Build continents from countries (using existing continent mapping)
    const continentCounts: Record<Continent, number> = {} as Record<Continent, number>;

    countries.forEach((countryName) => {
      const continent = getContinent(countryName);
      if (continent) {
        continentCounts[continent] = (continentCounts[continent] || 0) + 1;
      }
    });

    // Convert to simple string array to match SQLite API
    const continents = Object.keys(continentCounts).sort() as Continent[];

    console.log('🔍 Getting overall stats...');

    // Get overall stats
    const statsResult = await queryBuilder.selectFirst<{ 
      total_locations: number; 
      total_countries: number; 
      total_loaded: number;
    }>(`
      SELECT 
        COUNT(*) as total_locations,
        COUNT(DISTINCT country) as total_countries,
        COUNT(CASE WHEN images != '[]' THEN 1 END) as total_loaded
      FROM locations
    `);

    console.log('✅ Stats query completed:', statsResult);

    // Keep original stats format to match SQLite API
    const stats = {
      total_locations: statsResult?.total_locations || 0,
      total_countries: statsResult?.total_countries || 0,
    };

    logger.info(`✅ Gallery API (D1): Returning ${locations.length}/${total} locations`);

    const response = {
      success: true,
      locations: processedLocations,
      total,
      countries,
      continents,
      states,
      stats,
      pagination: {
        limit,
        offset,
        hasMore: hasMore,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        country: country === "all" ? null : country?.split(','),
        continent: continent === "all" ? null : continent?.split(','),
        state: state === "all" ? null : state?.split(','),
        search: search || null,
      },
    };

    console.log('✅ D1 Gallery API response prepared successfully');
    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ Gallery API (D1) error:", error);
    logger.error("❌ Gallery API (D1) error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch gallery data",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, context: any) {
  try {
    // Get Cloudflare environment
    const env = context.env || (globalThis as any).process?.env;
    if (!env?.DB) {
      throw new Error('D1 database binding not found');
    }

    const queryBuilder = new D1QueryBuilder(env.DB);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Missing location ID" },
        { status: 400 }
      );
    }

    const locationId = parseInt(id, 10);
    if (isNaN(locationId)) {
      return NextResponse.json(
        { success: false, message: "Invalid location ID" },
        { status: 400 }
      );
    }

    // Check if location exists
    const existingLocation = await queryBuilder.selectFirst<{ id: number }>(
      "SELECT id FROM locations WHERE id = ?",
      [locationId]
    );

    if (!existingLocation) {
      return NextResponse.json(
        { success: false, message: "Location not found" },
        { status: 404 }
      );
    }

    // Delete the location (CASCADE will handle related records)
    await queryBuilder.run("DELETE FROM locations WHERE id = ?", [locationId]);

    logger.info(`🗑️ Deleted location ${locationId}`);

    return NextResponse.json({
      success: true,
      message: "Location deleted successfully",
    });

  } catch (error) {
    logger.error("❌ Delete location error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete location",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Helper function to safely parse JSON with fallback (same as original)
function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    logger.error(`Failed to parse JSON: ${jsonString}`, error);
    return fallback;
  }
}

// Handle OPTIONS requests for CORS (same as original)
export async function OPTIONS() {
  return NextResponse.json(
    { success: true },
    {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    }
  );
}