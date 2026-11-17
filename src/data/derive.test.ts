// Correctness Properties 1–8 (spec 03 design.md) and example checks against the published files.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import seasonsRaw from '../../public/data/seasons.json';
import tonightRaw from '../../public/data/tonight.json';
import * as copy from '../copy/graveyard';
import {
  CALLOUT_H, CALLOUT_W, H, W, calloutBox, cardList, countStates, crossfade, exhumation, graveViews, headlineFor,
  registerNote, registerRows, riseMarks, snowCurve, tonightViews,
} from './derive';
import { parseSeasons, parseTonight } from './load';
import { displayState } from './state';
import type { Grave, SeasonData } from './types';

const DATA = parseSeasons(seasonsRaw);
const TONIGHT = parseTonight(tonightRaw);

const graveArb: fc.Arbitrary<Grave> = fc
  .record({
    size: fc.integer({ min: 1, max: 6000 }),
    cx: fc.integer({ min: 0, max: 1059 }),
    cy: fc.integer({ min: 0, max: 715 }),
    melt: fc.integer({ min: -1, max: 102 }),
    riseOffset: fc.option(fc.integer({ min: 0, max: 50 }), { nil: null }),
    snow: fc.array(fc.integer({ min: -1, max: 100 }), { minLength: 103, maxLength: 103 }),
  })
  .map((r, ) => {
    const riseDay = r.melt >= 0 && r.riseOffset !== null ? Math.min(102, r.melt + r.riseOffset) : null;
    return {
      id: 'G-00', size: r.size, cx: r.cx, cy: r.cy, melt: r.melt, early: 0, snow: r.snow,
      rise: riseDay === null ? null : { day: riseDay, x: r.cx, y: r.cy },
    };
  });

const seasonArb: fc.Arbitrary<SeasonData> = fc.array(graveArb, { minLength: 1, maxLength: 24 }).map((gs) => {
  const graves = gs.map((g, i) => ({ ...g, id: `G-${String(i + 1).padStart(2, '0')}` }));
  return { key: 's2024', year: 2024, graves, fires: [], chance: 0.3, zombie: false, risen: graves.filter((g) => g.rise).length };
});
const dayArb = fc.integer({ min: 0, max: 102 });
const RANK = { buried: 0, waking: 1, risen: 2, rest: 2 } as const;

