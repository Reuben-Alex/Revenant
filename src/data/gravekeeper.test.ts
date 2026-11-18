// Spec 06 Correctness Properties 1–7 (design.md) and examples against the published file.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import seasonsRaw from '../../public/data/seasons.json';
import * as copy from '../copy/gravekeeper';
import { fmtDay, km2, lat, word } from './format';
import {
  WHISPER_DAYS, ZOMBIE_FACTOR, checkRiddle, clueCard, firstThaw, glitchOn, glitchText, gravekeeperGuess, introLine, lanternRadius, line,
  margin, riddleCards, risingLine, verdictView, wagerScore, whisperAt,
} from './gravekeeper';
import { parseSeasons } from './load';
import type { Grave, SeasonData } from './types';

const DATA = parseSeasons(seasonsRaw);
const RUNS = { numRuns: 300 };
const digits = (s: string) => s.replace(/(\d),(\d)/g, '$1$2').match(/\d+(\.\d+)?/g) ?? [];

const graveArb: fc.Arbitrary<Grave> = fc.record({
  size: fc.integer({ min: 1, max: 20000 }), cy: fc.integer({ min: 0, max: 715 }), melt: fc.integer({ min: -1, max: 102 }),
  rise: fc.option(fc.integer({ min: 0, max: 50 }), { nil: null }), early: fc.integer({ min: 0, max: 30 }),
}).map((r) => {
  const d = r.melt >= 0 && r.rise !== null ? Math.min(102, r.melt + r.rise) : null;
  return { id: 'G-00', size: r.size, cx: 10, cy: r.cy, melt: r.melt, early: r.early, snow: [], rise: d === null ? null : { day: d, x: 1, y: 1 } };
});

const seasonArb: fc.Arbitrary<SeasonData> = fc.record({
  graves: fc.array(graveArb, { minLength: 3, maxLength: 24 }), chance: fc.double({ min: 0.01, max: 0.9, noNaN: true }),
  year: fc.integer({ min: 2024, max: 2030 }),
}).map(({ graves, chance, year }) => {
  const gs = graves.map((g, i) => ({ ...g, id: `G-${String(i + 1).padStart(2, '0')}` }));
  const risen = gs.filter((g) => g.rise).length;
  // The flag is published; here it follows the documented rule so generated seasons are realistic.
  return { key: 's2024', year, graves: gs, fires: [], chance, zombie: risen / gs.length > ZOMBIE_FACTOR * chance, risen };
});

