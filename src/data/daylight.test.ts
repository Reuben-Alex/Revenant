// Spec 04 Correctness Properties 1, 2, 3 and 5 (design.md), and examples against the published file.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import seasonsRaw from '../../public/data/seasons.json';
import * as copy from '../copy/daylight';
import {
  SCALE_60KM_PCT, WEEK_DAYS, areaSnow, dayZeroLabel, daylightView, reignitedByDayZero, snowAverage, weekRange,
} from './daylight';
import { fmtDay, km2 } from './format';
import { KEYFRAMES, FRAME_SATELLITE, type Keyframe } from './imagery';
import { parseSeasons } from './load';
import type { Grave, SeasonData } from './types';

const DATA = parseSeasons(seasonsRaw);
const RUNS = { numRuns: 200 };

const graveArb: fc.Arbitrary<Grave> = fc
  .record({
    size: fc.integer({ min: 1, max: 20000 }),
    cx: fc.integer({ min: 0, max: 1059 }),
    cy: fc.integer({ min: 0, max: 715 }),
    rise: fc.option(fc.integer({ min: 0, max: 102 }), { nil: null }),
    // Bias towards missing values so "no valid day" cases occur.
    snow: fc.array(fc.oneof(fc.constant(-1), fc.integer({ min: -1, max: 100 })), { minLength: 103, maxLength: 103 }),
  })
  .map((r) => ({
    id: 'G-00', size: r.size, cx: r.cx, cy: r.cy, melt: 0, early: 0, snow: r.snow,
    rise: r.rise === null ? null : { day: r.rise, x: r.cx, y: r.cy },
  }));

const seasonArb: fc.Arbitrary<SeasonData> = fc.array(graveArb, { minLength: 1, maxLength: 24 }).map((gs) => {
  const graves = gs.map((g, i) => ({ ...g, id: `G-${String(i + 1).padStart(2, '0')}` }));
  return { key: 's2024', year: 2024, graves, fires: [], chance: 0.3, zombie: false, risen: graves.filter((g) => g.rise).length };
});

const keyframeArb: fc.Arbitrary<Keyframe> = fc.integer({ min: 0, max: 102 }).map((d) => ({ src: '/img/x.webp', day: d, label: fmtDay(d, 2024) }));

const valid = (g: Grave) => g.snow.slice(0, WEEK_DAYS).filter((v) => v >= 0);
const digitRuns = (s: string) => s.replace(/(\d),(\d)/g, '$1$2').match(/\d+/g) ?? [];

/** Every string the daylight view and title card can show. */
function allStrings(view: ReturnType<typeof daylightView>): string[] {
  const fixed: string[] = [];
  const walk = (o: unknown) => {
    if (typeof o === 'string') fixed.push(o);
    else if (o && typeof o === 'object') Object.values(o).forEach(walk);
  };
  walk(copy);
  return [
    ...fixed,
    ...Object.values(view.text),
    ...view.rows.flatMap((r) => [r.id, r.line, r.pill]),
    ...view.dots.map((d) => d.id),
  ];
}

