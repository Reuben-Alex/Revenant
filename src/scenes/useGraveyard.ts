// Scene state for the night graveyard (spec 03 design.md, "State"). Initial values follow the board
// constructor (Main.dc.html L665). In the dev server only, `?season=s2025&day=60` sets the start (spec 04 Req 1.3).
//
// Spec 05: the replay runs by itself, with no play/pause (Requirement 9). The clock waits while the viewer looks
// closer and while a rising holds the camera (`clockMayAdvance`). Each forward step is checked for a published rise
// (`planRising`), which sets the camera, the sting and the beat count, and plays the boom and bell.
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { playBell } from '../audio/bell';
import { playBoom } from '../audio/boom';
import { currentAudio } from '../audio/context';
import { PERIOD_MS, type Speed } from '../data/derive';
import { planRising, stingView, type RisingPlan, type StingView } from '../data/rising';
import type { SceneKey, SeasonData, SeasonKey } from '../data/types';

export interface Cam { id: string; x: number; y: number; until: number }
export interface Sting extends StingView { until: number; flashKey: number }

export interface UIState {
  scene: SceneKey;
  day: number;
  selected: string;
  /** The replay is moving forward by itself (false on Tonight and after day 102). */
  running: boolean;
  /** The viewer is dragging the candle timeline. */
  dragging: boolean;
  /** Spec 06 wager seam: the replay waits at day 0 while this is false. */
  startGate: boolean;
  speed: Speed;
  night: boolean;
  lantern: { on: boolean; x: number; y: number; inside: boolean };
  compare: boolean;
  split: number;
  ex: string | null;
  hover: string | null;
  fireSel: string | null;
  cam: Cam | null;
  sting: Sting | null;
  beats: number;
  lastFlash: number;
  /** How the last day change happened, so a rising knows whether it was played or scrubbed. */
  lastStep: 'play' | 'scrub' | null;
}

export type Action =
  | { type: 'scene'; scene: SceneKey }
  | { type: 'day'; day: number }
  | { type: 'scrubStart' }
  | { type: 'scrubEnd' }
  | { type: 'select'; id: string }
  | { type: 'selectFire'; id: string }
  | { type: 'hover'; id: string | null }
  | { type: 'night' }
  | { type: 'lantern' }
  | { type: 'lanternMove'; x: number; y: number; inside: boolean }
  | { type: 'compare' }
  | { type: 'split'; split: number }
  | { type: 'exhume'; id: string | null }
  | { type: 'advance' }
  | { type: 'speed'; speed: Speed }
  | { type: 'gate'; open: boolean }
  | { type: 'rising'; plan: RisingPlan; sting: StingView; now: number }
  | { type: 'endCam'; until: number }
  | { type: 'endSting'; until: number };

const SCENES: SceneKey[] = ['s2024', 's2025', 's2026', 'tonight'];

export interface Start { scene: SceneKey; day: number }
export const DEFAULT_START: Start = { scene: 's2024', day: 0 };

/** Dev server only (spec 04 Requirement 1.3): `?season=s2025&day=60` sets where the graveyard opens. */
export function parseStart(search: string): Start {
  const q = new URLSearchParams(search);
  const scene = (SCENES as string[]).includes(q.get('season') ?? '') ? (q.get('season') as SceneKey) : 's2024';
  const d = Number(q.get('day'));
  return { scene, day: Number.isFinite(d) ? Math.max(0, Math.min(102, Math.round(d))) : 0 };
}

export function initialState(start: Start = DEFAULT_START): UIState {
  return {
    scene: start.scene, day: start.day, selected: 'G-01',
    running: start.scene !== 'tonight' && start.day < 102, dragging: false, startGate: true,
    speed: '1', night: true, lantern: { on: false, x: 530, y: 358, inside: false },
    compare: false, split: 50, ex: null, hover: null, fireSel: null,
    cam: null, sting: null, beats: 0, lastFlash: -Infinity, lastStep: null,
  };
}

/** Requirement 9.3 and 4.1: the clock moves only when nothing asks it to wait. */
export function clockMayAdvance(s: UIState, now: number): boolean {
  return s.running && s.startGate && s.scene !== 'tonight' && s.ex === null && !s.lantern.on && !s.compare && !s.dragging
    && !(s.cam !== null && now < s.cam.until);
}

