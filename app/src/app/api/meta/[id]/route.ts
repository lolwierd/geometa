import { D1QueryBuilder, CloudflareEnv } from "@/lib/db-d1";
import { NextRequest, NextResponse } from "next/server";

// Runtime configuration for Cloudflare Edge
export const runtime = 'edge';

interface Location {
  id: number;
  pano_id: string;
  map_id: string;
  country: string;
  country_code: string | null;
  meta_name: string | null;
  note: string | null;
  footer: string | null;
  images: string;
  raw_data: string;
  created_at: string;
  updated_at: string;
}

export async function GET(
  request: NextRequest,
  context: any,
) {
  try {
    // Get Cloudflare environment
    const env = context.env || (globalThis as any).process?.env;
    if (!env?.DB) {
      throw new Error('D1 database binding not found');
    }

    const queryBuilder = new D1QueryBuilder(env.DB);

    const { id: idParam } = await context.params;
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid ID" },
        { status: 400 },
      );
    }

    const location = await queryBuilder.selectFirst<Location>(
      "SELECT * FROM locations WHERE id = ?",
      [id]
    );

    if (!location) {
      return NextResponse.json(
        { success: false, message: "Location not found" },
        { status: 404 },
      );
    }

    // Parse JSON fields safely
    let parsedImages;
    try {
      parsedImages = JSON.parse(location.images || "[]");
    } catch (error) {
      console.error("Error parsing images JSON:", error);
      parsedImages = [];
    }

    let parsedRawData;
    try {
      parsedRawData = JSON.parse(location.raw_data || "{}");
    } catch (error) {
      console.error("Error parsing raw_data JSON:", error);
      parsedRawData = {};
    }

    return NextResponse.json({ 
      success: true, 
      location: {
        ...location,
        images: parsedImages,
        raw_data: parsedRawData
      }
    });
  } catch (error) {
    console.error("Error fetching location:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 },
    );
  }
}