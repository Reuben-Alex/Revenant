// Replay state (spec 03 Requirements 12.2, 12.5; spec 05 Requirements 1.4, 4, 9): the self-running clock, what makes
// it wait, risings and their hold, and Properties 6 and 7 of spec 05.
import { act, renderHook } from '@testing-library/react';
import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import seasonsRaw from '../../public/data/seasons.json';
import { PERIOD_MS } from '../data/derive';
import { parseSeasons } from '../data/load';
import { HOLD_BEAT_MS, planRising, stingView } from '../data/rising';
import type { SceneKey } from '../data/types';
import { clockMayAdvance, initialState, parseStart, reducer, useGraveyard, type UIState } from './useGraveyard';

const DATA = parseSeasons(seasonsRaw);

describe('graveyard state', () => {
  it('starts like the board, running, and reads ?season=&day= (dev only, spec 04 Req 1.3)', () => {
    const s = initialState();
    expect([s.scene, s.day, s.selected, s.speed, s.night, s.split, s.running]).toEqual(['s2024', 0, 'G-01', '1', true, 50, true]);
    const q = initialState(parseStart('?season=s2026&day=140'));
    expect([q.scene, q.day, q.running]).toEqual(['s2026', 102, false]);
    expect(parseStart('?season=bogus').scene).toBe('s2024');
    expect(initialState({ scene: 'tonight', day: 0 }).running).toBe(false);
  });

  it('advances one day per step while running and stops at 102', () => {
    let s = { ...initialState(), day: 100 };
    s = reducer(s, { type: 'advance' });
    expect([s.day, s.running, s.lastStep]).toEqual([101, true, 'play']);
    s = reducer(s, { type: 'advance' });
    expect([s.day, s.running]).toEqual([102, false]);
    expect(reducer(s, { type: 'advance' }).day).toBe(102);
  });

  it('dragging back from day 102 starts the replay again from that day (Req 9.4)', () => {
    const s = reducer({ ...initialState(), day: 102, running: false }, { type: 'day', day: 60 });
    expect([s.day, s.running, s.lastStep]).toEqual([60, true, 'scrub']);
  });

  it('switching season resets the replay and starts it', () => {
    const s = reducer({ ...initialState(), day: 50, selected: 'G-07', ex: 'G-07', beats: 3 }, { type: 'scene', scene: 's2025' });
    expect([s.scene, s.day, s.running, s.selected, s.ex, s.beats]).toEqual(['s2025', 0, true, 'G-01', null, 0]);
    expect(reducer(s, { type: 'scene', scene: 'tonight' }).running).toBe(false);
  });

  it('the wager: marks up to three, seals only with three, and a scrub past day 0 counts as Just watch (spec 06 Req 4)', () => {
    let s = initialState();
    expect([s.wager.open, s.startGate]).toEqual([true, false]);
    for (const id of ['G-01', 'G-02', 'G-03', 'G-04']) s = reducer(s, { type: 'mark', id });
    expect(s.wager.marks).toEqual(['G-01', 'G-02', 'G-03']);
    expect(reducer(reducer(s, { type: 'mark', id: 'G-02' }), { type: 'seal' }).wager.open).toBe(true); // two marks: no seal
    const sealed = reducer(s, { type: 'seal' });
    expect([sealed.wager.sealed, sealed.wager.open, sealed.startGate]).toEqual([true, false, true]);
    expect(reducer(sealed, { type: 'mark', id: 'G-09' }).wager.marks).toEqual(['G-01', 'G-02', 'G-03']);
    const scrubbed = reducer(s, { type: 'day', day: 12 });
    expect([scrubbed.wager.open, scrubbed.wager.sealed, scrubbed.wager.marks, scrubbed.startGate]).toEqual([false, false, [], true]);
    expect(reducer(sealed, { type: 'scene', scene: 's2025' }).wager).toEqual({ marks: [], sealed: false, open: true });
    expect(reducer(sealed, { type: 'scene', scene: 'tonight' }).wager.open).toBe(false);
  });

  it('the riddle: pending at beat 1, opens when the view clears, checks three, solves once (spec 06 Req 5)', () => {
    const plan = planRising({ season: DATA.seasons.s2024, from: 16, to: 17, played: true, beatsSoFar: 0, speed: '1', lantern: false, compare: false, now: 1000, lastFlash: -Infinity })!;
    const watched = reducer(initialState(), { type: 'watch' });
    let s = reducer({ ...watched, day: 17 }, { type: 'rising', plan, sting: stingView(plan, 2024), now: 1000 });
    expect(s.riddle).toEqual({ id: 'G-10', picked: [], hint: null, open: false, done: false });
    expect(clockMayAdvance({ ...s, cam: null }, 0)).toBe(true); // pending does not hold the clock by itself
    // The banner holds the view as well as the camera: the riddle waits for both.
    const stingUntil = s.sting!.until;
    s = reducer(s, { type: 'endCam', until: s.cam!.until });
    expect(s.riddle?.open).toBe(false);
    s = reducer(s, { type: 'endSting', until: stingUntil });
    expect(s.riddle?.open).toBe(true);
    expect(clockMayAdvance(s, 0)).toBe(false);
    for (const key of ['t0', 'd']) s = reducer(s, { type: 'riddlePick', key });
    expect(reducer(s, { type: 'riddleDig' }).riddle?.hint).toBe('three');
    s = reducer(s, { type: 'riddlePick', key: 't1' });
    s = reducer(s, { type: 'riddlePick', key: 't2' }); // a fourth pick is refused
    expect(s.riddle?.picked).toEqual(['t0', 'd', 't1']);
    s = reducer(s, { type: 'riddleDig' });
    expect([s.riddle?.hint, s.riddle?.open, s.riddle?.picked]).toEqual(['decoy', true, ['t0', 'd', 't1']]);
    s = reducer(reducer(s, { type: 'riddlePick', key: 'd' }), { type: 'riddlePick', key: 't2' });
    s = reducer(s, { type: 'riddleDig' });
    expect([s.riddle?.open, s.riddle?.done, s.ex, s.selected]).toEqual([false, true, 'G-10', 'G-10']);
    // A later beat 1 in the same replay does not ask again; a new replay does.
    expect(reducer({ ...s, ex: null }, { type: 'rising', plan, sting: stingView(plan, 2024), now: 2000 }).riddle?.done).toBe(true);
    expect(reducer(s, { type: 'scene', scene: 's2024' }).riddle).toBeNull();
  });

  it('scrubbing clamps to the season', () => {
    expect(reducer(initialState(), { type: 'day', day: 250 }).day).toBe(102);
    expect(reducer(initialState(), { type: 'day', day: -3 }).day).toBe(0);
  });

  it('compare is unavailable on Tonight', () => {
    const t = reducer(initialState(), { type: 'scene', scene: 'tonight' });
    expect(reducer(t, { type: 'compare' }).compare).toBe(false);
  });

  it('a rising sets the camera, the sting and the selection; ending hold actions clear the camera (Req 4.2, 4.3)', () => {
    const plan = planRising({ season: DATA.seasons.s2024, from: 16, to: 17, played: true, beatsSoFar: 0, speed: '1', lantern: false, compare: false, now: 1000, lastFlash: -Infinity })!;
    const s = reducer({ ...initialState(), day: 17 }, { type: 'rising', plan, sting: stingView(plan, 2024), now: 1000 });
    expect([s.cam?.id, s.cam?.until, s.selected, s.beats, s.lastFlash, s.sting?.title, s.sting?.flashKey]).toEqual(['G-10', 1000 + HOLD_BEAT_MS, 'G-10', 1, 1000, 'G-10 has risen', 1]);
    for (const a of [{ type: 'day', day: 30 }, { type: 'lantern' }, { type: 'compare' }, { type: 'exhume', id: 'G-10' }, { type: 'scene', scene: 's2024' }] as const) {
      expect(reducer(s, a).cam).toBeNull();
    }
    expect(reducer(s, { type: 'exhume', id: null }).cam).not.toBeNull();
    expect(reducer(s, { type: 'endCam', until: 1 }).cam).not.toBeNull(); // a stale timer doesn't end a newer hold
    expect(reducer(s, { type: 'endCam', until: s.cam!.until }).cam).toBeNull();
  });
});