export function reducer(s: UIState, a: Action): UIState {
  switch (a.type) {
    case 'scene':
      // Choosing any season (the same one too) restarts its replay from day 0 (Requirements 1.4, 9.2, 9.4).
      return {
        ...s, scene: a.scene, day: 0, running: a.scene !== 'tonight', selected: 'G-01', ex: null, fireSel: null, hover: null,
        compare: a.scene === 'tonight' ? false : s.compare,
        cam: null, sting: null, beats: 0, lastFlash: -Infinity, lastStep: null,
      };
    case 'day': {
      const day = Math.max(0, Math.min(102, a.day));
      return { ...s, day, running: s.scene !== 'tonight' && day < 102, cam: null, lastStep: 'scrub' };
    }
    case 'scrubStart':
      return { ...s, dragging: true };
    case 'scrubEnd':
      return { ...s, dragging: false };
    case 'select':
      return { ...s, selected: a.id, fireSel: null };
    case 'selectFire':
      return { ...s, fireSel: a.id, ex: null };
    case 'hover':
      return { ...s, hover: a.id };
    case 'night':
      return { ...s, night: !s.night };
    case 'lantern':
      return { ...s, lantern: { ...s.lantern, on: !s.lantern.on }, compare: false, ex: null, cam: null };
    case 'lanternMove':
      return { ...s, lantern: { ...s.lantern, x: a.x, y: a.y, inside: a.inside } };
    case 'compare':
      return s.scene === 'tonight' ? s : { ...s, compare: !s.compare, lantern: { ...s.lantern, on: false }, ex: null, cam: null };
    case 'split':
      return { ...s, split: Math.max(2, Math.min(98, a.split)) };
    case 'exhume':
      return { ...s, ex: a.id, selected: a.id ?? s.selected, fireSel: a.id ? null : s.fireSel, cam: a.id ? null : s.cam };
    case 'advance': {
      if (!s.running || s.scene === 'tonight') return s;
      const day = Math.min(102, s.day + 1);
      return { ...s, day, running: day < 102, lastStep: 'play' };
    }
    case 'speed':
      return { ...s, speed: a.speed };
    case 'gate':
      return { ...s, startGate: a.open };
    case 'rising': {
      const { plan, now } = a;
      const flashKey = (s.sting?.flashKey ?? 0) + (plan.flash ? 1 : 0);
      return {
        ...s,
        selected: plan.lead.id, fireSel: null,
        cam: plan.camera ?? s.cam,
        sting: { ...a.sting, until: plan.stingUntil, flashKey },
        beats: s.beats + (plan.beat ? 1 : 0),
        lastFlash: plan.flash ? now : s.lastFlash,
      };
    }
    case 'endCam':
      return s.cam && s.cam.until === a.until ? { ...s, cam: null } : s;
    case 'endSting':
      return s.sting && s.sting.until === a.until ? { ...s, sting: null } : s;
  }
}

/** What a rising reports to spec 06 (Requirement 6.1). Every field comes from the published data. */
export interface RisingEvent {
  ids: string[];
  lead: string;
  days: number[];
  beat: 1 | 2 | 3 | null;
  camera: boolean;
  season: SeasonKey;
  year: number;
}

interface Options {
  /** The published seasons; risings are only looked for in replay seasons. */
  seasons?: Record<SeasonKey, SeasonData>;
  /** Seam for spec 06: called once per rising. */
  onRising?: (e: RisingEvent) => void;
}

export function useGraveyard(opts: Options = {}) {
  // In production `import.meta.env.DEV` is `false`, so parseStart is never called and is dropped from the bundle.
  const [state, dispatch] = useReducer(reducer, undefined,
    () => initialState(import.meta.env.DEV ? parseStart(window.location.search) : DEFAULT_START));
  const act = useCallback((a: Action) => dispatch(a), []);
  const ref = useRef(state);
  useEffect(() => { ref.current = state; });

  // Replay clock (board tick(): 100 ms steps, one day per PERIOD_MS[speed]). Time only builds up while the clock
  // may advance, as the board's `if (!replaying || hold) return` before `this._acc += 100`.
  useEffect(() => {
    if (!state.running) return;
    let acc = 0;
    const id = setInterval(() => {
      if (!clockMayAdvance(ref.current, Date.now())) return;
      acc += 100;
      if (acc < PERIOD_MS[ref.current.speed]) return;
      acc = 0;
      dispatch({ type: 'advance' });
    }, 100);
    return () => clearInterval(id);
  }, [state.running]);

  // Each forward step is checked for a published rise (Requirement 1).
  const prev = useRef(state.day);
  const seasonsRef = useRef(opts.seasons);
  const risingCb = useRef(opts.onRising);
  useEffect(() => { seasonsRef.current = opts.seasons; risingCb.current = opts.onRising; });
  useEffect(() => {
    const from = prev.current;
    prev.current = state.day;
    const s = ref.current;
    if (state.day <= from || s.scene === 'tonight') return;
    const season = seasonsRef.current?.[s.scene];
    if (!season) return;
    const now = Date.now();
    const plan = planRising({
      season, from, to: state.day, played: s.lastStep === 'play', beatsSoFar: s.beats,
      speed: s.speed, lantern: s.lantern.on, compare: s.compare, now, lastFlash: s.lastFlash,
    });
    if (!plan) return;
    dispatch({ type: 'rising', plan, sting: stingView(plan, season.year), now });
    if (plan.flash) playBoom(currentAudio());
    if (plan.bells > 0) playBell(currentAudio(), plan.bells);
    risingCb.current?.({
      ids: plan.graves.map((g) => g.id), lead: plan.lead.id, days: plan.days, beat: plan.beat,
      camera: plan.camera !== null, season: season.key, year: season.year,
    });
  }, [state.day, state.scene]);

  // The camera and the sting end on their own timers.
  useEffect(() => {
    if (!state.cam) return;
    const until = state.cam.until;
    const t = setTimeout(() => dispatch({ type: 'endCam', until }), Math.max(0, until - Date.now()));
    return () => clearTimeout(t);
  }, [state.cam]);
  useEffect(() => {
    if (!state.sting) return;
    const until = state.sting.until;
    const t = setTimeout(() => dispatch({ type: 'endSting', until }), Math.max(0, until - Date.now()));
    return () => clearTimeout(t);
  }, [state.sting]);

  return useMemo(() => ({ state, act }), [state, act]);
}
