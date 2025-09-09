import { describe, expect, it } from 'vitest';
import { 
  CONTINENTS, 
  getCountriesByContinent, 
  getContinent,
  type Continent 
} from '@/lib/continents';

describe('continents utility', () => {
  describe('CONTINENTS constant', () => {
    it('should contain all expected continents', () => {
      const expectedContinents = [
        "Africa",
        "Asia", 
        "Europe",
        "North America",
        "Latin America",
        "Oceania"
      ];
      
      expect(CONTINENTS).toEqual(expectedContinents);
      expect(CONTINENTS).toHaveLength(6);
    });
  });

  describe('getCountriesByContinent', () => {
    it('should return arrays for all valid continents', () => {
      CONTINENTS.forEach(continent => {
        const countries = getCountriesByContinent(continent);
        expect(Array.isArray(countries)).toBe(true);
        expect(countries.length).toBeGreaterThan(0);
      });
    });

    it('should return specific countries for well-known continents', () => {
      const europeCountries = getCountriesByContinent('Europe');
      expect(europeCountries).toContain('France');
      expect(europeCountries).toContain('Germany');
      expect(europeCountries).toContain('Spain');

      const asiaCountries = getCountriesByContinent('Asia');
      expect(asiaCountries).toContain('China');
      expect(asiaCountries).toContain('Japan');
      expect(asiaCountries).toContain('India');

      const africaCountries = getCountriesByContinent('Africa');
      expect(africaCountries).toContain('Nigeria');
      expect(africaCountries).toContain('Egypt');

      const northAmericaCountries = getCountriesByContinent('North America');
      expect(northAmericaCountries).toContain('Canada');
      expect(northAmericaCountries).toContain('United States');

      const latinAmericaCountries = getCountriesByContinent('Latin America');
      expect(latinAmericaCountries).toContain('Brazil');
      expect(latinAmericaCountries).toContain('Mexico');
      expect(latinAmericaCountries).toContain('Argentina');

      const oceaniaCountries = getCountriesByContinent('Oceania');
      expect(oceaniaCountries).toContain('Australia');
      expect(oceaniaCountries).toContain('New Zealand');
    });

    it('should return empty array for invalid continent', () => {
      const result = getCountriesByContinent('Antarctica' as Continent);
      expect(result).toEqual([]);
    });

    it('should distinguish between North America and Latin America', () => {
      const northAmerica = getCountriesByContinent('North America');
      const latinAmerica = getCountriesByContinent('Latin America');
      
      // North America should only have Canada, United States, and Greenland
      expect(northAmerica).toContain('United States');
      expect(northAmerica).toContain('Canada');
      expect(northAmerica).not.toContain('Mexico'); // Mexico should be in Latin America
      
      // Latin America should contain Mexico and South American countries
      expect(latinAmerica).toContain('Mexico');
      expect(latinAmerica).toContain('Brazil');
      expect(latinAmerica).not.toContain('United States');
      expect(latinAmerica).not.toContain('Canada');
    });
  });

  describe('getContinent', () => {
    it('should return correct continent for known countries', () => {
      expect(getContinent('France')).toBe('Europe');
      expect(getContinent('Germany')).toBe('Europe');
      expect(getContinent('China')).toBe('Asia');
      expect(getContinent('Japan')).toBe('Asia');
      expect(getContinent('Nigeria')).toBe('Africa');
      expect(getContinent('Egypt')).toBe('Africa');
      expect(getContinent('Canada')).toBe('North America');
      expect(getContinent('United States')).toBe('North America');
      expect(getContinent('Brazil')).toBe('Latin America');
      expect(getContinent('Mexico')).toBe('Latin America');
      expect(getContinent('Australia')).toBe('Oceania');
      expect(getContinent('New Zealand')).toBe('Oceania');
    });

    it('should be case insensitive', () => {
      expect(getContinent('FRANCE')).toBe('Europe');
      expect(getContinent('france')).toBe('Europe');
      expect(getContinent('FrAnCe')).toBe('Europe');
      expect(getContinent('united states')).toBe('North America');
      expect(getContinent('UNITED STATES')).toBe('North America');
    });

    it('should return null for unknown countries', () => {
      expect(getContinent('Unknown Country')).toBe(null);
      expect(getContinent('Made Up Place')).toBe(null);
      expect(getContinent('')).toBe(null);
    });

    it('should handle edge cases', () => {
      expect(getContinent('   France   '.trim())).toBe('Europe');
    });

    it('should properly categorize North American vs Latin American countries', () => {
      // Test the special North America categorization
      expect(getContinent('United States')).toBe('North America');
      expect(getContinent('Canada')).toBe('North America');
      expect(getContinent('Greenland')).toBe('North America');
      
      // Mexico and other NA continent countries should be Latin America
      expect(getContinent('Mexico')).toBe('Latin America');
      expect(getContinent('Guatemala')).toBe('Latin America');
      expect(getContinent('Costa Rica')).toBe('Latin America');
    });
  });
});