const sceneArb = fc.constantFrom<SceneKey>('s2024', 's2025', 's2026', 'tonight');
const stateArb: fc.Arbitrary<UIState> = fc.record({
  scene: sceneArb, day: fc.integer({ min: 0, max: 102 }), running: fc.boolean(), dragging: fc.boolean(), startGate: fc.boolean(),
  lantern: fc.boolean(), compare: fc.boolean(), ex: fc.option(fc.constant('G-01'), { nil: null }),
  cam: fc.option(fc.integer({ min: 0, max: 20000 }), { nil: null }), beats: fc.integer({ min: 0, max: 3 }),
}).map((r) => ({
  ...initialState(), scene: r.scene, day: r.day, running: r.running, dragging: r.dragging, startGate: r.startGate,
  lantern: { on: r.lantern, x: 0, y: 0, inside: false }, compare: r.compare, ex: r.ex, beats: r.beats,
  cam: r.cam === null ? null : { id: 'G-01', x: 1, y: 1, until: r.cam },
}));

describe('Spec 05 properties', () => {
  it('Property 6: the clock waits (Req 4.1, 9.2, 9.3)', () => {
    fc.assert(fc.property(stateArb, fc.integer({ min: 0, max: 20000 }), (s, now) => {
      const expected = s.running && s.startGate && s.scene !== 'tonight' && s.ex === null && !s.lantern.on && !s.compare && !s.dragging
        && !(s.cam !== null && now < s.cam.until);
      expect(clockMayAdvance(s, now)).toBe(expected);
    }), { numRuns: 500 });
  });

  it('Property 7: the replay restarts cleanly (Req 1.4, 9.2, 9.4)', () => {
    fc.assert(fc.property(stateArb, fc.constantFrom<SceneKey>('s2024', 's2025', 's2026'), (s, k) => {
      const r = reducer(s, { type: 'scene', scene: k });
      expect([r.day, r.running, r.beats, r.cam, r.sting, r.lastFlash]).toEqual([0, true, 0, null, null, -Infinity]);
    }), { numRuns: 300 });
  });
});

