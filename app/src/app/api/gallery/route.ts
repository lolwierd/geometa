import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import { logger } from "@/lib/logger";
import { getCountriesByContinent, getContinent, Continent } from "@/lib/continents";

const db = new Database("db/geometa.db");

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country");
    const continent = searchParams.get("continent");
    const state = searchParams.get("state");
    const search = searchParams.get("q");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100); // Cap at 100
    const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0);

    logger.info("🔍 Gallery API request:", { country, continent, state, search, limit, offset });

    let query: string;
    let countQuery: string;
    const params: any[] = [];
    const countParams: any[] = [];

    // Use full-text search if search term provided
    if (search && search.trim()) {
      query = `
        SELECT l.* FROM locations l
        LEFT JOIN memorizer_progress mp ON l.id = mp.location_id
        JOIN locations_fts fts ON l.id = fts.rowid
        WHERE locations_fts MATCH ?
      `;
      countQuery = `
        SELECT COUNT(*) as total FROM locations l
        LEFT JOIN memorizer_progress mp ON l.id = mp.location_id
        JOIN locations_fts fts ON l.id = fts.rowid
        WHERE locations_fts MATCH ?
      `;

      // Escape FTS special characters and add wildcards
      const ftsQuery = search
        .trim()
        .replace(/['"*]/g, "")
        .split(/\s+/)
        .map((term) => `"${term}"*`)
        .join(" OR ");
      params.push(ftsQuery);
      countParams.push(ftsQuery);

      // Add country filter if specified
      if (country && country !== "all") {
        const countryList = country.split(',').filter(c => c.trim() !== '');
        if (countryList.length > 0) {
          const placeholders = countryList.map(() => '?').join(',');
          query += ` AND l.country IN (${placeholders})`;
          countQuery += ` AND l.country IN (${placeholders})`;
          params.push(...countryList);
          countParams.push(...countryList);
        }
      }

      // Add continent filter if specified
      if (continent && continent !== "all") {
        const continentList = continent.split(',').filter(c => c.trim() !== '');
        const continentCountries = Array.from(new Set(continentList.flatMap((c) => getCountriesByContinent(c as Continent))));
        if (continentCountries.length > 0) {
          const placeholders = continentCountries.map(() => '?').join(',');
          query += ` AND l.country IN (${placeholders})`;
          countQuery += ` AND l.country IN (${placeholders})`;
          params.push(...continentCountries);
          countParams.push(...continentCountries);
        }
      }
    } else {
      // Regular query without full-text search
      query = "SELECT l.* FROM locations l LEFT JOIN memorizer_progress mp ON l.id = mp.location_id WHERE 1=1";
      countQuery = "SELECT COUNT(*) as total FROM locations l LEFT JOIN memorizer_progress mp ON l.id = mp.location_id WHERE 1=1";

      // Country filter
      if (country && country !== "all") {
        const countryList = country.split(',').filter(c => c.trim() !== '');
        if (countryList.length > 0) {
          const placeholders = countryList.map(() => '?').join(',');
          query += ` AND country IN (${placeholders})`;
          countQuery += ` AND country IN (${placeholders})`;
          params.push(...countryList);
          countParams.push(...countryList);
        }
      }

      // Continent filter
      if (continent && continent !== "all") {
        const continentList = continent.split(',').filter(c => c.trim() !== '');
        const continentCountries = Array.from(new Set(continentList.flatMap((c) => getCountriesByContinent(c as Continent))));
        if (continentCountries.length > 0) {
          const placeholders = continentCountries.map(() => '?').join(',');
          query += ` AND country IN (${placeholders})`;
          countQuery += ` AND country IN (${placeholders})`;
          params.push(...continentCountries);
          countParams.push(...continentCountries);
        }
      }
    }

    // State filter
    if (state && state !== "all") {
      const stateList = state.split(',').filter((s) => s.trim() !== '');
      if (stateList.length > 0) {
        const placeholders = stateList.map(() => '?').join(',');
        query += ` AND mp.state IN (${placeholders})`;
        countQuery += ` AND mp.state IN (${placeholders})`;
        params.push(...stateList);
        countParams.push(...stateList);
      }
    }

    // Add ordering and pagination
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    // Execute main query
    const stmt = db.prepare(query);
    const locations = stmt.all(...params) as LocationRow[];

    // Execute count query
    const countStmt = db.prepare(countQuery);
    const { total } = countStmt.get(...countParams) as { total: number };

    // Process locations - parse JSON fields
    const processedLocations: ProcessedLocation[] = locations.map(
      (location) => ({
        ...location,
        images: safeJsonParse(location.images, []),
        raw_data: safeJsonParse(location.raw_data, {}),
      }),
    );

    // Get unique countries for filter dropdown
    const countriesStmt = db.prepare(
      "SELECT DISTINCT country FROM locations WHERE country IS NOT NULL ORDER BY country",
    );
    const countriesResult = countriesStmt.all() as { country: string }[];
    const countries = countriesResult.map((row) => row.country);
    const continents = Array.from(
      new Set(
        countries
          .map((c) => getContinent(c))
          .filter((c): c is Continent => Boolean(c)),
      ),
    ).sort();

    // Get unique memorizer states for filter dropdown
    const statesStmt = db.prepare(
      "SELECT DISTINCT state FROM memorizer_progress WHERE state IS NOT NULL ORDER BY state",
    );
    const statesResult = statesStmt.all() as { state: string }[];
    const states = statesResult.map((row) => row.state);

    // Get some stats
    const statsStmt = db.prepare(
      "SELECT COUNT(*) as total_locations, COUNT(DISTINCT country) as total_countries FROM locations",
    );
    const stats = statsStmt.get() as {
      total_locations: number;
      total_countries: number;
    };

    logger.info(
      `✅ Gallery API: Returning ${processedLocations.length}/${total} locations`,
    );

    return NextResponse.json({
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
        hasMore: offset + limit < total,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        country: country === "all" ? null : country?.split(','),
        continent: continent === "all" ? null : continent?.split(','),
        state: state === "all" ? null : state?.split(','),
        search: search || null,
      },
    });
  } catch (error) {
    logger.error("❌ Gallery API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch gallery data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Location ID is required" },
        { status: 400 },
      );
    }

    logger.info(`🗑️ Deleting location with ID: ${id}`);

    // Check if location exists
    const existingLocation = db
      .prepare("SELECT id, country, meta_name FROM locations WHERE id = ?")
      .get(id) as { id: number; country: string; meta_name: string | null } | undefined;

    if (!existingLocation) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 },
      );
    }

    // Delete the location
    const deleteStmt = db.prepare("DELETE FROM locations WHERE id = ?");
    const result = deleteStmt.run(id);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Failed to delete location" },
        { status: 500 },
      );
    }

    logger.info(
      `✅ Successfully deleted location: ${existingLocation.country} - ${existingLocation.meta_name || "Unknown"}`,
    );

    return NextResponse.json({
      success: true,
      message: "Location deleted successfully",
      deleted: existingLocation,
    });
  } catch (error) {
    logger.error("❌ Delete location error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete location",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Helper function to safely parse JSON with fallback
function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    if (!jsonString || jsonString.trim() === "") {
      return fallback;
    }
    const parsed = JSON.parse(jsonString);
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch (error) {
    logger.warn("Failed to parse JSON:", jsonString, error);
    return fallback;
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
