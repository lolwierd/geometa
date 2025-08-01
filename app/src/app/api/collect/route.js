import { NextResponse } from "next/server";
import Database from "better-sqlite3";

const db = new Database("db/geometa.db");

// Country code mapping for flag display
const COUNTRY_CODE_MAP = {
  Afghanistan: "af",
  Albania: "al",
  Algeria: "dz",
  Andorra: "ad",
  Angola: "ao",
  "Antigua and Barbuda": "ag",
  Argentina: "ar",
  Armenia: "am",
  Australia: "au",
  Austria: "at",
  Azerbaijan: "az",
  Bahamas: "bs",
  Bahrain: "bh",
  Bangladesh: "bd",
  Barbados: "bb",
  Belarus: "by",
  Belgium: "be",
  Belize: "bz",
  Benin: "bj",
  Bhutan: "bt",
  Bolivia: "bo",
  "Bosnia and Herzegovina": "ba",
  Botswana: "bw",
  Brazil: "br",
  Brunei: "bn",
  Bulgaria: "bg",
  "Burkina Faso": "bf",
  Burundi: "bi",
  "Cabo Verde": "cv",
  Cambodia: "kh",
  Cameroon: "cm",
  Canada: "ca",
  "Central African Republic": "cf",
  Chad: "td",
  Chile: "cl",
  China: "cn",
  Colombia: "co",
  Comoros: "km",
  Congo: "cg",
  "Costa Rica": "cr",
  Croatia: "hr",
  Cuba: "cu",
  Curacao: "cw",
  Cyprus: "cy",
  Czechia: "cz",
  "Czech Republic": "cz",
  "Christmas Island": "cx",
  "Democratic Republic of the Congo": "cd",
  Denmark: "dk",
  Djibouti: "dj",
  Dominica: "dm",
  "Dominican Republic": "do",
  Ecuador: "ec",
  Egypt: "eg",
  "El Salvador": "sv",
  "Equatorial Guinea": "gq",
  Eritrea: "er",
  Estonia: "ee",
  Eswatini: "sz",
  Ethiopia: "et",
  Fiji: "fj",
  Finland: "fi",
  France: "fr",
  Gabon: "ga",
  Gambia: "gm",
  Georgia: "ge",
  Germany: "de",
  Ghana: "gh",
  Greece: "gr",
  Grenada: "gd",
  Guatemala: "gt",
  Guinea: "gn",
  "Guinea-Bissau": "gw",
  Guyana: "gy",
  Haiti: "ht",
  Honduras: "hn",
  Hungary: "hu",
  Iceland: "is",
  India: "in",
  Indonesia: "id",
  Iran: "ir",
  Iraq: "iq",
  Ireland: "ie",
  Israel: "il",
  Italy: "it",
  Jamaica: "jm",
  Japan: "jp",
  Jordan: "jo",
  Kazakhstan: "kz",
  Kenya: "ke",
  Kiribati: "ki",
  Kuwait: "kw",
  Kyrgyzstan: "kg",
  Laos: "la",
  Latvia: "lv",
  Lebanon: "lb",
  Lesotho: "ls",
  Liberia: "lr",
  Libya: "ly",
  Liechtenstein: "li",
  Lithuania: "lt",
  Luxembourg: "lu",
  Madagascar: "mg",
  Malawi: "mw",
  Malaysia: "my",
  Maldives: "mv",
  Mali: "ml",
  Malta: "mt",
  "Marshall Islands": "mh",
  Mauritania: "mr",
  Mauritius: "mu",
  Mexico: "mx",
  Micronesia: "fm",
  Moldova: "md",
  Monaco: "mc",
  Mongolia: "mn",
  Montenegro: "me",
  Morocco: "ma",
  Mozambique: "mz",
  Myanmar: "mm",
  Namibia: "na",
  Nauru: "nr",
  Nepal: "np",
  Netherlands: "nl",
  "New Zealand": "nz",
  Nicaragua: "ni",
  Niger: "ne",
  Nigeria: "ng",
  "North Korea": "kp",
  "North Macedonia": "mk",
  Norway: "no",
  Oman: "om",
  Pakistan: "pk",
  Palau: "pw",
  "Palestine State": "ps",
  Panama: "pa",
  "Papua New Guinea": "pg",
  Paraguay: "py",
  Peru: "pe",
  Philippines: "ph",
  Poland: "pl",
  Portugal: "pt",
  "Puerto Rico": "pr",
  Qatar: "qa",
  Romania: "ro",
  Russia: "ru",
  Rwanda: "rw",
  "Saint Kitts and Nevis": "kn",
  "Saint Lucia": "lc",
  "Saint Vincent and the Grenadines": "vc",
  Samoa: "ws",
  "San Marino": "sm",
  "Sao Tome and Principe": "st",
  "Saudi Arabia": "sa",
  Senegal: "sn",
  Serbia: "rs",
  Seychelles: "sc",
  "Sierra Leone": "sl",
  Singapore: "sg",
  Slovakia: "sk",
  Slovenia: "si",
  "Solomon Islands": "sb",
  Somalia: "so",
  "South Africa": "za",
  "South Korea": "kr",
  "South Sudan": "ss",
  Spain: "es",
  "Sri Lanka": "lk",
  Sudan: "sd",
  Suriname: "sr",
  Sweden: "se",
  Switzerland: "ch",
  Syria: "sy",
  Taiwan: "tw",
  Tajikistan: "tj",
  Tanzania: "tz",
  Thailand: "th",
  "Timor-Leste": "tl",
  Togo: "tg",
  Tonga: "to",
  "Trinidad and Tobago": "tt",
  Tunisia: "tn",
  Turkey: "tr",
  Turkmenistan: "tm",
  Tuvalu: "tv",
  Uganda: "ug",
  Ukraine: "ua",
  "United Arab Emirates": "ae",
  "United Kingdom": "gb",
  "United States of America": "us",
  "United States": "us",
  Uruguay: "uy",
  Uzbekistan: "uz",
  Vanuatu: "vu",
  "Vatican City": "va",
  Venezuela: "ve",
  Vietnam: "vn",
  Yemen: "ye",
  Zambia: "zm",
  Zimbabwe: "zw",
};