describe('Correctness properties', () => {
  it('Property 1: display states are monotonic (Req 5.1, 5.2)', () => {
    fc.assert(fc.property(graveArb, dayArb, dayArb, (g, a, b) => {
      const [d1, d2] = a <= b ? [a, b] : [b, a];
      const s1 = displayState(d1, g.melt, g.rise);
      const s2 = displayState(d2, g.melt, g.rise);
      expect(RANK[s1]).toBeLessThanOrEqual(RANK[s2]);
      if (s1 === 'risen') expect(s2).toBe('risen');
      if (s1 === 'rest') expect(s2).toBe('rest');
    }));
  });

  it('Property 2: counts add up and the headline names the risen count (Req 8.1, 8.2)', () => {
    fc.assert(fc.property(seasonArb, dayArb, (s, d) => {
      const views = graveViews(s, d);
      const c = countStates(views);
      expect(c.buried + c.waking + c.risen + c.rest).toBe(s.graves.length);
      const h = headlineFor('s2024', views, 2024);
      if (c.risen > 0) expect(h.headline).toBe(copy.headline.risen(c.risen));
    }));
  });

  it('Property 3: crossfade weights are a partition (Req 4.2)', () => {
    const keys = fc.uniqueArray(fc.integer({ min: 0, max: 102 }), { minLength: 2, maxLength: 4 }).map((a) => [...a].sort((x, y) => x - y));
    fc.assert(fc.property(keys, dayArb, (k, d) => {
      const ws = crossfade(d, k);
      expect(ws.every((w) => w >= 0)).toBe(true);
      expect(ws.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
      const nz = ws.map((w, i) => (w > 0 ? i : -1)).filter((i) => i >= 0);
      expect(nz.length).toBeLessThanOrEqual(2);
      if (nz.length === 2) expect(nz[1]! - nz[0]!).toBe(1);
    }));
  });

  it('Property 4: the callout stays on the map (Req 7.3)', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: W }), fc.integer({ min: 0, max: H }), (x, y) => {
      const { box } = calloutBox(x, y);
      expect(box.x).toBeGreaterThanOrEqual(8);
      expect(box.y).toBeGreaterThanOrEqual(8);
      expect(box.x + CALLOUT_W).toBeLessThanOrEqual(W - 8);
      expect(box.y + CALLOUT_H).toBeLessThanOrEqual(H - 8);
    }));
  });

  it('Property 5: the list is a permutation in rule order (Req 10.1)', () => {
    const order = { risen: 0, waking: 1, buried: 2, rest: 3 } as const;
    fc.assert(fc.property(seasonArb, dayArb, (s, d) => {
      const views = graveViews(s, d);
      const cards = cardList('s2024', views, 2024);
      expect([...cards.map((c) => c.id)].sort()).toEqual([...views.map((v) => v.id)].sort());
      const st = new Map(views.map((v) => [v.id, v.st as keyof typeof order]));
      const ranks = cards.map((c) => order[st.get(c.id)!]);
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    }));
  });

  it('Property 6: timeline drips only for crossed risings (Req 12.4)', () => {
    fc.assert(fc.property(seasonArb, dayArb, (s, d) => {
      const marks = riseMarks(s, d, 2024);
      expect(marks.length).toBe(s.graves.filter((g) => g.rise).length);
      for (const m of marks) {
        const g = s.graves.find((x) => x.id === m.id)!;
        expect(m.done).toBe(d >= g.rise!.day);
      }
    }));
  });

  it('Property 7: exhumation chart geometry (Req 15.3)', () => {
    fc.assert(fc.property(seasonArb, dayArb, fc.nat(23), (s, d, k) => {
      const views = graveViews(s, d);
      const v = views[k % views.length]!;
      const ex = exhumation(v, 's2024', d, 2024, null, 1);
      for (const [, x, y] of ex.curve.matchAll(/([\d.]+) ([\d.]+)/g)) {
        expect(Number(x)).toBeGreaterThanOrEqual(0);
        expect(Number(x)).toBeLessThanOrEqual(300);
        expect(Number(y)).toBeGreaterThanOrEqual(8);
        expect(Number(y)).toBeLessThanOrEqual(58);
      }
      const known = v.grave!.snow.filter((x) => x >= 0).length;
      expect(ex.curve === '' ? 0 : ex.curve.split('L').length).toBe(known);
      if (ex.band) {
        expect(ex.band.x).toBeCloseTo((v.grave!.melt / 102) * 300, 9);
        expect(ex.band.w).toBeLessThanOrEqual((50 / 102) * 300 + 1e-9);
      }
    }));
  });

  it('Property 8: register numbers come from the published fields (Req 19.1)', () => {
    const rows = registerRows(DATA, 's2024');
    for (const r of rows) {
      const s = DATA.seasons[r.key];
      expect(r.text).toBe(`${s.risen} rose · ${Math.round(s.chance * s.graves.length)} by chance`);
      expect(r.zombie).toBe(s.zombie);
    }
    const zombies = rows.filter((r) => r.zombie).map((r) => r.year);
    const note = registerNote(DATA);
    for (const y of zombies) expect(note).toContain(String(y));
    expect(note).not.toContain('2023 beats');
  });
});

describe('published data examples', () => {
  it('2024 day 102 shows every published rise as risen', () => {
    const s = DATA.seasons.s2024;
    const c = countStates(graveViews(s, 102));
    expect(c.risen).toBe(s.risen);
  });
  it('day 0: nothing has risen', () => {
    for (const k of ['s2024', 's2025', 's2026'] as const) expect(countStates(graveViews(DATA.seasons[k], 0)).risen).toBe(DATA.seasons[k].graves.filter((g) => g.rise?.day === 0).length);
  });
  it('tonight views rank by size and late heat with published maxima', () => {
    const v = tonightViews(TONIGHT);
    expect(v.every((x) => x.score >= 0 && x.score <= 1)).toBe(true);
    expect(cardList('tonight', v, 2026)).toHaveLength(TONIGHT.scars.length);
  });
  it('snow curve skips missing days', () => {
    expect(snowCurve([100, -1, 0])).toBe('M0.0 8.0 L5.9 58.0');
  });
});
