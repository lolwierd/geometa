import { db } from "@/lib/db";
import { NextResponse } from "next/server";

interface Progress {
  repetitions: number;
  ease_factor: number;
  interval: number;
}

// Simple SM-2 algorithm implementation
function calculateNextReview(
  quality: number,
  repetitions: number,
  easeFactor: number,
  interval: number,
) {
  // Learning phase for brand new cards: if a new card is marked hard,
  // show it again shortly instead of waiting a full day
  if (repetitions === 0 && quality < 3) {
    return {
      repetitions: 0,
      easeFactor,
      interval: 0,
      reviewDelayMinutes: 5,
    } as const;
  }

  if (quality < 3) {
    // Lapsed card: dramatically reduce the interval but don't reset to a single day
    return {
      repetitions: 0,
      easeFactor,
      interval: 7, // Revisit in about a week
    } as const;
  }

  let newRepetitions;
  let newEaseFactor;
  let newInterval;

  if (repetitions === 0) {
    newRepetitions = 1;
    newInterval = 1;
  } else if (repetitions === 1) {
    newRepetitions = 2;
    newInterval = 6;
  } else {
    newRepetitions = repetitions + 1;
    newInterval = Math.round(interval * easeFactor);
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
  } as const;
}

// GET: Fetch the next card to review
export async function GET() {
  try {
    // Prioritize cards that are due
    let nextCard = db
      .prepare(
        `
      SELECT l.id
      FROM locations l
      LEFT JOIN memorizer_progress mp ON l.id = mp.location_id
      WHERE mp.due_date <= CURRENT_TIMESTAMP OR mp.id IS NULL
      ORDER BY mp.due_date ASC, RANDOM()
      LIMIT 1
    `,
      )
      .get();

    // If no cards are due, just pick a random one that has been seen least
    if (!nextCard) {
      nextCard = db
        .prepare(
          `
        SELECT l.id
        FROM locations l
        LEFT JOIN memorizer_progress mp ON l.id = mp.location_id
        ORDER BY mp.repetitions ASC, RANDOM()
        LIMIT 1
      `,
        )
        .get();
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
          SUM(CASE WHEN mp.id IS NULL OR (mp.repetitions = 0 AND mp.due_date <= CURRENT_TIMESTAMP) THEN 1 ELSE 0 END) AS new_due,
          SUM(CASE WHEN mp.repetitions > 0 AND mp.due_date <= CURRENT_TIMESTAMP THEN 1 ELSE 0 END) AS review_due
        FROM locations l
        LEFT JOIN memorizer_progress mp ON l.id = mp.location_id
      `,
      )
      .get() as { new_due: number; review_due: number };

    return NextResponse.json({
      success: true,
      locationId: (nextCard as any).id,
      stats: { new: counts.new_due ?? 0, review: counts.review_due ?? 0 },
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

    if (!locationId || quality === undefined || quality < 0 || quality > 5) {
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

    const { repetitions, easeFactor, interval, reviewDelayMinutes } = calculateNextReview(
      quality,
      progress.repetitions,
      progress.ease_factor,
      progress.interval,
    );

    const dueDate = new Date();
    if (reviewDelayMinutes) {
      dueDate.setMinutes(dueDate.getMinutes() + reviewDelayMinutes);
    } else {
      dueDate.setDate(dueDate.getDate() + interval);
    }

    db.prepare(
      `
      UPDATE memorizer_progress
      SET
        repetitions = ?,
        ease_factor = ?,
        "interval" = ?,
        due_date = ?
      WHERE location_id = ?
    `,
    ).run(repetitions, easeFactor, interval, dueDate.toISOString(), locationId);

    return NextResponse.json({ success: true, message: "Progress updated" });
  } catch (error) {
    console.error("Error updating progress:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
