import { countries as countryData } from "countries-list";

export const CONTINENTS = [
  "Africa",
  "Asia",
  "Europe",
  "North America",
  "Latin America",
  "Oceania",
] as const;

export type Continent = typeof CONTINENTS[number];

const NORTH_AMERICA_SET = new Set(["Canada", "United States", "Greenland"]);

const CONTINENT_COUNTRIES_MAP: Record<Continent, string[]> = {
  Africa: [],
  Asia: [],
  Europe: [],
  "North America": [],
  "Latin America": [],
  Oceania: [],
};

for (const country of Object.values(countryData)) {
  switch (country.continent) {
    case "AF":
      CONTINENT_COUNTRIES_MAP.Africa.push(country.name);
      break;
    case "AS":
      CONTINENT_COUNTRIES_MAP.Asia.push(country.name);
      break;
    case "EU":
      CONTINENT_COUNTRIES_MAP.Europe.push(country.name);
      break;
    case "OC":
      CONTINENT_COUNTRIES_MAP.Oceania.push(country.name);
      break;
    case "NA":
      if (NORTH_AMERICA_SET.has(country.name)) {
        CONTINENT_COUNTRIES_MAP["North America"].push(country.name);
      } else {
        CONTINENT_COUNTRIES_MAP["Latin America"].push(country.name);
      }
      break;
    case "SA":
      CONTINENT_COUNTRIES_MAP["Latin America"].push(country.name);
      break;
  }
}

export function getCountriesByContinent(continent: Continent): string[] {
  return CONTINENT_COUNTRIES_MAP[continent] || [];
}

export function getContinent(countryName: string): Continent | null {
  const lower = countryName.toLowerCase();
  for (const [continent, countries] of Object.entries(CONTINENT_COUNTRIES_MAP) as [Continent, string[]][]) {
    if (countries.some((c) => c.toLowerCase() === lower)) {
      return continent;
    }
  }
  return null;
}
