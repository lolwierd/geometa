import { Router, Request, Response } from 'express';
import { db } from '../lib/db.js';
import { getCountryCode } from '../lib/countryCodes.js';
import { logger } from '../lib/logger.js';

const router = Router();

async function fetchLearnableMetaData(panoId: string, mapId: string, source: string = "userscript") {
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
      signal: AbortSignal.timeout(10000), // 10 second timeout
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
  } catch (error: any) {
    logger.error("❌ Failed to fetch from LearnableMeta API:", error);

    if (error.name === "AbortError" || error.name === "TimeoutError" || error.message.includes("timeout")) {
      throw new Error("Request to LearnableMeta API timed out");
    }

    throw error;
  }
}

// POST /api/collect
router.post('/', async (req: Request, res: Response) => {
  try {
    logger.info("🎯 New collect request received");

    const { panoId, mapId, roundNumber = 1, source = "map" } = req.body;

    logger.info("📋 Request data:", { panoId, mapId, roundNumber, source });

    // Validate required fields
    if (!panoId || !mapId) {
      logger.info("❌ Missing required fields");
      return res.status(400).json({ error: "panoId and mapId are required" });
    }

    // Validate field types and lengths to prevent potential issues
    if (typeof panoId !== 'string' || typeof mapId !== 'string' ||
        panoId.length > 256 || mapId.length > 256) {
      logger.info("❌ Invalid field types or lengths");
      return res.status(400).json({ error: "panoId and mapId must be strings under 256 characters" });
    }

    // Fetch data from LearnableMeta API
    const metaData = await fetchLearnableMetaData(panoId, mapId, source);

    // Handle API errors
    if (metaData.error) {
      return res.status(metaData.status || 500).json({
        error: metaData.error,
        type: metaData.notFound ? "not_found" : "server",
      });
    }

    // Extract data from LearnableMeta response
    const countryName = metaData.country;
    if (!countryName) {
      logger.warn("⚠️ No country found in meta data");
      return res.status(400).json({
        error: "No country information found for this location",
        type: "invalid_location",
      });
    }

    logger.info(`🏁 Processed country: ${countryName} → ${getCountryCode(countryName)}`);

    // Prepare location data for database
    const locationData = {
      pano_id: panoId,
      map_id: mapId,
      country: countryName,
      country_code: getCountryCode(countryName),
      meta_name: metaData.metaName || null,
      note: metaData.note || null,
      footer: metaData.footer || null,
      images: JSON.stringify(metaData.images || []),
      raw_data: JSON.stringify(metaData),
    };

    // Insert into database with ON CONFLICT handling
    const insertStmt = db.prepare(`
      INSERT INTO locations (
        pano_id, map_id, country, country_code, meta_name, note, footer, images, raw_data
      ) VALUES (
        @pano_id, @map_id, @country, @country_code, @meta_name, @note, @footer, @images, @raw_data
      )
      ON CONFLICT(raw_data) DO UPDATE SET
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `);

    const result = insertStmt.get(locationData) as any;
    
    let message: string;
    if (result && result.id) {
      logger.info(`💾 Stored location in database with ID: ${result.id}`);
      message = "Location collected successfully";
    } else {
      logger.info("ℹ️ Location already exists in database (ON CONFLICT)");
      message = "Location collected successfully";
    }

    logger.info("✅ Successfully collected and stored location data");

    res.json({
      success: true,
      message,
      location: result ? {
        ...result,
        images: JSON.parse(result.images || "[]"),
        raw_data: JSON.parse(result.raw_data || "{}"),
      } : null,
    });
  } catch (error: any) {
    logger.error("💥 Error in collect API:", error);

    // Return appropriate error response
    const errorMessage = error.message || "Failed to collect location data";
    const isNetworkError =
      errorMessage.includes("timeout") ||
      errorMessage.includes("fetch") ||
      errorMessage.includes("network");

    res.status(isNetworkError ? 502 : 500).json({
      error: errorMessage,
      type: isNetworkError ? "network" : "server",
    });
  }
});

export default router;