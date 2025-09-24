import { Router, Request, Response } from 'express';
import { db } from '../lib/db.js';

const router = Router();

// Helper function to safely parse JSON with fallback
function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    if (!jsonString || jsonString.trim() === "") {
      return fallback;
    }
    const parsed = JSON.parse(jsonString);
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch (error) {
    console.error("Error fetching location:", error);
    return fallback;
  }
}

// GET /api/meta/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid location ID" });
    }

    const stmt = db.prepare("SELECT * FROM locations WHERE id = ?");
    const location = stmt.get(id) as any;

    if (!location) {
      return res.status(404).json({ error: "Location not found" });
    }

    // Parse JSON fields
    const processedLocation = {
      ...location,
      images: safeJsonParse(location.images, []),
      raw_data: safeJsonParse(location.raw_data, {}),
    };

    res.json({
      success: true,
      location: processedLocation,
    });
  } catch (error) {
    console.error("Meta API error:", error);
    res.status(500).json({
      error: "Failed to fetch location",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;