import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface ScreenshotRow {
  id: number;
  image_path: string;
  metadata: string;
  country: string;
  created_at: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const country = searchParams.get('country');
    const q = searchParams.get('q');

    let query = 'SELECT id, image_path, metadata, country, created_at FROM screenshots';
    const params = [];

    const conditions = [];
    if (country) {
      conditions.push('country = ?');
      params.push(country);
    }
    if (q) {
      conditions.push("metadata LIKE ?");
      params.push(`%${q}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const stmt = db.prepare(query);
    const screenshots = stmt.all(...params) as ScreenshotRow[];

    const data = screenshots.map((ss) => ({
      ...ss,
      metadata: JSON.parse(ss.metadata),
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error('Gallery error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
