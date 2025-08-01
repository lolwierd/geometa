import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import fs from 'fs/promises';

interface ScreenshotRow {
  image_path: string;
}
import path from 'path';

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing screenshot ID' }, { status: 400 });
    }

    // Get the screenshot to find the image path
    const stmt = db.prepare('SELECT image_path FROM screenshots WHERE id = ?');
    const screenshot = stmt.get(id) as ScreenshotRow | undefined;

    if (!screenshot) {
      return NextResponse.json({ error: 'Screenshot not found' }, { status: 404 });
    }

    // Delete the image file
    try {
      const imagePath = path.join(process.cwd(), 'public', screenshot.image_path);
      await fs.unlink(imagePath);
    } catch (fileError) {
      console.warn('Failed to delete image file:', fileError);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    const deleteStmt = db.prepare('DELETE FROM screenshots WHERE id = ?');
    const result = deleteStmt.run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Failed to delete screenshot' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Screenshot deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
