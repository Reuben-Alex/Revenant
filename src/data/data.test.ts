import { describe, expect, it } from 'vitest';
import seasonsRaw from '../../public/data/seasons.json';
import tonightRaw from '../../public/data/tonight.json';
import { coords, fmtDay, fmtIso, km2, region, word } from './format';
import { DataError, parseSeasons, parseTonight } from './load';
import { displayState, since } from './state';

describe('format', () => {
  it('dates count from Mar 21 in UTC', () => {
    expect(fmtDay(0, 2024)).toBe('Mar 21');
    expect(fmtDay(11, 2024)).toBe('Apr 1');
    expect(fmtDay(102, 2024)).toBe('Jul 1');
    expect(fmtIso('2026-11-16')).toBe('Nov 16');
  });
  it('coordinates follow the grid formulas', () => {
    expect(coords(0, 0)).toBe('60.00°N  126.00°W');
    expect(coords(1060, 716)).toBe('54.00°N  109.00°W');
  });
  it('areas never round to zero', () => {
    expect(km2(5173)).toBe('4,700');
    expect(km2(462)).toBe('420');
    expect(km2(52)).toBe('47');
    expect(km2(0.2)).toBe('1');
  });
  it('region splits at x = 374 and words cover 0–24', () => {
    expect(region(373)).toBe('northeast British Columbia');
    expect(region(374)).toBe('northern Alberta');
    expect(word(0)).toBe('None');
    expect(word(24)).toBe('Twenty-four');
  });
});

describe('displayState', () => {
  const rise = { day: 30, x: 0, y: 0 };
  it('follows the published rule mapping', () => {
    expect(displayState(9, 10, rise)).toBe('buried');
    expect(displayState(10, 10, rise)).toBe('waking');
    expect(displayState(30, 10, rise)).toBe('risen');
    expect(displayState(60, 10, null)).toBe('waking'); // melt + 50 still open
    expect(displayState(61, 10, null)).toBe('rest');
    expect(displayState(102, -1, null)).toBe('buried'); // never melted
    expect(since(5, 10)).toBe(0);
    expect(since(15, 10)).toBe(5);
    expect(since(50, -1)).toBe(0);
  });
});

describe('published files', () => {
  it('parse into 24 graves per season with ids in size order', () => {
    const s = parseSeasons(seasonsRaw);
    for (const k of ['s2024', 's2025', 's2026'] as const) {
      const season = s.seasons[k];
      expect(season.graves).toHaveLength(24);
      expect(season.graves[0]?.id).toBe('G-01');
      // ids follow the published order (largest polygon area first); pixel counts may differ slightly
      expect(season.graves.map((g) => g.id)).toEqual(season.graves.map((_, i) => `G-${String(i + 1).padStart(2, '0')}`));
      expect(season.risen).toBe(season.graves.filter((g) => g.rise).length);
      expect(season.zombie).toBe(season.risen / 24 > 1.4 * season.chance);
    }
    expect(s.static).toBeGreaterThan(0);
  });
  it('parse tonight', () => {
    const t = parseTonight(tonightRaw);
    expect(t.scars.length).toBeGreaterThan(0);
    expect(t.frameDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('reject a broken file instead of guessing', () => {
    const bad = structuredClone(seasonsRaw) as Record<string, unknown>;
    delete bad.s2025;
    expect(() => parseSeasons(bad)).toThrow(DataError);
    expect(() => parseTonight({ g: [[1, 2]] , r: [] })).toThrow(/7-field/);
  });
});
