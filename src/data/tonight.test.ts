// Spec 07 Correctness Properties 2 and 3 (design.md) and examples against the published files.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import seasonsRaw from '../../public/data/seasons.json';
import tonightRaw from '../../public/data/tonight.json';
import { fmtDay } from './format';
import { parseSeasons, parseTonight } from './load';
import * as copy from '../copy/tonight';
import { initialState, reducer } from '../scenes/useGraveyard';
import { coords } from './format';
import {
  STALE_MS, cardLines, keepNeed, keepWatchScore, meltSpread, rankedWarm, staleness, tonightFooter, tonightLine, tonightTab, wakeView, watchList,
} from './tonight';
import type { SeasonData, SeasonKey } from './types';

const DATA = parseSeasons(seasonsRaw);
const T = parseTonight(tonightRaw);
const H = 3600 * 1000;

describe('Spec 07 properties', () => {
  it('Property 2: staleness is exact; LIVE only when fresh (Req 1.3)', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 30 * 24 * H }), (age) => {
      const now = Date.parse(T.asOf) + age;
      const s = staleness(T.asOf, now);
      expect(s.stale).toBe(age > STALE_MS);
      expect(s.days).toBe(Math.floor(age / (24 * H)));
      expect(tonightTab(T, now).startsWith('LIVE')).toBe(!s.stale);
    }), { numRuns: 400 });
  });

  it('Property 3: the wake window is made of published melt days (Req 3.1, 3.2)', () => {
    const graves = fc.array(fc.integer({ min: -1, max: 102 }), { maxLength: 30 });
    fc.assert(fc.property(graves, graves, graves, (a, b, c) => {
      const mk = (melts: number[]) => ({ graves: melts.map((melt) => ({ melt })) }) as unknown as SeasonData;
      const seasons = { s2024: mk(a), s2025: mk(b), s2026: mk(c) } as Record<SeasonKey, SeasonData>;
      const all = [...a, ...b, ...c].filter((d) => d >= 0);
      const s = meltSpread(seasons);
      if (all.length < 4) { expect(s).toBeNull(); return; }
      expect(s).not.toBeNull();
      expect(s!.q1 <= s!.median && s!.median <= s!.q3).toBe(true);
      for (const d of [s!.q1, s!.median, s!.q3]) expect(all).toContain(d);
      expect(s!.n).toBe(all.length);
    }), { numRuns: 300 });
  });
});

describe('Published examples', () => {
  it('the wake window is Apr 14 – May 2, 2027 (72 melt days, median Apr 21)', () => {
    expect(meltSpread(DATA.seasons)).toEqual({ q1: 24, median: 31, q3: 42, n: 72 });
    const w = wakeView(DATA.seasons, T);
    expect(w.window).toBe('Apr 14 – May 2, 2027');
    expect(w.month).toBe('April');
    const nights = Math.round((Date.UTC(2027, 2, 21) + 31 * 86400000 - Date.parse(T.asOf)) / 86400000);
    expect(w.nights).toBe(`about ${nights} nights from Nov ${new Date(T.asOf).getUTCDate()} to ${fmtDay(31, 2027)}`);
  });

  it('the Gravekeeper counts the still-warm scars, or says the data is stale', () => {
    const warm = T.scars.filter((s) => s.late > 0).length;
    const fresh = tonightLine(DATA.seasons, T, Date.parse(T.asOf) + H);
    expect(fresh).toMatch(new RegExp(`^Tonight I am burying the fires of 2026\\. \\w[\\w-]* of them were still warm in the last two weeks\\.\\nI will be watching them in April\\.$`));
    expect(warm).toBe(9);
    const stale = tonightLine(DATA.seasons, T, Date.parse(T.asOf) + 3 * 24 * H + H);
    expect(stale).toBe(`The satellites have not spoken to me for three days. What you see is from Nov ${T.pointsThrough.slice(8).replace(/^0/, '')}.`);
  });

  it('the footer stamps the data and says when it is stale', () => {
    const f = tonightFooter(DATA.seasons, T, Date.parse(T.asOf) + 72 * H);
    expect(f.asOf).toMatch(/^Data as of Nov \d+, 2026, \d\d:\d\d UTC$/);
    expect(f.stale).toBe('Not updated for 3 days');
    expect(tonightFooter(DATA.seasons, T, Date.parse(T.asOf) + H).stale).toBeNull();
    expect(f.snapshot).toContain('snow, last 3 days');
  });

  it('the watch list is the published order', () => {
    expect(watchList(T).map((s) => s.id)).toEqual(T.watch.map((i) => T.scars[i]!.id));
  });
});

