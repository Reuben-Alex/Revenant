// Replay clock and state rules (Requirements 12.2, 12.5): reducer steps, stop at 102, restart.
import { describe, expect, it } from 'vitest';
import { initialState, reducer } from './useGraveyard';

describe('graveyard state', () => {
  it('starts like the board and reads ?season=&day=', () => {
    const s = initialState('');
    expect([s.scene, s.day, s.selected, s.speed, s.night, s.split]).toEqual(['s2024', 0, 'G-01', '1', true, 50]);
    const q = initialState('?season=s2026&day=140');
    expect([q.scene, q.day]).toEqual(['s2026', 102]);
    expect(initialState('?season=bogus').scene).toBe('s2024');
  });

  it('advances one day per tick while playing and stops at 102', () => {
    let s = { ...initialState(''), playing: true, day: 100 };
    s = reducer(s, { type: 'advance' });
    expect([s.day, s.playing]).toEqual([101, true]);
    s = reducer(s, { type: 'advance' });
    expect([s.day, s.playing]).toEqual([102, false]);
    expect(reducer(s, { type: 'advance' }).day).toBe(102);
  });

  it('play at day 102 restarts from day 0', () => {
    const s = reducer({ ...initialState(''), day: 102 }, { type: 'play', playing: true });
    expect([s.day, s.playing]).toEqual([0, true]);
  });

  it('switching season resets the replay', () => {
    const s = reducer({ ...initialState(''), day: 50, playing: true, selected: 'G-07', ex: 'G-07' }, { type: 'scene', scene: 's2025' });
    expect([s.scene, s.day, s.playing, s.selected, s.ex]).toEqual(['s2025', 0, false, 'G-01', null]);
  });

  it('scrubbing clamps to the season', () => {
    expect(reducer(initialState(''), { type: 'day', day: 250 }).day).toBe(102);
    expect(reducer(initialState(''), { type: 'day', day: -3 }).day).toBe(0);
  });

  it('compare is unavailable on Tonight', () => {
    const t = reducer(initialState(''), { type: 'scene', scene: 'tonight' });
    expect(reducer(t, { type: 'compare' }).compare).toBe(false);
  });
});
