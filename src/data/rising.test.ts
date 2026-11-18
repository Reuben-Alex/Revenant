// Spec 05 Correctness Properties 1–5 (design.md) and examples against the published file.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import seasonsRaw from '../../public/data/seasons.json';
import { PERIOD_MS, type Speed } from './derive';
import { fissuresPath } from './geometry';
import { parseSeasons } from './load';
import {
  BEATS, FLASH_GAP_MS, HOLD_BEAT_MS, HOLD_MS, MAX_BELLS, ZOOM, cameraTransform, planRising, risingsIn, stingView, type PlanInput,
} from './rising';
import type { Grave, SeasonData } from './types';

const DATA = parseSeasons(seasonsRaw);
const RUNS = { numRuns: 300 };

const graveArb: fc.Arbitrary<Grave> = fc
  .record({
    cx: fc.integer({ min: 0, max: 1059 }),
    cy: fc.integer({ min: 0, max: 715 }),
    melt: fc.integer({ min: -1, max: 102 }),
    rise: fc.option(fc.integer({ min: 0, max: 50 }), { nil: null }),
    rx: fc.integer({ min: 0, max: 1060 }),
    ry: fc.integer({ min: 0, max: 716 }),
  })
  .map((r) => {
    const day = r.melt >= 0 && r.rise !== null ? Math.min(102, r.melt + r.rise) : null;
    return { id: 'G-00', size: 100, cx: r.cx, cy: r.cy, melt: r.melt, early: 0, snow: [], rise: day === null ? null : { day, x: r.rx, y: r.ry } };
  });

const seasonArb: fc.Arbitrary<SeasonData> = fc.array(graveArb, { minLength: 1, maxLength: 24 }).map((gs) => {
  const graves = gs.map((g, i) => ({ ...g, id: `G-${String(i + 1).padStart(2, '0')}` }));
  return { key: 's2024', year: 2024, graves, fires: [], chance: 0.2, zombie: false, risen: graves.filter((g) => g.rise).length };
});

const dayArb = fc.integer({ min: 0, max: 102 });
const speedArb = fc.constantFrom<Speed>(...(Object.keys(PERIOD_MS) as Speed[]));
const inputArb: fc.Arbitrary<PlanInput> = fc.record({
  season: seasonArb, from: dayArb, to: dayArb, played: fc.boolean(), beatsSoFar: fc.integer({ min: 0, max: BEATS }),
  speed: speedArb, lantern: fc.boolean(), compare: fc.boolean(),
  now: fc.integer({ min: 0, max: 1e7 }), lastFlash: fc.oneof(fc.constant(-Infinity), fc.integer({ min: 0, max: 1e7 })),
});

