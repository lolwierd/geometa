import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

interface Location {
  images: any;
  raw_data: any;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await context.params;
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid ID" },
        { status: 400 },
      );
    }

    const location = db
      .prepare("SELECT * FROM locations WHERE id = ?")
      .get(id) as Location;

    if (!location) {
      return NextResponse.json(
        { success: false, message: "Location not found" },
        { status: 404 },
      );
    }

    // The 'images' and 'raw_data' fields are stored as JSON strings
    location.images = JSON.parse(location.images || "[]");
    location.raw_data = JSON.parse(location.raw_data || "{}");

    return NextResponse.json({ success: true, location });
  } catch (error) {
    console.error("Error fetching location:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
