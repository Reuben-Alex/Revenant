// Scene state for the night graveyard (spec 03 design.md, "State"). Initial values follow the board
// constructor (Main.dc.html L665). `?season=s2025&day=60` in the URL sets the start (preview convenience).
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { PERIOD_MS, type Speed } from '../data/derive';
import type { SceneKey } from '../data/types';

export interface UIState {
  scene: SceneKey;
  day: number;
  selected: string;
  playing: boolean;
  speed: Speed;
  night: boolean;
  lantern: { on: boolean; x: number; y: number; inside: boolean };
  compare: boolean;
  split: number;
  ex: string | null;
  hover: string | null;
  fireSel: string | null;
}

export type Action =
  | { type: 'scene'; scene: SceneKey }
  | { type: 'day'; day: number }
  | { type: 'select'; id: string }
  | { type: 'selectFire'; id: string }
  | { type: 'hover'; id: string | null }
  | { type: 'night' }
  | { type: 'lantern' }
  | { type: 'lanternMove'; x: number; y: number; inside: boolean }
  | { type: 'compare' }
  | { type: 'split'; split: number }
  | { type: 'exhume'; id: string | null }
  | { type: 'play'; playing: boolean }
  | { type: 'advance' }
  | { type: 'speed'; speed: Speed };

const SCENES: SceneKey[] = ['s2024', 's2025', 's2026', 'tonight'];

export function initialState(search = typeof window !== 'undefined' ? window.location.search : ''): UIState {
  const q = new URLSearchParams(search);
  const scene = (SCENES as string[]).includes(q.get('season') ?? '') ? (q.get('season') as SceneKey) : 's2024';
  const d = Number(q.get('day'));
  return {
    scene, day: Number.isFinite(d) ? Math.max(0, Math.min(102, Math.round(d))) : 0, selected: 'G-01',
    playing: false, speed: '1', night: true, lantern: { on: false, x: 530, y: 358, inside: false },
    compare: false, split: 50, ex: null, hover: null, fireSel: null,
  };
}

export function reducer(s: UIState, a: Action): UIState {
  switch (a.type) {
    case 'scene':
      return { ...s, scene: a.scene, day: 0, playing: false, selected: 'G-01', ex: null, fireSel: null, hover: null,
        compare: a.scene === 'tonight' ? false : s.compare };
    case 'day':
      return { ...s, day: Math.max(0, Math.min(102, a.day)) };
    case 'select':
      return { ...s, selected: a.id, fireSel: null };
    case 'selectFire':
      return { ...s, fireSel: a.id, ex: null };
    case 'hover':
      return { ...s, hover: a.id };
    case 'night':
      return { ...s, night: !s.night };
    case 'lantern':
      return { ...s, lantern: { ...s.lantern, on: !s.lantern.on }, compare: false, ex: null };
    case 'lanternMove':
      return { ...s, lantern: { ...s.lantern, x: a.x, y: a.y, inside: a.inside } };
    case 'compare':
      return s.scene === 'tonight' ? s : { ...s, compare: !s.compare, lantern: { ...s.lantern, on: false }, ex: null };
    case 'split':
      return { ...s, split: Math.max(2, Math.min(98, a.split)) };
    case 'exhume':
      return { ...s, ex: a.id, selected: a.id ?? s.selected, fireSel: a.id ? null : s.fireSel };
    case 'play':
      return { ...s, playing: a.playing, day: a.playing && s.day >= 102 ? 0 : s.day };
    case 'advance': {
      if (!s.playing || s.scene === 'tonight') return s;
      const day = Math.min(102, s.day + 1);
      return { ...s, day, playing: day < 102 };
    }
    case 'speed':
      return { ...s, speed: a.speed };
  }
}

interface Options {
  /** Seam for spec 05: called when the replay moves forward from `from` to `to` (scrub or play). */
  onRiseCrossed?: (from: number, to: number) => void;
}

export function useGraveyard(opts: Options = {}) {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState());
  const act = useCallback((a: Action) => dispatch(a), []);

  // Replay clock (board tick(): 100 ms steps, one day per PERIOD_MS[speed]).
  useEffect(() => {
    if (!state.playing) return;
    let acc = 0;
    const id = setInterval(() => {
      acc += 100;
      if (acc < PERIOD_MS[state.speed]) return;
      acc = 0;
      dispatch({ type: 'advance' });
    }, 100);
    return () => clearInterval(id);
  }, [state.playing, state.speed]);

  const prev = useRef(state.day);
  const cb = useRef(opts.onRiseCrossed);
  useEffect(() => { cb.current = opts.onRiseCrossed; });
  useEffect(() => {
    if (state.day > prev.current) cb.current?.(prev.current, state.day);
    prev.current = state.day;
  }, [state.day]);

  return useMemo(() => ({ state, act }), [state, act]);
}