describe('useGraveyard clock and risings (fake timers)', () => {
  beforeEach(() => { vi.useFakeTimers(); window.history.replaceState(null, '', '/'); });
  afterEach(() => vi.useRealTimers());

  // The clock ticks every 100 ms and moves once PERIOD_MS has built up, as the board's tick(): 7 ticks at 1×.
  const DAY_MS = Math.ceil(PERIOD_MS['1'] / 100) * 100;
  const advanceDays = (n: number) => act(() => { vi.advanceTimersByTime(n * DAY_MS); });

  it('runs by itself, holds 6 s at the first rising (G-10, day 17), then moves on', () => {
    const onRising = vi.fn();
    const { result } = renderHook(() => useGraveyard({ seasons: DATA.seasons, onRising }));
    advanceDays(5);
    expect(result.current.state.day).toBe(0); // the wager holds day 0 (spec 06 Req 4.1)
    act(() => result.current.act({ type: 'watch' }));
    advanceDays(17);
    expect(result.current.state.day).toBe(17);
    expect(result.current.state.cam?.id).toBe('G-10');
    expect(result.current.state.sting?.title).toBe('G-10 has risen');
    expect(onRising).toHaveBeenCalledWith(expect.objectContaining({ lead: 'G-10', beat: 1, camera: true, days: [16], season: 's2024', year: 2024 }));
    act(() => { vi.advanceTimersByTime(HOLD_BEAT_MS - 100); });
    expect(result.current.state.day).toBe(17);
    act(() => { vi.advanceTimersByTime(100 + DAY_MS); });
    expect(result.current.state.cam).toBeNull();
    expect(result.current.state.day).toBe(18);
  });

  it('waits while an exhumation is open, and opening it ends the hold', () => {
    const { result } = renderHook(() => useGraveyard({ seasons: DATA.seasons }));
    act(() => result.current.act({ type: 'watch' }));
    advanceDays(17);
    expect(result.current.state.cam).not.toBeNull();
    act(() => result.current.act({ type: 'exhume', id: 'G-10' }));
    expect(result.current.state.cam).toBeNull();
    advanceDays(20);
    expect(result.current.state.day).toBe(17);
    act(() => result.current.act({ type: 'exhume', id: null }));
    // The riddle on G-10 was waiting for the view to clear (spec 06 Req 5.1); the clock waits while it is open.
    expect(result.current.state.riddle).toMatchObject({ id: 'G-10', open: true });
    advanceDays(3);
    expect(result.current.state.day).toBe(17);
    act(() => result.current.act({ type: 'riddleLeave' }));
    advanceDays(1);
    expect(result.current.state.day).toBe(18);
  });

  it('the lantern hunt finds a fire when the lantern comes near, names it, and resets with the season (spec 06 Req 6)', () => {
    const { result } = renderHook(() => useGraveyard({ seasons: DATA.seasons }));
    act(() => result.current.act({ type: 'day', day: 60 }));
    act(() => result.current.act({ type: 'lantern' }));
    const f = DATA.seasons.s2024.fires.find((x) => x.day <= 60)!;
    act(() => result.current.act({ type: 'lanternMove', x: f.x + 300, y: f.y, inside: true }));
    expect(result.current.state.found).not.toContain(f.id);
    act(() => result.current.act({ type: 'lanternMove', x: f.x + 20, y: f.y, inside: true }));
    expect(result.current.state.found).toContain(f.id);
    expect(result.current.state.say?.text).toMatch(/not mine|found\. Not one/);
    const n = result.current.state.found.length;
    act(() => result.current.act({ type: 'lanternMove', x: f.x + 21, y: f.y, inside: true }));
    expect(result.current.state.found).toHaveLength(n); // never found twice
    act(() => result.current.act({ type: 'scene', scene: 's2024' }));
    expect(result.current.state.found).toEqual([]);
  });

  it('a scrub across risings gives the sting only, without a beat', () => {
    const onRising = vi.fn();
    const { result } = renderHook(() => useGraveyard({ seasons: DATA.seasons, onRising }));
    act(() => result.current.act({ type: 'day', day: 40 }));
    expect(result.current.state.cam).toBeNull();
    expect(result.current.state.beats).toBe(0);
    expect(onRising).toHaveBeenCalledWith(expect.objectContaining({ beat: null, camera: false }));
  });
});