async function fetchLearnableMetaData(panoId, mapId, source = "userscript") {
  const params = new URLSearchParams({
    panoId,
    mapId,
    userscriptVersion: "0.88", // Current version from the original userscript
    source,
  });

  const url = `https://learnablemeta.com/api/userscript/location?${params}`;

  console.log(`🔄 Fetching meta data from LearnableMeta API: ${url}`);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "GeoMetaGallery/2.0",
        Accept: "application/json",
      },
      timeout: 10000, // 10 second timeout
    });

    console.log(
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
    console.log(
      `✅ Successfully fetched meta data for ${data.country || "unknown country"}`,
    );

    return data;
  } catch (error) {
    console.error("❌ Failed to fetch from LearnableMeta API:", error);

    if (error.name === "AbortError" || error.message.includes("timeout")) {
      throw new Error("Request to LearnableMeta API timed out");
    }

    throw error;
  }
}

function getCountryCode(countryName) {
  if (!countryName) return null;

  // Try exact match first
  const exactMatch = COUNTRY_CODE_MAP[countryName];
  if (exactMatch) return exactMatch;

  // Try case-insensitive match
  const lowerCountry = countryName.toLowerCase();
  for (const [key, value] of Object.entries(COUNTRY_CODE_MAP)) {
    if (key.toLowerCase() === lowerCountry) {
      return value;
    }
  }

  // Fallback: generate from country name
  return countryName
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 2);
}

export async function POST(request) {
  try {
    console.log("🎯 New collect request received");

    const requestBody = await request.json();
    const { panoId, mapId, roundNumber = 1, source = "map" } = requestBody;

    console.log("📋 Request data:", { panoId, mapId, roundNumber, source });

    // Validate required fields
    if (!panoId || !mapId) {
      console.log("❌ Missing required fields");
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

    // Check if we already have this location
    const existingLocation = db
      .prepare("SELECT * FROM locations WHERE pano_id = ?")
      .get(panoId);

    if (existingLocation) {
      console.log("ℹ️ Location already exists in database");
      return NextResponse.json(
        {
          success: true,
          message: "Location already exists",
          location: {
            ...existingLocation,
            images: JSON.parse(existingLocation.images || "[]"),
            raw_data: JSON.parse(existingLocation.raw_data || "{}"),
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
    }

    // Fetch meta data from LearnableMeta API
    const metaData = await fetchLearnableMetaData(panoId, mapId, source);

    if (metaData.error) {
      console.log(`⚠️ LearnableMeta API returned error: ${metaData.error}`);
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

    console.log(`🏁 Processed country: ${metaData.country} → ${countryCode}`);

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

    // Insert into database
    const insertStmt = db.prepare(`
      INSERT INTO locations (
        pano_id, map_id, country, country_code, meta_name,
        note, footer, images, raw_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
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

    console.log(
      `💾 Stored location in database with ID: ${result.lastInsertRowid}`,
    );

    // Fetch the newly created location to return complete data
    const newLocation = db
      .prepare("SELECT * FROM locations WHERE id = ?")
      .get(result.lastInsertRowid);

    console.log("✅ Successfully collected and stored location data");

    return NextResponse.json(
      {
        success: true,
        message: "Location collected successfully",
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
    console.error("💥 Error in collect API:", error);

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
