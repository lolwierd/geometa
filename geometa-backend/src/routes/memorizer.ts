import { Router, Request, Response } from 'express';
import { db } from '../lib/db.js';
import { calculateNextReview } from '../lib/memorizer.js';
import { getCountriesByContinent, getContinent, Continent } from '../lib/continents.js';
import { logger } from '../lib/logger.js';

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
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch (error) {
    return fallback;
  }
}

const router = Router();

// GET /api/memorizer - Get next card for review
router.get('/', async (req: Request, res: Response) => {
  try {
    const { country, continent } = req.query;

    // Build WHERE conditions
    const conditions: string[] = ["mp.due_date <= strftime('%s','now')"];
    const params: any[] = [];

    // Add country filter
    if (country && country !== "all" && typeof country === 'string') {
      const countryList = country.split(',').filter(c => c.trim() !== '');
      if (countryList.length > 0) {
        const placeholders = countryList.map(() => '?').join(',');
        conditions.push(`l.country IN (${placeholders})`);
        params.push(...countryList);
      }
    }

    // Add continent filter
    if (continent && continent !== "all" && typeof continent === 'string') {
      const continentList = continent.split(',').filter(c => c.trim() !== '');
      if (continentList.length > 0) {
        const continentCountries = continentList.flatMap(c => 
          getCountriesByContinent(c as Continent) || []
        );
        if (continentCountries.length > 0) {
          const placeholders = continentCountries.map(() => '?').join(',');
          conditions.push(`l.country IN (${placeholders})`);
          params.push(...continentCountries);
        }
      }
    }

    const whereClause = conditions.length > 1 ? `WHERE ${conditions.join(' AND ')}` : `WHERE ${conditions[0]}`;

    // Get next card due for review, prioritizing cards with lower ease_factor (harder cards)
    const stmt = db.prepare(`
      SELECT 
        l.*,
        mp.repetitions,
        mp.ease_factor,
        mp.interval,
        mp.due_date,
        mp.state,
        mp.lapses
      FROM locations l
      LEFT JOIN memorizer_progress mp ON l.id = mp.location_id
      ${whereClause}
      ORDER BY 
        CASE WHEN mp.state IS NULL THEN 0 ELSE 1 END,  -- New cards first
        mp.ease_factor ASC,  -- Harder cards (lower ease factor) next
        mp.due_date ASC       -- Earlier due dates next
      LIMIT 1
    `);

    const card = stmt.get(...params) as LocationRow | undefined;

    if (!card) {
      return res.json({
        success: true,
        message: "No cards due for review",
        card: null,
        progress: null,
      });
    }

    // Process the card data
    const processedCard = {
      ...card,
      images: safeJsonParse(card.images, []),
      raw_data: safeJsonParse(card.raw_data, {}),
    };

    // Initialize progress for new cards
    let progress = null;
    if (!card.repetitions && card.repetitions !== 0) {
      const initStmt = db.prepare(`
        INSERT INTO memorizer_progress (
          location_id, repetitions, ease_factor, interval, due_date, state, lapses
        ) VALUES (?, 0, 2.5, 0, strftime('%s','now'), 'new', 0)
        ON CONFLICT(location_id) DO UPDATE SET
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `);
      progress = initStmt.get(card.id);
    } else {
      progress = {
        repetitions: card.repetitions,
        ease_factor: card.ease_factor,
        interval: card.interval,
        due_date: card.due_date,
        state: card.state,
        lapses: card.lapses,
      };
    }

    res.json({
      success: true,
      message: "Card ready for review",
      card: processedCard,
      progress,
    });
  } catch (error) {
    logger.error("❌ Memorizer GET error:", error);
    res.status(500).json({
      error: "Failed to get next card",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// POST /api/memorizer/:id - Update progress after review
router.post('/:id', async (req: Request, res: Response) => {
  try {
    const locationId = parseInt(req.params.id, 10);
    const { quality } = req.body;

    if (isNaN(locationId)) {
      return res.status(400).json({ error: "Invalid location ID" });
    }

    if (typeof quality !== 'number' || quality < 0 || quality > 5) {
      return res.status(400).json({ error: "Quality must be a number between 0 and 5" });
    }

    // Get current progress
    const currentStmt = db.prepare(`
      SELECT * FROM memorizer_progress WHERE location_id = ?
    `);
    const current = currentStmt.get(locationId) as any;

    if (!current) {
      return res.status(404).json({ error: "Progress not found for this location" });
    }

    // Calculate next review based on quality
    const nextReview = calculateNextReview(
      quality,
      current.repetitions,
      current.ease_factor,
      current.interval,
      current.state,
      current.lapses
    );

    // Update progress
    const updateStmt = db.prepare(`
      UPDATE memorizer_progress 
      SET 
        repetitions = ?,
        ease_factor = ?,
        interval = ?,
        due_date = ?,
        state = ?,
        lapses = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE location_id = ?
      RETURNING *
    `);

    const updatedProgress = updateStmt.get(
      nextReview.repetitions,
      nextReview.easeFactor,
      nextReview.interval,
      Math.floor(Date.now() / 1000) + (nextReview.interval * 24 * 60 * 60), // Convert interval to Unix timestamp
      nextReview.state,
      nextReview.lapses,
      locationId
    );

    // Record the review
    const reviewStmt = db.prepare(`
      INSERT INTO memorizer_reviews (location_id, quality, reviewed_at)
      VALUES (?, ?, strftime('%s','now'))
    `);
    reviewStmt.run(locationId, quality);

    res.json({
      success: true,
      message: "Progress updated successfully",
      progress: updatedProgress,
      nextReview: nextReview,
    });
  } catch (error) {
    logger.error("❌ Memorizer POST error:", error);
    res.status(500).json({
      error: "Failed to update progress",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;