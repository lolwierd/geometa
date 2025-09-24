import { D1QueryBuilder, CloudflareEnv } from "@/lib/db-d1";
import { NextResponse } from "next/server";

// Runtime configuration for Cloudflare Edge
export const runtime = 'edge';

interface StatRow {
  day: string;
  total: number;
  success: number;
}

export async function GET(request: Request, context: any = {}) {
  try {
    // Get Cloudflare environment
    const env = context.env || (globalThis as any).process?.env;
    if (!env?.DB) {
      throw new Error('D1 database binding not found');
    }

    const queryBuilder = new D1QueryBuilder(env.DB);

    const rows = await queryBuilder.selectAll<StatRow>(
      `
      SELECT
        date(datetime(reviewed_at, 'unixepoch')) AS day,
        COUNT(*) AS total,
        SUM(CASE WHEN quality >= 3 THEN 1 ELSE 0 END) AS success
      FROM memorizer_reviews
      GROUP BY day
      ORDER BY day ASC
      `
    );

    const data = rows.map(({ day, total, success }) => ({
      day,
      count: total,
      successRate: total > 0 ? success / total : 0,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    // Check if it's a table not found error (common for new installations)
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