describe('Correctness properties', () => {
  it('Property 1: lines carry only published numbers (Req 2.2–2.4, 2.7, 7.2–7.5)', () => {
    // Marks are always real stones of the season (the UI marks by pressing a grave's button).
    fc.assert(fc.property(seasonArb, fc.nat(10), fc.subarray(['G-01', 'G-02', 'G-03'], { maxLength: 3 }), (s, rot, marks) => {
      const risenGraves = s.graves.filter((g) => g.rise);
      const lead = risenGraves[0];
      const allowed = new Set<string>([
        ...s.graves.flatMap((g) => [...digits(g.id), String(g.rise ? g.rise.day - g.melt : 0)]),
        String(s.year), String(s.year - 1), String(s.graves.length), String(s.risen), '50', '3', '1', '0',
        String(Math.round(s.chance * 100)), (s.risen / s.graves.length / s.chance).toFixed(1),
        ((3 * s.risen) / s.graves.length).toFixed(1), String(ZOMBIE_FACTOR),
      ]);
      const texts: string[] = [];
      if (lead) {
        for (const beat of [1, 2, 3, null] as const) {
          texts.push(risingLine({ ids: [lead.id], lead: lead.id, days: [lead.rise!.day - lead.melt], beat, year: s.year }, rot, marks));
        }
      }
      const v = verdictView(s, marks.length === 3 ? marks : [], marks.length === 3);
      texts.push(v.title, v.detail, v.line, ...(v.wager ? [v.wager] : []));
      for (const t of texts) for (const d of digits(t)) expect(allowed, `"${d}" in "${t}"`).toContain(d);
    }), RUNS);
  });

  it('Property 2: quiet years follow the flag (Req 3.1, 7.2, 7.3)', () => {
    fc.assert(fc.property(seasonArb, (s) => {
      const whispers = WHISPER_DAYS.map((d) => whisperAt(s, d));
      expect(whispers.every((x) => (s.zombie ? x === null : x !== null))).toBe(true);
      const v = verdictView(s, [], false);
      expect(v.line.includes('This was a zombie year.')).toBe(s.zombie);
      expect(v.line.includes('I do not cry wolf.')).toBe(!s.zombie);
      expect(v.bells).toBe(s.zombie ? 3 : 1);
    }), RUNS);
  });

  it('Property 3: the margin is exact (Req 7.4)', () => {
    fc.assert(fc.property(seasonArb, (s) => {
      const k = margin(s);
      const n = s.graves.length;
      const bar = ZOMBIE_FACTOR * s.chance;
      if (k === null) {
        if (s.zombie) for (const j of [1, 2]) expect((s.risen - j) / n).toBeGreaterThan(bar);
      } else {
        expect(s.zombie).toBe(true);
        expect([1, 2]).toContain(k);
        expect((s.risen - k) / n).toBeLessThanOrEqual(bar);
        expect((s.risen - k + 1) / n).toBeGreaterThan(bar);
        expect(verdictView(s, [], false).detail).toContain(copy.verdict.thin(k));
      }
    }), RUNS);
  });

  it('Property 4: the riddle accepts only the truth (Req 5.2, 5.3)', () => {
    fc.assert(fc.property(fc.integer({ min: 2000, max: 2100 }), fc.subarray(['t0', 't1', 't2', 'd']), (year, picked) => {
      const cards = riddleCards(year, 1);
      expect(cards.map((c) => c.key).sort()).toEqual(['d', 't0', 't1', 't2']);
      expect(riddleCards(year, 1)).toEqual(cards);
      expect(cards.filter((c) => c.truth)).toHaveLength(3);
      expect(checkRiddle(picked)).toBe(picked.length === 3 && !picked.includes('d'));
    }), RUNS);
  });

  it('Property 5: wager scores and the lantern are bounded (Req 4.5, 7.5)', () => {
    fc.assert(fc.property(seasonArb, fc.integer({ min: 0, max: 102 }), (s, day) => {
      const marks = s.graves.slice(-3).map((g) => g.id);
      const sc = wagerScore(s, marks);
      expect(sc.k).toBe(marks.filter((id) => s.graves.find((g) => g.id === id)!.rise).length);
      expect(sc.guess).toBeGreaterThanOrEqual(0);
      expect(sc.guess).toBeLessThanOrEqual(3);
      expect(sc.blind).toBeCloseTo((3 * s.risen) / s.graves.length, 9);
      const r = lanternRadius(s, marks, day, true);
      expect([130, 160, 190, 220]).toContain(r);
      expect(lanternRadius(s, marks, Math.min(102, day + 1), true)).toBeGreaterThanOrEqual(r);
      expect(lanternRadius(s, marks, day, false)).toBe(130);
    }), RUNS);
  });

  it('Property 6: clue cards are data (Req 4.3)', () => {
    fc.assert(fc.property(graveArb, fc.integer({ min: 2024, max: 2030 }), (g, year) => {
      const c = clueCard(g, year);
      const allowed = new Set([...digits(km2(g.size)), ...digits(lat(g.cy).toFixed(1)), ...(g.melt >= 0 ? digits(fmtDay(g.melt, year)) : []), String(g.early)]);
      for (const t of Object.values(c)) for (const d of digits(t)) expect(allowed, `"${d}" in "${t}"`).toContain(d);
    }), RUNS);
  });

  it('Property 7: the glitch stays visual and slow (Req 3.3, 3.4)', () => {
    fc.assert(fc.property(fc.string({ maxLength: 120 }), fc.nat(10000), (s, seed) => {
      const g = glitchText(s, seed);
      expect(g.length).toBe(s.length);
      let changed = 0;
      for (let i = 0; i < s.length; i++) {
        if (s[i] === ' ' || s[i] === '\n') expect(g[i]).toBe(s[i]);
        if (g[i] !== s[i]) changed++;
      }
      // The board's rvGlitch steps r by 9301/233280 ≈ 0.04 per character, so a run of up to 6 can fall under 0.22.
      expect(changed).toBeLessThanOrEqual(Math.ceil(s.length * 0.22) + 6);
    }), RUNS);
    let on = 0;
    for (let t = 0; t < 46 * 110 * 20; t += 110) if (glitchOn(t)) on++;
    expect(on).toBe(3 * 20);
  });
});

