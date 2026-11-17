// Scene state for the night graveyard (spec 03 design.md, "State"). Initial values follow the board
// constructor (Main.dc.html L665). `?season=s2025&day=60` in the URL sets the start (preview convenience).
import { useCallback, useMemo, useReducer } from 'react';
import type { Speed } from '../data/derive';
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
    case 'speed':
      return { ...s, speed: a.speed };
  }
}

export function useGraveyard() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState());
  const act = useCallback((a: Action) => dispatch(a), []);
  return useMemo(() => ({ state, act }), [state, act]);
}