describe('Correctness properties', () => {
  it('Property 1: a rising is exactly the published rises in the step (Req 1.1, 1.2, 2.2)', () => {
    fc.assert(fc.property(inputArb, (i) => {
      const expected = i.season.graves.filter((g) => g.rise && g.rise.day > i.from && g.rise.day <= i.to);
      const p = planRising(i);
      if (i.to <= i.from || expected.length === 0) {
        expect(p).toBeNull();
        return;
      }
      expect(p).not.toBeNull();
      expect(p!.graves.map((g) => g.id)).toEqual(expected.map((g) => g.id));
      expect(p!.lead.id).toBe(expected[0]!.id);
      p!.graves.forEach((g, k) => {
        expect(p!.days[k]).toBe(g.rise!.day - g.melt);
        expect(p!.days[k]).toBeGreaterThanOrEqual(0);
      });
      const s = stingView(p!, i.season.year);
      p!.graves.forEach((g, k) => expect(s.detail).toContain(p!.graves.length > 1 ? `${g.id} DAY ${p!.days[k]}` : `DAY ${p!.days[k]}`));
    }), RUNS);
  });

  it('Property 2: beats and camera follow the gates (Req 1.3, 3.1, 3.5)', () => {
    fc.assert(fc.property(inputArb, (i) => {
      const p = planRising(i);
      if (!p) return;
      const beat = i.played && i.beatsSoFar < BEATS;
      expect(p.beat).toBe(beat ? i.beatsSoFar + 1 : null);
      const cam = i.played && !i.lantern && !i.compare && (beat || i.speed !== '2');
      expect(p.camera !== null).toBe(cam);
      if (!i.played) expect([p.beat, p.camera, p.bells]).toEqual([null, null, 0]);
      if (p.camera) {
        expect(p.camera.until - i.now).toBe(beat ? HOLD_BEAT_MS : HOLD_MS);
        expect([p.camera.x, p.camera.y, p.camera.id]).toEqual([p.lead.rise!.x, p.lead.rise!.y, p.lead.id]);
      }
    }), RUNS);
  });

  it('Property 2: applying any sequence of plans never takes beats above 3 (Req 1.4)', () => {
    fc.assert(fc.property(seasonArb, fc.array(fc.tuple(dayArb, fc.boolean()), { maxLength: 60 }), (season, steps) => {
      let beats = 0;
      let day = 0;
      for (const [to, played] of steps) {
        const p = planRising({ season, from: day, to, played, beatsSoFar: beats, speed: '1', lantern: false, compare: false, now: 0, lastFlash: -Infinity });
        if (p?.beat) beats += 1;
        expect(beats).toBeLessThanOrEqual(BEATS);
        day = to;
      }
    }), RUNS);
  });

  it('Property 3: the camera never shows the map edge (Req 3.2)', () => {
    fc.assert(fc.property(fc.double({ min: 0, max: 1060, noNaN: true }), fc.double({ min: 0, max: 716, noNaN: true }), (x, y) => {
      const { tx, ty, scale } = cameraTransform(x, y);
      expect(scale).toBe(ZOOM);
      for (const [t, p] of [[tx, (x / 1060) * 100], [ty, (y / 716) * 100]] as const) {
        expect(t).toBeGreaterThanOrEqual(100 - 100 * ZOOM - 1e-9);
        expect(t).toBeLessThanOrEqual(1e-9);
        const onScreen = t + ZOOM * p;
        expect(onScreen).toBeGreaterThanOrEqual(-1e-9);
        expect(onScreen).toBeLessThanOrEqual(100 + 1e-9);
        if (t > 100 - 100 * ZOOM && t < 0) expect(onScreen).toBeCloseTo(50, 9);
      }
    }), RUNS);
  });

  it('Property 4: bells are bounded (Req 5.3)', () => {
    fc.assert(fc.property(inputArb, (i) => {
      const p = planRising(i);
      if (!p) return;
      if (!p.camera) {
        expect(p.bells).toBe(0);
        return;
      }
      const risen = i.season.graves.filter((g) => g.rise && g.rise.day <= i.to).length;
      expect(p.bells).toBe(Math.min(MAX_BELLS, risen));
      expect(p.bells).toBeGreaterThanOrEqual(1);
      expect(p.bells).toBeLessThanOrEqual(MAX_BELLS);
    }), RUNS);
  });

  it('Property 5: no more than one flash per second (Req 2.4, 5.2)', () => {
    fc.assert(fc.property(seasonArb, fc.array(fc.tuple(dayArb, fc.integer({ min: 0, max: 1500 })), { maxLength: 60 }), (season, steps) => {
      let now = 0;
      let day = 0;
      let lastFlash = -Infinity;
      const flashes: number[] = [];
      for (const [to, dt] of steps) {
        now += dt;
        const p = planRising({ season, from: day, to, played: true, beatsSoFar: 0, speed: '2', lantern: false, compare: false, now, lastFlash });
        if (p?.flash) { flashes.push(now); lastFlash = now; }
        day = to;
      }
      for (let k = 1; k < flashes.length; k++) expect(flashes[k]! - flashes[k - 1]!).toBeGreaterThanOrEqual(FLASH_GAP_MS);
    }), RUNS);
  });
});

describe('Examples from the published file', () => {
  const s = DATA.seasons.s2024;
  const base = { season: s, played: true, beatsSoFar: 0, speed: '1' as Speed, lantern: false, compare: false, now: 0, lastFlash: -Infinity };

  it('the first Spring 2024 rising is G-10 on Apr 7, 16 days after its snow left: beat 1, one bell', () => {
    const p = planRising({ ...base, from: 16, to: 17 })!;
    expect([p.lead.id, p.lead.rise!.day, p.days[0], p.beat, p.bells]).toEqual(['G-10', 17, 16, 1, 1]);
    expect(p.camera).toMatchObject({ id: 'G-10', until: HOLD_BEAT_MS });
    expect(stingView(p, 2024)).toMatchObject({ title: 'G-10 has risen', detail: 'APR 7 · DAY 16 AFTER SNOWMELT' });
  });

  it('day 30 raises two graves, each with its own day count', () => {
    const p = planRising({ ...base, from: 29, to: 30, beatsSoFar: 3, speed: '2' })!;
    expect(p.graves.map((g) => g.id)).toEqual(['G-13', 'G-24']);
    expect(p.days).toEqual([0, 26]);
    expect(p.camera).toBeNull(); // after the three beats, 2× speed skips the zoom
    const v = stingView(p, 2024);
    expect(v.title).toBe('2 graves have risen');
    expect(v.detail).toBe('APR 20 · G-13 DAY 0 · G-24 DAY 26 AFTER SNOWMELT');
  });

  it('scrubbing across April gives the sting only', () => {
    const p = planRising({ ...base, from: 0, to: 40, played: false })!;
    expect(p.graves).toHaveLength(risingsIn(s, 0, 40).length);
    expect([p.beat, p.camera, p.bells]).toEqual([null, null, 0]);
  });

  it('draws nine fissures', () => {
    expect(fissuresPath(100, 100).match(/M/g)).toHaveLength(9);
  });
});
