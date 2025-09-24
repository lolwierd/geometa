import { db } from "@/lib/db";
import { NextResponse } from "next/server";

interface StatRow {
  day: string;
  total: number;
  success: number;
}

export async function GET() {
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

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (
      error instanceof Error &&
      /no such table/i.test(error.message)
    ) {
      return NextResponse.json({ success: true, data: [] });
    }
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 },
    );
  }
}

