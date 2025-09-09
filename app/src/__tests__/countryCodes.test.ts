import { describe, expect, it } from 'vitest';
import { getCountryCode, COUNTRY_CODE_MAP } from '@/lib/countryCodes';

describe('countryCodes utility', () => {
  describe('COUNTRY_CODE_MAP constant', () => {
    it('should contain expected country mappings', () => {
      expect(COUNTRY_CODE_MAP['United States']).toBe('us');
      expect(COUNTRY_CODE_MAP['United States of America']).toBe('us');
      expect(COUNTRY_CODE_MAP['Canada']).toBe('ca');
      expect(COUNTRY_CODE_MAP['France']).toBe('fr');
      expect(COUNTRY_CODE_MAP['Germany']).toBe('de');
      expect(COUNTRY_CODE_MAP['China']).toBe('cn');
      expect(COUNTRY_CODE_MAP['Japan']).toBe('jp');
      expect(COUNTRY_CODE_MAP['Brazil']).toBe('br');
      expect(COUNTRY_CODE_MAP['Australia']).toBe('au');
      expect(COUNTRY_CODE_MAP['United Kingdom']).toBe('gb');
    });

    it('should handle countries with alternative names', () => {
      expect(COUNTRY_CODE_MAP['Czech Republic']).toBe('cz');
      expect(COUNTRY_CODE_MAP['Czechia']).toBe('cz');
    });

    it('should have lowercase country codes', () => {
      Object.values(COUNTRY_CODE_MAP).forEach(code => {
        expect(code).toEqual(code.toLowerCase());
        expect(code).toMatch(/^[a-z]{2,3}$/);
      });
    });
  });

  describe('getCountryCode', () => {
    it('should return correct codes for known countries (exact match)', () => {
      expect(getCountryCode('United States')).toBe('us');
      expect(getCountryCode('Canada')).toBe('ca');
      expect(getCountryCode('France')).toBe('fr');
      expect(getCountryCode('Germany')).toBe('de');
      expect(getCountryCode('United Kingdom')).toBe('gb');
      expect(getCountryCode('China')).toBe('cn');
      expect(getCountryCode('Japan')).toBe('jp');
      expect(getCountryCode('Brazil')).toBe('br');
      expect(getCountryCode('Australia')).toBe('au');
    });

    it('should be case insensitive', () => {
      expect(getCountryCode('UNITED STATES')).toBe('us');
      expect(getCountryCode('united states')).toBe('us');
      expect(getCountryCode('UnItEd StAtEs')).toBe('us');
      expect(getCountryCode('FRANCE')).toBe('fr');
      expect(getCountryCode('france')).toBe('fr');
    });

    it('should handle null and undefined input', () => {
      expect(getCountryCode(null)).toBe(null);
      expect(getCountryCode(undefined)).toBe(null);
    });

    it('should handle empty string', () => {
      expect(getCountryCode('')).toBe(null);
    });

    it('should generate fallback codes for unknown countries', () => {
      const result = getCountryCode('Unknown Country');
      expect(result).toBe('un'); // first 2 chars of "unknown-country"
      
      const result2 = getCountryCode('Made Up Place');
      expect(result2).toBe('ma'); // first 2 chars of "made-up-place"
      
      const result3 = getCountryCode('Test Nation');
      expect(result3).toBe('te'); // first 2 chars of "test-nation"
    });

    it('should handle special characters in fallback generation', () => {
      // Should remove special characters and use first 2 letters
      expect(getCountryCode("St. John's Island")).toBe('st');
      expect(getCountryCode('São Paulo State')).toBe('so'); // 'so' from 'são-paulo-state' (first 2 chars after processing)
      expect(getCountryCode('U.S. Virgin Islands')).toBe('us');
    });

    it('should handle very short country names', () => {
      expect(getCountryCode('US')).toBe('us'); // first 2 chars
      expect(getCountryCode('A')).toBe('a'); // single char, padded or handled
    });

    it('should handle countries with numbers or special chars', () => {
      // The function should strip non-alphabetic chars and use first 2 letters
      expect(getCountryCode('Country-123')).toBe('co');
      expect(getCountryCode('Test & Example')).toBe('te');
    });

    it('should handle alternative country names correctly', () => {
      expect(getCountryCode('Czech Republic')).toBe('cz');
      expect(getCountryCode('Czechia')).toBe('cz');
      expect(getCountryCode('United States of America')).toBe('us');
    });

    it('should handle whitespace in exact match only', () => {
      // Exact match works
      expect(getCountryCode('France')).toBe('fr');
      // But leading/trailing spaces don't match exactly, so they fall back to processing
      expect(getCountryCode('  France  ')).toBe('-f'); // processed as "france-" -> first 2 chars
      expect(getCountryCode('\tGermany\n')).toBe('-g'); // processed as "germany-" -> first 2 chars
    });
  });
});