import { Router, Request, Response } from 'express';
import { db } from '../lib/db.js';

interface StatRow {
  day: string;
  total: number;
  success: number;
}

const router = Router();

// GET /api/stats
router.get('/', async (req: Request, res: Response) => {
  try {
    const rows = db
      .prepare(
        `
        SELECT
          date(datetime(reviewed_at, 'unixepoch')) AS day,
          COUNT(*) AS total,
          SUM(CASE WHEN quality >= 3 THEN 1 ELSE 0 END) AS success
        FROM memorizer_reviews
        GROUP BY day
        ORDER BY day ASC
      `,
      )
      .all() as StatRow[];

    const data = rows.map(({ day, total, success }) => ({
      day,
      count: total,
      successRate: total > 0 ? success / total : 0,
    }));

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Stats API error:", error);
    res.status(500).json({
      error: "Failed to fetch statistics",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;