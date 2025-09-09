import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCountryCode } from "@/lib/countryCodes";
import { logger } from "@/lib/logger";

async function fetchLearnableMetaData(panoId, mapId, source = "userscript") {
  const params = new URLSearchParams({
    panoId,
    mapId,
    userscriptVersion: "0.88", // Current version from the original userscript
    source,
  });

  const url = `https://learnablemeta.com/api/userscript/location?${params}`;

  logger.info(`🔄 Fetching meta data from LearnableMeta API: ${url}`);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "GeoMetaGallery/2.0",
        Accept: "application/json",
      },
      timeout: 10000, // 10 second timeout
    });

    logger.info(
      `📡 LearnableMeta API response: ${response.status} ${response.statusText}`,
    );

    if (response.status === 404) {
      return {
        error: "Meta for this location not found",
        notFound: true,
        status: 404,
      };
    }

    if (!response.ok) {
      throw new Error(
        `LearnableMeta API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    logger.info(
      `✅ Successfully fetched meta data for ${data.country || "unknown country"}`,
    );

    return data;
  } catch (error) {
    logger.error("❌ Failed to fetch from LearnableMeta API:", error);

    if (error.name === "AbortError" || error.message.includes("timeout")) {
      throw new Error("Request to LearnableMeta API timed out");
    }

    throw error;
  }
}


export async function POST(request) {
  try {
    logger.info("🎯 New collect request received");

    const requestBody = await request.json();
    const { panoId, mapId, roundNumber = 1, source = "map" } = requestBody;

    logger.info("📋 Request data:", { panoId, mapId, roundNumber, source });

    // Validate required fields
    if (!panoId || !mapId) {
      logger.info("❌ Missing required fields");
      return NextResponse.json(
        { error: "panoId and mapId are required" },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        },
      );
    }



    // Fetch meta data from LearnableMeta API
    const metaData = await fetchLearnableMetaData(panoId, mapId, source);

    if (metaData.error) {
      logger.info(`⚠️ LearnableMeta API returned error: ${metaData.error}`);
      return NextResponse.json(metaData, {
        status: metaData.status || (metaData.notFound ? 404 : 500),
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }



    // Extract and validate country code for flag display
    const countryCode = getCountryCode(metaData.country);

    logger.info(`🏁 Processed country: ${metaData.country} → ${countryCode}`);

    // Prepare data for database insertion
    const locationData = {
      pano_id: panoId,
      map_id: mapId,
      country: metaData.country || "Unknown",
      country_code: countryCode,
      meta_name: metaData.metaName || null,
      note: metaData.note || null,
      footer: metaData.footer || null,
      images: JSON.stringify(metaData.images || []),
      raw_data: JSON.stringify(metaData),
    };

    // Insert into database (ignore duplicate raw_data)
    const insertStmt = db.prepare(`
      INSERT INTO locations (
        pano_id, map_id, country, country_code, meta_name,
        note, footer, images, raw_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(raw_data) DO NOTHING
    `);

    const insertInfo = insertStmt.run(
      locationData.pano_id,
      locationData.map_id,
      locationData.country,
      locationData.country_code,
      locationData.meta_name,
      locationData.note,
      locationData.footer,
      locationData.images,
      locationData.raw_data,
    );

    let newLocation;
    let message;

    if (insertInfo.changes === 0) {
      logger.info("ℹ️ Location already exists in database (ON CONFLICT)");
      newLocation = db
        .prepare("SELECT * FROM locations WHERE raw_data = ?")
        .get(locationData.raw_data);
      message = "Location already exists";
    } else {
      logger.info(
        `💾 Stored location in database with ID: ${insertInfo.lastInsertRowid}`,
      );
      newLocation = db
        .prepare("SELECT * FROM locations WHERE id = ?")
        .get(insertInfo.lastInsertRowid);
      message = "Location collected successfully";
    }

    logger.info("✅ Successfully collected and stored location data");

    return NextResponse.json(
      {
        success: true,
        message,
        location: {
          ...newLocation,
          images: JSON.parse(newLocation.images || "[]"),
          raw_data: JSON.parse(newLocation.raw_data || "{}"),
        },
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      },
    );
  } catch (error) {
    logger.error("💥 Error in collect API:", error);

    // Return appropriate error response
    const errorMessage = error.message || "Failed to collect location data";
    const isNetworkError =
      errorMessage.includes("timeout") ||
      errorMessage.includes("fetch") ||
      errorMessage.includes("network");

    return NextResponse.json(
      {
        error: errorMessage,
        type: isNetworkError ? "network" : "server",
      },
      {
        status: isNetworkError ? 502 : 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      },
    );
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, User-Agent",
      "Access-Control-Max-Age": "86400",
    },
  });
}