describe('Keep watch (spec 07 Requirement 4)', () => {
  const warmIds = T.scars.filter((s) => s.late > 0).map((s) => s.id);
  const idArb = fc.constantFrom(...T.scars.map((s) => s.id));

  it('Property 4: lanterns only on still-warm scars, at most the need; k is the overlap; lines never promise a return', () => {
    fc.assert(fc.property(fc.array(idArb, { maxLength: 12 }), (presses) => {
      let s = { ...initialState({ scene: 'tonight', day: 0 }) };
      const need = keepNeed(T);
      for (const id of presses) s = reducer(s, { type: 'keepMark', id, warm: warmIds.includes(id), need });
      const marks = s.keep!.marks;
      expect(marks.every((id) => warmIds.includes(id))).toBe(true);
      expect(marks.length).toBeLessThanOrEqual(need);
      expect(new Set(marks).size).toBe(marks.length);
      const { k, top } = keepWatchScore(marks, T);
      expect(k).toBe(marks.filter((id) => top.includes(id)).length);
      expect(k >= 0 && k <= 3).toBe(true);
      const sealed = reducer(s, { type: 'keepSeal', need });
      expect(sealed.keep!.sealed).toBe(marks.length === need);
      for (let j = 0; j <= 3; j++) {
        expect(copy.keep.sealed(j)).toContain('crews confirm');
        expect(copy.keep.sealed(j)).not.toMatch(/will (return|rise|burn)/i);
      }
    }), { numRuns: 300 });
  });

  it('the ranking held to the same choice: the first three still-warm scars of `watch`', () => {
    const top = rankedWarm(T);
    expect(top).toHaveLength(3);
    expect(top.every((id) => warmIds.includes(id))).toBe(true);
    const order = T.watch.map((i) => T.scars[i]!.id).filter((id) => warmIds.includes(id));
    expect(top).toEqual(order.slice(0, 3));
    expect(keepWatchScore(top, T).k).toBe(3);
  });

  it('Property 5: the card carries only published numbers (Req 4.5)', () => {
    fc.assert(fc.property(fc.subarray(warmIds, { minLength: 3, maxLength: 3 }), (marks) => {
      const l = cardLines(marks, T);
      const allowed = new Set<string>();
      const add = (s: string) => (s.replace(/(\d),(\d)/g, '$1$2').match(/\d+(\.\d+)?/g) ?? []).forEach((n) => allowed.add(n));
      for (const id of marks) {
        const s = T.scars.find((x) => x.id === id)!;
        add(String(s.late)); add(coords(s.cx, s.cy)); add(id);
      }
      add(T.asOf.slice(0, 10).replace(/-0?/g, ' ')); add(String(new Date(T.asOf).getUTCDate())); add('2027'); add(String(keepWatchScore(marks, T).k));
      for (const id of rankedWarm(T)) add(id);
      add(T.credit);
      const text = [l.kicker, l.title, ...l.rows.flatMap((r) => [r.id, r.line]), l.result, l.caveat, l.sealed, l.credit].join(' ');
      for (const n of text.replace(/(\d),(\d)/g, '$1$2').match(/\d+(\.\d+)?/g) ?? []) expect(allowed.has(n)).toBe(true);
      expect(l.caveat).toBe('Late heat can be slash-pile burning; crews confirm.');
    }), { numRuns: 100 });
  });
});
