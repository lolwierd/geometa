import { Router } from 'express';
import { db } from '../lib/db.js';
import { logger } from '../lib/logger.js';
import { getCountriesByContinent, getContinent } from '../lib/continents.js';
const router = Router();
// Helper function to safely parse JSON with fallback
function safeJsonParse(jsonString, fallback) {
    try {
        if (!jsonString || jsonString.trim() === "") {
            return fallback;
        }
        const parsed = JSON.parse(jsonString);
        return parsed !== null && parsed !== undefined ? parsed : fallback;
    }
    catch (error) {
        logger.warn("Failed to parse JSON:", jsonString, error);
        return fallback;
    }
}
// GET /api/gallery
router.get('/', async (req, res) => {
    try {
        const { country, continent, state, q: search, limit: limitParam = '50', offset: offsetParam = '0' } = req.query;
        const limit = Math.min(parseInt(limitParam), 100); // Cap at 100
        const offset = Math.max(parseInt(offsetParam), 0);
        logger.info("🔍 Gallery API request:", { country, continent, state, search, limit, offset });
        let query;
        let countQuery;
        const params = [];
        const countParams = [];
        // Use full-text search if search term provided
        if (search && typeof search === 'string' && search.trim()) {
            query = `
        SELECT l.* FROM locations l
        LEFT JOIN memorizer_progress mp ON l.id = mp.location_id
        JOIN locations_fts fts ON l.id = fts.rowid
        WHERE locations_fts MATCH ?
      `;
            countQuery = `
        SELECT COUNT(*) as total FROM locations l
        LEFT JOIN memorizer_progress mp ON l.id = mp.location_id
        JOIN locations_fts fts ON l.id = fts.rowid
        WHERE locations_fts MATCH ?
      `;
            // Escape FTS special characters and add wildcards
            const ftsQuery = search
                .trim()
                .replace(/['"*]/g, "")
                .split(/\s+/)
                .map((term) => `"${term}"*`)
                .join(" OR ");
            params.push(ftsQuery);
            countParams.push(ftsQuery);
            // Add country filter if specified
            if (country && country !== "all" && typeof country === 'string') {
                const countryList = country.split(',').filter(c => c.trim() !== '');
                if (countryList.length > 0) {
                    const placeholders = countryList.map(() => '?').join(',');
                    query += ` AND l.country IN (${placeholders})`;
                    countQuery += ` AND l.country IN (${placeholders})`;
                    params.push(...countryList);
                    countParams.push(...countryList);
                }
            }
            // Add continent filter if specified
            if (continent && continent !== "all" && typeof continent === 'string') {
                const continentList = continent.split(',').filter(c => c.trim() !== '');
                if (continentList.length > 0) {
                    const continentCountries = continentList.flatMap(c => getCountriesByContinent(c) || []);
                    if (continentCountries.length > 0) {
                        const placeholders = continentCountries.map(() => '?').join(',');
                        query += ` AND l.country IN (${placeholders})`;
                        countQuery += ` AND l.country IN (${placeholders})`;
                        params.push(...continentCountries);
                        countParams.push(...continentCountries);
                    }
                }
            }
            // Add state filter if specified
            if (state && state !== "all" && typeof state === 'string') {
                const stateList = state.split(',').filter(s => s.trim() !== '');
                if (stateList.length > 0) {
                    const placeholders = stateList.map(() => '?').join(',');
                    query += ` AND mp.state IN (${placeholders})`;
                    countQuery += ` AND mp.state IN (${placeholders})`;
                    params.push(...stateList);
                    countParams.push(...stateList);
                }
            }
        }
        else {
            // Regular query without search
            query = `
        SELECT l.* FROM locations l
        LEFT JOIN memorizer_progress mp ON l.id = mp.location_id
        WHERE 1=1
      `;
            countQuery = `
        SELECT COUNT(*) as total FROM locations l
        LEFT JOIN memorizer_progress mp ON l.id = mp.location_id
        WHERE 1=1
      `;
            // Add filters similar to search version but without FTS
            if (country && country !== "all" && typeof country === 'string') {
                const countryList = country.split(',').filter(c => c.trim() !== '');
                if (countryList.length > 0) {
                    const placeholders = countryList.map(() => '?').join(',');
                    query += ` AND l.country IN (${placeholders})`;
                    countQuery += ` AND l.country IN (${placeholders})`;
                    params.push(...countryList);
                    countParams.push(...countryList);
                }
            }
            if (continent && continent !== "all" && typeof continent === 'string') {
                const continentList = continent.split(',').filter(c => c.trim() !== '');
                if (continentList.length > 0) {
                    const continentCountries = continentList.flatMap(c => getCountriesByContinent(c) || []);
                    if (continentCountries.length > 0) {
                        const placeholders = continentCountries.map(() => '?').join(',');
                        query += ` AND l.country IN (${placeholders})`;
                        countQuery += ` AND l.country IN (${placeholders})`;
                        params.push(...continentCountries);
                        countParams.push(...continentCountries);
                    }
                }
            }
            if (state && state !== "all" && typeof state === 'string') {
                const stateList = state.split(',').filter(s => s.trim() !== '');
                if (stateList.length > 0) {
                    const placeholders = stateList.map(() => '?').join(',');
                    query += ` AND mp.state IN (${placeholders})`;
                    countQuery += ` AND mp.state IN (${placeholders})`;
                    params.push(...stateList);
                    countParams.push(...stateList);
                }
            }
        }
        query += ` ORDER BY l.created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);
        // Execute main query
        const stmt = db.prepare(query);
        const locations = stmt.all(...params);
        // Execute count query
        const countStmt = db.prepare(countQuery);
        const { total } = countStmt.get(...countParams);
        // Process locations - parse JSON fields
        const processedLocations = locations.map((location) => ({
            ...location,
            images: safeJsonParse(location.images, []),
            raw_data: safeJsonParse(location.raw_data, {}),
        }));
        // Get unique countries for filter dropdown
        const countriesStmt = db.prepare("SELECT DISTINCT country FROM locations WHERE country IS NOT NULL ORDER BY country");
        const countriesResult = countriesStmt.all();
        const countries = countriesResult.map((row) => row.country);
        const continents = Array.from(new Set(countries
            .map((c) => getContinent(c))
            .filter((c) => Boolean(c)))).sort();
        // Get unique memorizer states for filter dropdown
        const statesStmt = db.prepare("SELECT DISTINCT state FROM memorizer_progress WHERE state IS NOT NULL ORDER BY state");
        const statesResult = statesStmt.all();
        const states = statesResult.map((row) => row.state);
        // Get some stats
        const statsStmt = db.prepare("SELECT COUNT(*) as total_locations, COUNT(DISTINCT country) as total_countries FROM locations");
        const stats = statsStmt.get();
        logger.info(`✅ Gallery API: Returning ${processedLocations.length}/${total} locations`);
        res.json({
            success: true,
            locations: processedLocations,
            total,
            countries,
            continents,
            states,
            stats,
            pagination: {
                limit,
                offset,
                hasMore: offset + limit < total,
                page: Math.floor(offset / limit) + 1,
                totalPages: Math.ceil(total / limit),
            },
            filters: {
                country: country === "all" ? null : (typeof country === 'string' ? country.split(',') : null),
                continent: continent === "all" ? null : (typeof continent === 'string' ? continent.split(',') : null),
                state: state === "all" ? null : (typeof state === 'string' ? state.split(',') : null),
                search: search || null,
            },
        });
    }
    catch (error) {
        logger.error("❌ Gallery API error:", error);
        res.status(500).json({
            error: "Failed to fetch gallery data",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
// DELETE /api/gallery/:id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: "Location ID is required" });
        }
        const locationId = parseInt(id, 10);
        if (isNaN(locationId)) {
            return res.status(400).json({ error: "Invalid location ID" });
        }
        logger.info(`🗑️ Attempting to delete location with ID: ${locationId}`);
        // Check if location exists first
        const checkStmt = db.prepare("SELECT id, country, meta_name FROM locations WHERE id = ?");
        const existingLocation = checkStmt.get(locationId);
        if (!existingLocation) {
            logger.warn(`❌ Location not found: ${locationId}`);
            return res.status(404).json({ error: "Location not found" });
        }
        // Delete from locations table (memorizer_progress will be deleted by CASCADE)
        const deleteStmt = db.prepare("DELETE FROM locations WHERE id = ?");
        const result = deleteStmt.run(locationId);
        if (result.changes === 0) {
            logger.error(`❌ Failed to delete location: ${locationId}`);
            return res.status(500).json({ error: "Failed to delete location" });
        }
        logger.info(`✅ Successfully deleted location: ${existingLocation.country} - ${existingLocation.meta_name || "Unknown"}`);
        res.json({
            success: true,
            message: "Location deleted successfully",
            deleted: existingLocation,
        });
    }
    catch (error) {
        logger.error("❌ Delete location error:", error);
        res.status(500).json({
            error: "Failed to delete location",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
export default router;
//# sourceMappingURL=gallery.js.map