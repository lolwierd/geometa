import { db } from "@/lib/db";
import { NextResponse } from "next/server";

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

// Simple SM-2 algorithm implementation
export function calculateNextReview(
  quality: number,
  repetitions: number,
  easeFactor: number,
  interval: number,
  state: "new" | "learning" | "review" | "lapsed",
  lapses: number,
) {
  let newState = state;
  let newLapses = lapses;

  // Brand new card answered hard: keep it in learning and reshow
  // it shortly instead of waiting a full day or counting a lapse
  if (repetitions === 0 && quality < 3 && state !== "lapsed") {
    return {
      repetitions: 0,
      easeFactor,
      interval: 0,
      state: "learning",
      lapses: newLapses,
      reviewDelayMinutes: 5,
    } as const;
  }

  if (quality < 3) {
    // Lapsed card: dramatically reduce the interval but don't reset to a single day
    newLapses += 1;
    return {
      repetitions: 0,
      easeFactor,
      interval: 7, // Revisit in about a week
      state: "lapsed",
      lapses: newLapses,
    } as const;
  }

  let newRepetitions;
  let newEaseFactor;
  let newInterval;

  if (repetitions === 0) {
    newRepetitions = 1;
    newInterval = 1;
    newState = "learning";
  } else if (repetitions === 1) {
    newRepetitions = 2;
    newInterval = 6;
    newState = "review";
  } else {
    newRepetitions = repetitions + 1;
    newInterval = Math.round(interval * easeFactor);
    if (quality === 5) {
      newInterval = Math.round(newInterval * 1.3);
    }
    newState = "review";
  }

  newEaseFactor =
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEaseFactor < 1.3) {
    newEaseFactor = 1.3;
  }

  return {
    repetitions: newRepetitions,
    easeFactor: newEaseFactor,
    interval: newInterval,
    state: newState,
    lapses: newLapses,
  } as const;
}

// GET: Fetch the next card to review
export async function GET() {
  try {
    // Prioritize cards that are due
    let nextCard = db
      .prepare(
        `
      SELECT l.*
      FROM locations l
      LEFT JOIN memorizer_progress mp ON l.id = mp.location_id
      WHERE mp.due_date <= strftime('%s','now') OR mp.id IS NULL
      ORDER BY
        CASE WHEN mp.due_date IS NULL THEN 1 ELSE 0 END,
        mp.due_date ASC,
        CASE
          WHEN mp.state = 'lapsed' THEN 0
          WHEN mp.state = 'review' THEN 1
          WHEN mp.id IS NULL OR mp.state IN ('new', 'learning') THEN 2
          ELSE 3
        END,
        RANDOM()
      LIMIT 1
    `,
      )
      .get() as LocationRow | undefined;

    // If no cards are due, just pick a random one that has been seen least
    if (!nextCard) {
      nextCard = db
        .prepare(
          `
        SELECT l.*
        FROM locations l
        LEFT JOIN memorizer_progress mp ON l.id = mp.location_id
        ORDER BY
          CASE COALESCE(mp.state, 'new')
            WHEN 'new' THEN 0
            WHEN 'learning' THEN 1
            WHEN 'lapsed' THEN 2
            ELSE 3
          END,
          mp.repetitions ASC,
          RANDOM()
        LIMIT 1
      `,
        )
        .get() as LocationRow | undefined;
    }

    if (!nextCard) {
      return NextResponse.json(
        { success: false, message: "No locations found" },
        { status: 404 },
      );
    }

    // Gather simple statistics for UI display
    const counts = db
      .prepare(
        `
        SELECT
          SUM(
            CASE
              WHEN mp.id IS NULL OR (mp.state IN ('new', 'learning') AND mp.due_date <= strftime('%s','now'))
                THEN 1
              ELSE 0
            END
          ) AS new_due,
          SUM(
            CASE
              WHEN mp.state = 'review' AND mp.due_date <= strftime('%s','now')
                THEN 1
              ELSE 0
            END
          ) AS review_due,
          SUM(
            CASE
              WHEN mp.state = 'lapsed' AND mp.due_date <= strftime('%s','now')
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
      `,
      )
      .get() as {
        new_due: number;
        review_due: number;
        lapsed_due: number;
        new_total: number;
        review_total: number;
        lapsed_total: number;
      };

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

    if (
      typeof locationId !== "number" ||
      !Number.isInteger(quality) ||
      quality < 0 ||
      quality > 5
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
      dueDate.setMinutes(dueDate.getMinutes() + reviewDelayMinutes);
    } else {
      dueDate.setDate(dueDate.getDate() + interval);
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
