import { D1QueryBuilder, CloudflareEnv } from "@/lib/db-d1";
import { calculateNextReview } from "@/lib/memorizer";
import { getCountriesByContinent, getContinent, Continent } from "@/lib/continents";
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

// Runtime configuration for Cloudflare Edge
export const runtime = 'edge';

// Note: Date.parse override not needed for D1 since we handle timestamps differently

interface LocationRow {
  id: number;
  images: string;
  raw_data: string;
  [key: string]: any;
}

function safeJsonParse<T>(jsonString: string | null, fallback: T): T {
  try {
    if (!jsonString || jsonString.trim() === "") {
      return fallback;
    }
    const parsed = JSON.parse(jsonString);
    return parsed ?? fallback;
  } catch (error) {
    logger.warn("Failed to parse JSON:", jsonString, error);
    return fallback;
  }
}

interface Progress {
  repetitions: number;
  ease_factor: number;
  interval: number;
  state: "new" | "learning" | "review" | "lapsed";
  lapses: number;
}

// GET: Fetch the next card to review
export async function GET(request: Request, context: any = {}) {
  try {
    // Get Cloudflare environment
    const env = context.env || (globalThis as any).process?.env;
    if (!env?.DB) {
      throw new Error('D1 database binding not found');
    }

    const queryBuilder = new D1QueryBuilder(env.DB);

    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country");
    const continent = searchParams.get("continent");

    let filterClause = "";
    const params: string[] = [];

    if (country && country !== "all") {
      const countryList = country.split(",").filter((c) => c.trim() !== "");
      if (countryList.length > 0) {
        const placeholders = countryList.map(() => "?").join(",");
        filterClause += ` AND l.country IN (${placeholders})`;
        params.push(...countryList);
      }
    }

    if (continent && continent !== "all") {
      const continentList = continent.split(",").filter((c) => c.trim() !== "");
      const continentCountries = Array.from(
        new Set(
          continentList.flatMap((c) =>
            getCountriesByContinent(c as Continent),
          ),
        ),
      );
      if (continentCountries.length > 0) {
        const placeholders = continentCountries.map(() => "?").join(",");
        filterClause += ` AND l.country IN (${placeholders})`;
        params.push(...continentCountries);
      }
    }

    // Get current timestamp for comparison
    const currentTimestamp = Math.floor(Date.now() / 1000);

    // Prioritize cards that are due
    const dueSql = `
      SELECT l.*
      FROM locations l
      LEFT JOIN memorizer_progress mp ON l.id = mp.location_id
      WHERE (mp.id IS NULL OR mp.due_date IS NULL OR mp.due_date <= ?)${filterClause}
      ORDER BY
        CASE WHEN mp.due_date IS NULL THEN 1 ELSE 0 END,
        mp.due_date ASC,
        CASE
          WHEN mp.state = 'lapsed' THEN 0
          WHEN mp.state = 'review' THEN 1
          WHEN mp.id IS NULL OR mp.state IN ('new', 'learning') THEN 2
          ELSE 3
        END,
        l.id ASC
      LIMIT 1
    `;

    let nextCard = await queryBuilder.selectFirst<LocationRow>(
      dueSql,
      [currentTimestamp, ...params]
    );

    // If no cards are due, just pick a random one that has been seen least
    if (!nextCard) {
      const fallbackQuery = `
        SELECT l.*
        FROM locations l
        LEFT JOIN memorizer_progress mp ON l.id = mp.location_id
        WHERE 1=1${filterClause}
        ORDER BY
          CASE COALESCE(mp.state, 'new')
            WHEN 'new' THEN 0
            WHEN 'learning' THEN 1
            WHEN 'lapsed' THEN 2
            ELSE 3
          END,
          mp.repetitions ASC,
          l.id ASC
        LIMIT 10
      `;
      const candidates = await queryBuilder.selectAll<LocationRow>(fallbackQuery, params);

      if (candidates.length > 0) {
        nextCard = candidates[Math.floor(Math.random() * candidates.length)];
      }
    }

    if (!nextCard) {
      return NextResponse.json(
        { success: false, message: "No locations found" },
        { status: 404 },
      );
    }

    // Gather simple statistics for UI display
    const countsQuery = `
        SELECT
          SUM(
            CASE
              WHEN mp.id IS NULL OR mp.due_date IS NULL OR (mp.state IN ('new', 'learning') AND mp.due_date <= ?)
                THEN 1
              ELSE 0
            END
          ) AS new_due,
          SUM(
            CASE
              WHEN mp.state = 'review' AND (mp.due_date IS NULL OR mp.due_date <= ?)
                THEN 1
              ELSE 0
            END
          ) AS review_due,
          SUM(
            CASE
              WHEN mp.state = 'lapsed' AND (mp.due_date IS NULL OR mp.due_date <= ?)
                THEN 1
              ELSE 0
            END
          ) AS lapsed_due,
          SUM(
            CASE
              WHEN mp.id IS NULL OR mp.state IN ('new', 'learning') THEN 1
              ELSE 0
            END
          ) AS new_total,
          SUM(
            CASE
              WHEN mp.state = 'review' THEN 1
              ELSE 0
            END
          ) AS review_total,
          SUM(
            CASE
              WHEN mp.state = 'lapsed' THEN 1
              ELSE 0
            END
          ) AS lapsed_total
        FROM locations l
        LEFT JOIN memorizer_progress mp ON l.id = mp.location_id
        WHERE 1=1${filterClause}
      `;
    
    const counts = await queryBuilder.selectFirst<{
      new_due: number;
      review_due: number;
      lapsed_due: number;
      new_total: number;
      review_total: number;
      lapsed_total: number;
    }>(countsQuery, [currentTimestamp, currentTimestamp, currentTimestamp, ...params]);

    const countriesResult = await queryBuilder.selectAll<{ country: string }>(
      "SELECT DISTINCT country FROM locations WHERE country IS NOT NULL ORDER BY country"
    );
    
    const countries = countriesResult.map((row) => row.country);
    const continents = Array.from(
      new Set(
        countries
          .map((c) => getContinent(c))
          .filter((c): c is Continent => Boolean(c)),
      ),
    ).sort();

    const location = {
      ...nextCard,
      images: safeJsonParse(nextCard.images, []),
      raw_data: safeJsonParse(nextCard.raw_data, {}),
    };

    return NextResponse.json({
      success: true,
      location,
      stats: {
        new: counts?.new_due ?? 0,
        review: counts?.review_due ?? 0,
        lapsed: counts?.lapsed_due ?? 0,
        newTotal: counts?.new_total ?? 0,
        reviewTotal: counts?.review_total ?? 0,
        lapsedTotal: counts?.lapsed_total ?? 0,
      },
      countries,
      continents,
    });
  } catch (error) {
    logger.error("Error fetching next card:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// POST: Update the progress of a card
export async function POST(request: Request, context: any = {}) {
  try {
    // Get Cloudflare environment
    const env = context.env || (globalThis as any).process?.env;
    if (!env?.DB) {
      throw new Error('D1 database binding not found');
    }

    const queryBuilder = new D1QueryBuilder(env.DB);

    const { locationId, quality } = await request.json();

    const allowedQualities = new Set([0, 1, 2, 3, 4, 5]);
    if (
      typeof locationId !== "number" ||
      !Number.isInteger(quality) ||
      !allowedQualities.has(quality)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid input" },
        { status: 400 },
      );
    }

    // Get current progress or initialize a new one
    let progress = await queryBuilder.selectFirst<Progress>(
      "SELECT * FROM memorizer_progress WHERE location_id = ?",
      [locationId]
    );

    if (!progress) {
      // Insert new progress record with current timestamp
      const currentTime = new Date().toISOString();
      const currentTimestamp = Math.floor(Date.now() / 1000);
      
      await queryBuilder.run(
        `INSERT INTO memorizer_progress 
         (location_id, repetitions, ease_factor, "interval", due_date, state, lapses, created_at, updated_at) 
         VALUES (?, 0, 2.5, 0, ?, 'new', 0, ?, ?)`,
        [locationId, currentTimestamp, currentTime, currentTime]
      );
      
      progress = await queryBuilder.selectFirst<Progress>(
        "SELECT * FROM memorizer_progress WHERE location_id = ?",
        [locationId]
      );
    }

    if (!progress) {
      throw new Error("Failed to create or retrieve progress record");
    }

    const {
      repetitions,
      easeFactor,
      interval,
      state,
      lapses,
      reviewDelayMinutes,
    } = calculateNextReview(
      quality,
      progress.repetitions,
      progress.ease_factor,
      progress.interval,
      progress.state,
      progress.lapses,
    );

    const dueDate = new Date();
    if (reviewDelayMinutes) {
      dueDate.setUTCMinutes(dueDate.getUTCMinutes() + reviewDelayMinutes);
    } else {
      dueDate.setUTCDate(dueDate.getUTCDate() + interval);
    }
    const dueTimestamp = Math.floor(dueDate.getTime() / 1000);

    // Update progress with new values and updated_at timestamp
    const currentTime = new Date().toISOString();
    await queryBuilder.run(
      `UPDATE memorizer_progress
       SET repetitions = ?, ease_factor = ?, "interval" = ?, 
           state = ?, lapses = ?, due_date = ?, updated_at = ?
       WHERE location_id = ?`,
      [repetitions, easeFactor, interval, state, lapses, dueTimestamp, currentTime, locationId]
    );

    // Also record the review in memorizer_reviews table if it exists
    try {
      const reviewTimestamp = Math.floor(Date.now() / 1000);
      await queryBuilder.run(
        `INSERT INTO memorizer_reviews (location_id, quality, reviewed_at, created_at)
         VALUES (?, ?, ?, ?)`,
        [locationId, quality, reviewTimestamp, currentTime]
      );
    } catch (error) {
      // Memorizer reviews table might not exist, that's okay
      logger.warn("Could not insert review record:", error);
    }

    return NextResponse.json({ success: true, message: "Progress updated" });
  } catch (error) {
    logger.error("Error updating progress:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 },
    );
  }
}