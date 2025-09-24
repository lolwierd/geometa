export declare const CONTINENTS: readonly ["Africa", "Asia", "Europe", "North America", "Latin America", "Oceania"];
export type Continent = typeof CONTINENTS[number];
export declare function getCountriesByContinent(continent: Continent): string[];
export declare function getContinent(countryName: string): Continent | null;
//# sourceMappingURL=continents.d.ts.map