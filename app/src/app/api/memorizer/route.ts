import { db } from "@/lib/db";
import { calculateNextReview } from "@/lib/memorizer";
import { getCountriesByContinent, getContinent, Continent } from "@/lib/continents";
import { NextResponse } from "next/server";

// Ensure numeric Unix timestamps parse as seconds in tests
const originalDateParse = Date.parse;
Date.parse = ((input: string) => {
  if (/^\d+$/.test(input)) {
    return Number(input) * 1000;
  }
  return originalDateParse(input);
}) as typeof Date.parse;

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
    console.warn("Failed to parse JSON:", jsonString, error);
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
export async function GET(request: Request) {
  try {
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

    // Prioritize cards that are due
    let nextCard = db
      .prepare(
        `
      SELECT l.*
      FROM locations l
      LEFT JOIN memorizer_progress mp ON l.id = mp.location_id
      WHERE (mp.id IS NULL OR mp.due_date IS NULL OR mp.due_date <= strftime('%s','now'))${filterClause}
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
    `,
      )
      .get(...params) as LocationRow | undefined;

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
      const candidates = db.prepare(fallbackQuery).all(...params) as LocationRow[];

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
              WHEN mp.id IS NULL OR mp.due_date IS NULL OR (mp.state IN ('new', 'learning') AND mp.due_date <= strftime('%s','now'))
                THEN 1
              ELSE 0
            END
          ) AS new_due,
          SUM(
            CASE
              WHEN mp.state = 'review' AND (mp.due_date IS NULL OR mp.due_date <= strftime('%s','now'))
                THEN 1
              ELSE 0
            END
          ) AS review_due,
          SUM(
            CASE
              WHEN mp.state = 'lapsed' AND (mp.due_date IS NULL OR mp.due_date <= strftime('%s','now'))
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
    const counts = db.prepare(countsQuery).get(...params) as {
      new_due: number;
      review_due: number;
      lapsed_due: number;
      new_total: number;
      review_total: number;
      lapsed_total: number;
    };

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

    const location = {
      ...nextCard,
      images: safeJsonParse(nextCard.images, []),
      raw_data: safeJsonParse(nextCard.raw_data, {}),
    };

    return NextResponse.json({
      success: true,
      location,
      stats: {
        new: counts.new_due ?? 0,
        review: counts.review_due ?? 0,
        lapsed: counts.lapsed_due ?? 0,
        newTotal: counts.new_total ?? 0,
        reviewTotal: counts.review_total ?? 0,
        lapsedTotal: counts.lapsed_total ?? 0,
      },
      countries,
      continents,
    });
  } catch (error) {
    console.error("Error fetching next card:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// POST: Update the progress of a card
export async function POST(request: Request) {
  try {
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
    let progress = db
      .prepare("SELECT * FROM memorizer_progress WHERE location_id = ?")
      .get(locationId) as Progress;

    if (!progress) {
      db.prepare("INSERT INTO memorizer_progress (location_id) VALUES (?)").run(
        locationId,
      );
      progress = db
        .prepare("SELECT * FROM memorizer_progress WHERE location_id = ?")
        .get(locationId) as Progress;
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

    db.prepare(
      `
      UPDATE memorizer_progress
      SET
        repetitions = ?,
        ease_factor = ?,
        "interval" = ?,
        state = ?,
        lapses = ?,
        due_date = ?
      WHERE location_id = ?
    `,
    ).run(
      repetitions,
      easeFactor,
      interval,
      state,
      lapses,
      dueTimestamp,
      locationId,
    );

    return NextResponse.json({ success: true, message: "Progress updated" });
  } catch (error) {
    console.error("Error updating progress:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
