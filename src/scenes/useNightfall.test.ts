// Spec 04 Property 4 (design.md) and the nightfall timer path (Requirements 1.1, 1.2, 4.2, 4.3, 4.5, 6.1).
import { act, renderHook } from '@testing-library/react';
import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DUSK_MS, PHASES, TITLE_MS, initialPhase, nightfallReducer, useNightfall, type NightfallEvent, type Phase,
} from './useNightfall';

const EVENTS: NightfallEvent[] = ['nightfall', 'duskDone', 'titleDone'];
const idx = (p: Phase) => PHASES.indexOf(p);

describe('Property 4: the phase moves one step at a time (Req 4.2, 4.3, 6.1)', () => {
  it('never goes back, rises by at most one per event, and night absorbs everything', () => {
    fc.assert(fc.property(fc.constantFrom(...PHASES), fc.array(fc.constantFrom(...EVENTS), { maxLength: 40 }), (start, events) => {
      let p = start;
      for (const e of events) {
        const next = nightfallReducer(p, e);
        expect(idx(next) - idx(p)).toBeGreaterThanOrEqual(0);
        expect(idx(next) - idx(p)).toBeLessThanOrEqual(1);
        if (p === 'night') expect(next).toBe('night');
        p = next;
      }
    }), { numRuns: 300 });
  });

  it('reaches night from day only through nightfall, duskDone, titleDone in that order', () => {
    fc.assert(fc.property(fc.array(fc.constantFrom(...EVENTS), { maxLength: 40 }), (events) => {
      const p = events.reduce(nightfallReducer, 'day' as Phase);
      const i = events.indexOf('nightfall');
      const j = i < 0 ? -1 : events.indexOf('duskDone', i + 1);
      const k = j < 0 ? -1 : events.indexOf('titleDone', j + 1);
      expect(p === 'night').toBe(k >= 0);
    }), { numRuns: 300 });
  });
});

describe('initialPhase (Req 1.1, 1.2)', () => {
  it('always starts in daylight outside the dev server', () => {
    expect(initialPhase('', false)).toBe('day');
    expect(initialPhase('?intro=0', false)).toBe('day');
    expect(initialPhase('?season=s2025&day=40', false)).toBe('day');
  });
  it('lets the dev server start at night with ?intro=0', () => {
    expect(initialPhase('?intro=0', true)).toBe('night');
    expect(initialPhase('?intro=1', true)).toBe('day');
    expect(initialPhase('?season=s2025', true)).toBe('day');
  });
});

describe('useNightfall timers (Req 4.2, 4.3, 4.5)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.history.replaceState(null, '', '/');
  });
  afterEach(() => vi.useRealTimers());

  it('runs day → dusk → title → night on 3200 + 6000 ms and fires onNight once', () => {
    const onNight = vi.fn();
    const { result } = renderHook(() => useNightfall({ onNight }));
    expect(result.current.phase).toBe('day');
    act(() => result.current.nightfall());
    expect(result.current.phase).toBe('dusk');
    act(() => { vi.advanceTimersByTime(DUSK_MS - 1); });
    expect(result.current.phase).toBe('dusk');
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current.phase).toBe('title');
    act(() => { vi.advanceTimersByTime(TITLE_MS - 1); });
    expect(result.current.phase).toBe('title');
    expect(onNight).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current.phase).toBe('night');
    act(() => { vi.advanceTimersByTime(60000); });
    expect(onNight).toHaveBeenCalledTimes(1);
  });

  it('ignores repeated Night shift presses: the timing does not restart', () => {
    const { result } = renderHook(() => useNightfall());
    act(() => result.current.nightfall());
    act(() => { vi.advanceTimersByTime(2000); });
    act(() => result.current.nightfall());
    act(() => { vi.advanceTimersByTime(DUSK_MS - 2000); });
    expect(result.current.phase).toBe('title');
    act(() => result.current.nightfall());
    act(() => { vi.advanceTimersByTime(TITLE_MS); });
    expect(result.current.phase).toBe('night');
  });

  it('starts at night with ?intro=0 in the dev server and does not fire onNight', () => {
    window.history.replaceState(null, '', '/?intro=0');
    const onNight = vi.fn();
    const { result } = renderHook(() => useNightfall({ onNight }));
    expect(result.current.phase).toBe('night');
    act(() => { vi.advanceTimersByTime(20000); });
    expect(onNight).not.toHaveBeenCalled();
  });

  it('clears its timer on unmount', () => {
    const { result, unmount } = renderHook(() => useNightfall());
    act(() => result.current.nightfall());
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
