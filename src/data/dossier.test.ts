// Spec 07 Properties 5, 6 and 8 for the dossier, and the published 2024 G-03.
import { render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import fc from 'fast-check';
import { afterEach, describe, expect, it, vi } from 'vitest';
import seasonsRaw from '../../public/data/seasons.json';
import { Dossier } from '../scenes/Dossier';
import { DEFAULT, dossierView, kml, lateSnowBands, parseHash } from './dossier';
import { coords, fmtDay, km2, lat, lon } from './format';
import { parseSeasons } from './load';
import { SEASON_KEYS } from './types';

const DATA = parseSeasons(seasonsRaw);
const nums = (s: string) => s.replace(/(\d),(\d)/g, '$1$2').match(/\d+(\.\d+)?/g) ?? [];

describe('Spec 07 dossier properties', () => {
  it('Property 6: late-snow bands are real (Req 5.5)', () => {
    const series = fc.array(fc.integer({ min: -1, max: 100 }), { minLength: 103, maxLength: 103 });
    fc.assert(fc.property(series, fc.integer({ min: -1, max: 102 }), fc.option(fc.integer({ min: 0, max: 102 }), { nil: null }), (s, melt, riseRaw) => {
      const rise = riseRaw === null || melt < 0 ? null : Math.max(melt, riseRaw);
      const bands = lateSnowBands(s, melt, rise);
      const end = Math.min(103, rise ?? melt + 51);
      const want = melt < 0 ? [] : Array.from({ length: 103 }, (_, d) => d).filter((d) => d > melt && d < end && s[d]! >= 15);
      const got = bands.flatMap((b) => Array.from({ length: b.to - b.from + 1 }, (_, i) => b.from + i));
      expect(got).toEqual(want);
      for (let i = 1; i < bands.length; i++) expect(bands[i]!.from).toBeGreaterThan(bands[i - 1]!.to + 1);
    }), { numRuns: 300 });
  });

  it('Property 5: every number in the dossier text is published or derived from published fields (Req 5.2–5.7)', () => {
    for (const k of SEASON_KEYS) {
      for (const g of DATA.seasons[k].graves) {
        const v = dossierView(DATA, k, g.id)!;
        const y = DATA.seasons[k].year;
        const allowed = new Set<string>([String(y), String(y - 1), String(y).slice(2), g.id.slice(2), String(Number(g.id.slice(2))),
          ...nums(km2(g.size)), ...nums(coords(g.cx, g.cy)), String(DATA.meta.proximity_km), ...nums(DATA.static.toLocaleString('en-US')),
          '15', '50', '375', '2021', '1', '21', '10', '0', '100']);
        const day = (d: number) => nums(fmtDay(d, y)).forEach((n) => allowed.add(n));
        for (let d = 0; d <= 102; d++) { if (g.snow[d]! >= 0) allowed.add(String(g.snow[d])); }
        if (g.melt >= 0) { day(g.melt); day(Math.min(102, g.melt + 50)); for (let d = 0; d <= 102; d++) { day(d); allowed.add(String(Math.abs(d - g.melt))); } }
        if (g.rise) { day(g.rise.day); nums(coords(g.rise.x, g.rise.y)).forEach((n) => allowed.add(n)); for (let d = 0; d <= 102; d++) allowed.add(String(Math.abs(d - g.rise.day))); }
        const text = [v.kicker, v.title, v.lede, v.credit, v.chart.caption, v.chart.aria, v.chart.meltLabel, v.chart.riseLabel,
          ...v.crops.flatMap((c) => [c.title, c.caption, c.alt]), ...v.checks.flatMap((c) => [c.title, c.detail]),
          ...v.life.flatMap((l) => [l.date, l.state, l.text]), ...v.sightings.flatMap((r) => [r.date, r.where, r.days])].join(' ');
        for (const n of nums(text)) expect(allowed.has(n), `${k} ${g.id}: ${n} in "${text.slice(0, 80)}…"`).toBe(true);
      }
    }
  });

  it('Property 8: the KML points invert to the grave\u2019s grid points within 0.5 px (Req 5.8)', () => {
    for (const k of SEASON_KEYS) {
      for (const g of DATA.seasons[k].graves) {
        const doc = kml(dossierView(DATA, k, g.id)!);
        const pts = [...doc.matchAll(/<coordinates>(-?[\d.]+),(-?[\d.]+),0<\/coordinates>/g)].map((m) => [Number(m[1]), Number(m[2])]);
        expect(pts).toHaveLength(g.rise ? 2 : 1);
        const want = g.rise ? [[g.cx, g.cy], [g.rise.x, g.rise.y]] : [[g.cx, g.cy]];
        pts.forEach(([lo, la], i) => {
          expect(Math.abs(((lo! + 126) / 17) * 1060 - want[i]![0]!)).toBeLessThan(0.5);
          expect(Math.abs(((60 - la!) / 6) * 716 - want[i]![1]!)).toBeLessThan(0.5);
        });
        expect(doc).toContain('not the scar outline');
        expect(lon(g.cx)).toBeLessThan(0);
        expect(lat(g.cy)).toBeGreaterThan(53);
      }
    }
  });

  it('parseHash reads only #season/G-nn', () => {
    expect(parseHash('#s2025/G-07')).toEqual({ season: 's2025', id: 'G-07' });
    for (const bad of ['', '#', '#s2027/G-01', '#s2024/G-3', '#s2024', '?season=s2024']) expect(parseHash(bad)).toBeNull();
  });
});

describe('Published 2024 G-03', () => {
  const v = dossierView(DATA, 's2024', 'G-03')!;

  it('melt Apr 15, rise May 26, 41 days, northern Alberta, no late snow', () => {
    expect(v.state).toBe('risen');
    expect(v.kicker).toMatch(/^RISEN · MAY 26, 2024 · 59\.\d\d°N 112\.\d\d°W$/);
    expect(v.lede).toContain('northern Alberta');
    expect(v.checks[1]!.detail).toBe('Snow left the scar Apr 15; heat returned 41 days later.');
    expect(v.sightings).toEqual([{ date: 'May 26, 2024', where: coords(860, 42).replace('  ', ' '), days: '41' }]);
    expect(v.chart.late).toEqual([]);
    expect(v.chart.caption).toBe('The teal band is the 50-day watch. Heat returned on May 26, 41 days after the snow left.');
    expect(v.life.map((l) => l.state)).toEqual(['Burned', 'Buried', 'Stirred', 'Rose']);
    expect(v.life[0]!.text).toContain('third-largest scar of 2023');
  });

  it('the page renders it from the published file, with the dossier hash only', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(seasonsRaw))));
    window.location.hash = '#s2024/G-03';
    render(createElement(Dossier));
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Grave G-03'));
    expect(screen.getByText('Snow left the scar Apr 15; heat returned 41 days later.')).toBeTruthy();
    // The board has two: in the hero and under the sightings.
    const send = screen.getAllByRole('link', { name: 'Send to field crew' });
    expect(send.map((a) => a.getAttribute('href'))).toEqual(['phone.html#s2024/G-03', 'phone.html#s2024/G-03']);
    expect(screen.getByText('Revenant has no crew reports; crews confirm on the ground.')).toBeTruthy();
    expect(DEFAULT).toEqual({ season: 's2024', id: 'G-03' });
  });
});

afterEach(() => { vi.unstubAllGlobals(); window.location.hash = ''; });