describe('Correctness properties', () => {
  it('Property 1: area snow is the opening-week mean (Req 3.2)', () => {
    fc.assert(fc.property(graveArb, (g) => {
      const v = valid(g);
      const a = areaSnow(g);
      if (v.length === 0) {
        expect(a).toBeNull();
      } else {
        expect(a).not.toBeNull();
        expect(a!).toBeGreaterThanOrEqual(0);
        expect(a!).toBeLessThanOrEqual(100);
        expect(a).toBe(Math.round(v.reduce((x, y) => x + y, 0) / v.length));
      }
    }), RUNS);
  });

  it('Property 2: the average ignores missing areas (Req 3.3)', () => {
    fc.assert(fc.property(fc.array(fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }), { maxLength: 24 }), (areas) => {
      const v = areas.filter((x): x is number => x !== null);
      const avg = snowAverage(areas);
      if (v.length === 0) {
        expect(avg).toBeNull();
      } else {
        expect(avg).toBe(Math.round(v.reduce((x, y) => x + y, 0) / v.length));
        expect(avg!).toBeGreaterThanOrEqual(Math.min(...v));
        expect(avg!).toBeLessThanOrEqual(Math.max(...v));
      }
    }), RUNS);
  });

  it('Property 3: all clear means no re-ignition (Req 3.4–3.6)', () => {
    fc.assert(fc.property(seasonArb, keyframeArb, (s, k) => {
      const view = daylightView(s, k, 'S-NPP', 591);
      const early = s.graves.filter((g) => g.rise !== null && g.rise.day <= 0).length;
      expect(view.reignited).toBe(early);
      expect(view.clear).toBe(early === 0);
      expect(view.total).toBe(s.graves.length);
      expect(view.reignited + s.graves.filter((g) => !reignitedByDayZero(g)).length).toBe(view.total);
      expect(view.covered).toBeLessThanOrEqual(view.total);
      expect(view.text.headline).toBe(early === 0 ? copy.status.clear : copy.status.notClear(early));
      expect(view.text.status).not.toMatch(/season has not begun|hotspots in the region/i);
    }), RUNS);
  });

  it('Property 5: no number without a source (Req 3.9)', () => {
    fc.assert(fc.property(seasonArb, keyframeArb, fc.integer({ min: 0, max: 5000 }), (s, k, st) => {
      const view = daylightView(s, k, 'S-NPP', st);
      const allowed = new Set<string>([
        // inputs and values derived from them
        String(view.reignited), String(view.total), String(view.covered), String(st),
        ...(view.snowAvg === null ? [] : [String(view.snowAvg)]),
        ...view.areas.filter((v): v is number => v !== null).map(String),
        ...s.graves.flatMap((g) => digitRuns(km2(g.size))),
        ...s.graves.flatMap((g) => digitRuns(g.id)),
        ...digitRuns(view.text.date), ...digitRuns(weekRange(s.year)), ...digitRuns(k.label),
        String(s.year), String(s.year - 1),
        // fixed labels: the brief's "19:00", the 60 km scale, the 375 m sensor, Scholten et al. 2021
        '19', '00', '60', '375', '2021',
      ]);
      for (const str of allStrings(view)) {
        for (const run of digitRuns(str)) expect(allowed, `"${run}" in "${str}"`).toContain(run);
      }
    }), RUNS);
  });
});

describe('Examples', () => {
  it('labels day 0 of Spring 2024 in UTC', () => {
    expect(dayZeroLabel(2024)).toBe('Thu, Mar 21, 2024');
    expect(weekRange(2024)).toBe('Mar 21–27');
  });

  it('sizes the 60 km scale bar from the grid', () => {
    expect(SCALE_60KM_PCT).toBeCloseTo(5.82, 2);
  });

  it('matches the published Spring 2024 values', () => {
    const v = daylightView(DATA.seasons.s2024, KEYFRAMES.s2024[0]!, FRAME_SATELLITE.s2024, DATA.static);
    expect(v.total).toBe(24);
    expect(v.reignited).toBe(0);
    expect(v.clear).toBe(true);
    expect(v.snowAvg).toBe(80);
    expect(v.covered).toBe(20);
    expect(v.dots.filter((d) => d.label)).toHaveLength(8);
    expect(v.rows.map((r) => r.id)).toEqual(['BA-01', 'BA-02', 'BA-03', 'BA-04', 'BA-05']);
    expect(v.text).toMatchObject({
      chip: 'Spring 2024 archive',
      headline: 'All clear',
      status: "No burn area has re-ignited. Snow still covers 20 of last year's 24 burn areas.",
      areasSub: 'all inactive',
      snow: '80%',
      snowSub: 'avg, Mar 21–27',
      layerScars: '2023 burned areas (NBAC)',
      imageCredit: 'Imagery NASA GIBS · VIIRS S-NPP · Mar 25, 2024',
      titleLine2: `> ignoring ${DATA.static} static heat sources ........... listening for heat`,
    });
  });
});