describe('Examples from the published file', () => {
  const { s2024, s2025, s2026 } = DATA.seasons;

  it('names the night: 24 graves of 2023', () => {
    expect(copy.night(s2024.graves.length, 2023)).toContain('twenty-four of them, from the summer of 2023');
  });

  it('first thaw names a thawed, unrisen grave inside its window, the latest to thaw', () => {
    for (const s of [s2024, s2025, s2026]) {
      for (let day = 0; day <= 102; day++) {
        const g = firstThaw(s, day);
        if (!g) continue;
        expect(g.melt).toBeGreaterThanOrEqual(0);
        expect(g.melt).toBeLessThanOrEqual(day);
        expect(day - g.melt).toBeLessThanOrEqual(50);
        expect(g.rise === null || g.rise.day > day).toBe(true);
        for (const o of s.graves) {
          const eligible = o.melt >= 0 && o.melt <= day && day - o.melt <= 50 && (o.rise === null || o.rise.day > day);
          if (eligible) expect(o.melt).toBeLessThanOrEqual(g.melt);
        }
      }
    }
    expect(firstThaw(s2024, 1)?.id).toBe('G-10');
  });

  it('builds the intros from the published sizes; 2025 and 2026 were gentler, by area', () => {
    expect(introLine(DATA.seasons, 's2024')).toContain('burned more of this country than any I remember');
    expect(introLine(DATA.seasons, 's2025')).toMatch(/^Twenty-four more, from the fires of 2024\. A gentler summer: these twenty-four cover about 13,500 km², where 2023's covered 34,600\./);
    expect(introLine(DATA.seasons, 's2026')).toMatch(/A gentler summer: these twenty-four cover about 11,600 km², where 2024's covered 13,500\./);
  });

  it('2025 beats chance by a thin margin of two graves; 2024 and 2026 have none', () => {
    expect(margin(s2025)).toBe(2);
    expect(margin(s2024)).toBeNull();
    expect(margin(s2026)).toBeNull();
    expect(verdictView(s2025, [], false).detail).toContain('A thin margin: two fewer and I would have called it chance.');
  });

  it('2026 is the quiet year; 2024 and 2025 are zombie years', () => {
    expect([s2024.zombie, s2025.zombie, s2026.zombie]).toEqual([true, true, false]);
    expect(verdictView(s2026, [], false).line).toBe(`${word(2)} of twenty-four rose. Chance alone would have raised three.\nThese were ordinary spring fires, not the dead walking. I do not cry wolf.`);
    expect(verdictView(s2024, [], false).detail).toContain('These scars woke 2.2 times as often as chance: a zombie year, after the fires of 2023.');
  });

  it("the Gravekeeper's guess: 3 of 3 in 2024, 2 in 2025, 0 in 2026", () => {
    expect(gravekeeperGuess(s2024)).toEqual(['G-01', 'G-02', 'G-03']);
    expect([s2024, s2025, s2026].map((s) => wagerScore(s, []).guess)).toEqual([3, 2, 0]);
  });

  it('beat 1 names the lead and its own day count; a line lasts long enough to read', () => {
    expect(risingLine({ ids: ['G-10'], lead: 'G-10', days: [16], beat: 1, year: 2024 }, 0, [])).toBe(
      'G-10. I buried it last autumn, under the fires of 2023. The snow let go of it 16 days ago.\nIt was not ready to stay down.');
    expect(risingLine({ ids: ['G-13', 'G-24'], lead: 'G-13', days: [0, 26], beat: null, year: 2024 }, 1, [])).toBe('Another. G-13, 0 days after the thaw.');
    expect(risingLine({ ids: ['G-10'], lead: 'G-10', days: [16], beat: null, year: 2024 }, 0, ['G-10'])).toBe('Your mark, G-10. It walks. My lantern burns brighter for you.');
    const l = line('abc', 1000);
    expect(l.until - l.start).toBe(4800);
  });

  it('clue card for 2024 G-10 reads only its published values', () => {
    const g = s2024.graves.find((x) => x.id === 'G-10')!;
    const c = clueCard(g, 2024);
    expect(c.thaw).toBe(`Snow left ${fmtDay(g.melt, 2024)}`);
    expect(c.footprint).toBe(`Footprint ≈ ${km2(g.size)} km²`);
  });
});
