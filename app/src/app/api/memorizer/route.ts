import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// Simple SM-2 algorithm implementation
function calculateNextReview(
  quality: number,
  repetitions: number,
  easeFactor: number,
  interval: number,
) {
  if (quality < 3) {
    // Failed recall, reset repetitions and interval
    return {
      repetitions: 0,
      easeFactor,
      interval: 1, // Show again tomorrow
    };
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

  newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEaseFactor < 1.3) {
    newEaseFactor = 1.3;
  }

  return {
    repetitions: newRepetitions,
    easeFactor: newEaseFactor,
    interval: newInterval,
  };
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

    return NextResponse.json({ success: true, locationId: nextCard.id });
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
      .get(locationId);

    if (!progress) {
        db.prepare("INSERT INTO memorizer_progress (location_id) VALUES (?)").run(locationId);
        progress = db.prepare("SELECT * FROM memorizer_progress WHERE location_id = ?").get(locationId);
    }


    const {
      repetitions,
      easeFactor,
      interval,
    } = calculateNextReview(
      quality,
      progress.repetitions,
      progress.ease_factor,
      progress.interval,
    );

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + interval);

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
    ).run(
      repetitions,
      easeFactor,
      interval,
      dueDate.toISOString(),
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
