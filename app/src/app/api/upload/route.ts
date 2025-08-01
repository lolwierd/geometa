import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, metadata } = body;

    if (!image || !metadata) {
      return NextResponse.json({ error: 'Missing image or metadata' }, { status: 400 });
    }

    // Decode base64 image and save it
    const imageBuffer = Buffer.from(image, 'base64');
    const imageName = `${Date.now()}.png`;
    const imagePath = path.join(process.cwd(), 'public/uploads', imageName);
    await fs.writeFile(imagePath, imageBuffer);

    const imageDbPath = `/uploads/${imageName}`;

    // Save metadata to database
    const stmt = db.prepare(
      'INSERT INTO screenshots (image_path, metadata, country) VALUES (?, ?, ?)'
    );
    const info = stmt.run(imageDbPath, JSON.stringify(metadata), metadata.country);

    return NextResponse.json({ success: true, id: info.lastInsertRowid });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
