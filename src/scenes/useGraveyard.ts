// Scene state for the night graveyard (spec 03 design.md, "State"). Initial values follow the board
// constructor (Main.dc.html L665). In the dev server only, `?season=s2025&day=60` sets the start (spec 04 Req 1.3).
//
// Spec 05: the replay runs by itself, with no play/pause (Requirement 9). The clock waits while the viewer looks
// closer and while a rising holds the camera (`clockMayAdvance`). Each forward step is checked for a published rise
// (`planRising`), which sets the camera, the sting and the beat count, and plays the boom and bell.
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { playBell } from '../audio/bell';
import { playBoom } from '../audio/boom';
import { playHeartbeat } from '../audio/heart';
import { currentAudio } from '../audio/context';
import { PERIOD_MS, visibleFires, type Speed } from '../data/derive';
import * as gk from '../copy/gravekeeper';
import { checkRiddle, firstThaw, huntView, lanternRadius, line, risingLine, verdictView, wagerScore, whisperAt, type Line } from '../data/gravekeeper';
import { planRising, stingView, type RisingPlan, type StingView } from '../data/rising';
import type { SceneKey, SeasonData, SeasonKey } from '../data/types';

export interface Cam { id: string; x: number; y: number; until: number }
/** Spec 06 Requirement 4: the viewer's three marks, whether they were sealed, and whether the wager is still open. */
export interface Wager { marks: string[]; sealed: boolean; open: boolean }
/**
 * Spec 06 Requirement 5: the riddle on the first beat's grave. It is pending from beat 1 until nothing else holds the
 * view (camera, exhumation, lantern, before/after, wager), then open until it is solved or let lie (done).
 * `hint` says why the last Dig failed: the decoy was chosen, or fewer than three were.
 */
export interface Riddle { id: string; picked: string[]; hint: 'decoy' | 'three' | null; open: boolean; done: boolean }
export interface Sting extends StingView { until: number; flashKey: number }

export interface UIState {
  scene: SceneKey;
  day: number;
  selected: string;
  /** The replay is moving forward by itself (false on Tonight and after day 102). */
  running: boolean;
  /** The viewer is dragging the candle timeline. */
  dragging: boolean;
  /** Spec 06 wager seam: the replay waits at day 0 while this is false. Always `!wager.open`. */
  startGate: boolean;
  wager: Wager;
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
  /** Spec 06: what the Gravekeeper is saying, whether the first thaw was spoken, and the later-rising rotation. */
  say: Line | null;
  woke: boolean;
  rot: number;
  riddle: Riddle | null;
  /** Spec 06 Requirement 6: new fires found under the lantern this replay. */
  found: string[];
  /** Spec 06 Requirement 7: the replay played through to day 102. */
  verdict: boolean;
  /** Spec 07 Requirement 4: Keep watch on Tonight (null elsewhere). */
  keep: { marks: string[]; sealed: boolean } | null;
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
  | { type: 'mark'; id: string }
  | { type: 'seal' }
  | { type: 'watch' }
  | { type: 'rising'; plan: RisingPlan; sting: StingView; now: number }
  | { type: 'endCam'; until: number }
  | { type: 'endSting'; until: number }
  | { type: 'say'; line: Line }
  | { type: 'endSay'; until: number }
  | { type: 'woke' }
  | { type: 'rot' }
  | { type: 'riddlePick'; key: string }
  | { type: 'riddleDig' }
  | { type: 'riddleLeave' }
  | { type: 'found'; ids: string[] }
  | { type: 'again' }
  | { type: 'keepMark'; id: string; warm: boolean; need: number }
  | { type: 'keepSeal'; need: number }
  | { type: 'keepAgain' };

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

/** The wager opens at day 0 of each replay season (Requirement 4.1). */
const freshWager = (scene: SceneKey, day: number): Wager => ({ marks: [], sealed: false, open: scene !== 'tonight' && day === 0 });
const withWager = (s: UIState, wager: Wager): UIState => ({ ...s, wager, startGate: !wager.open });

export function initialState(start: Start = DEFAULT_START): UIState {
  const wager = freshWager(start.scene, start.day);
  return {
    scene: start.scene, day: start.day, selected: 'G-01',
    running: start.scene !== 'tonight' && start.day < 102, dragging: false, startGate: !wager.open, wager,
    speed: '1', night: true, lantern: { on: false, x: 530, y: 358, inside: false },
    compare: false, split: 50, ex: null, hover: null, fireSel: null,
    cam: null, sting: null, beats: 0, lastFlash: -Infinity, lastStep: null,
    say: null, woke: false, rot: 0, riddle: null, found: [], verdict: false,
    keep: start.scene === 'tonight' ? { marks: [], sealed: false } : null,
  };
}

/** Requirement 9.3 and 4.1: the clock moves only when nothing asks it to wait. */
export function clockMayAdvance(s: UIState, now: number): boolean {
  return s.running && s.startGate && s.scene !== 'tonight' && s.ex === null && !s.lantern.on && !s.compare && !s.dragging
    && !(s.cam !== null && now < s.cam.until) && !s.riddle?.open;
}

/** A pending riddle opens as soon as nothing else holds the view (design.md, State). */
function settle(s: UIState): UIState {
  const r = s.riddle;
  if (!r || r.open || r.done) return s;
  if (s.cam !== null || s.ex !== null || s.lantern.on || s.compare || s.wager.open || s.scene === 'tonight') return s;
  return { ...s, riddle: { ...r, open: true } };
}

export function reducer(s: UIState, a: Action): UIState {
  return settle(step(s, a));
}

function step(s: UIState, a: Action): UIState {
  switch (a.type) {
    case 'scene':
      // Choosing any season (the same one too) restarts its replay from day 0 (Requirements 1.4, 9.2, 9.4).
      return withWager({
        ...s, scene: a.scene, day: 0, running: a.scene !== 'tonight', selected: 'G-01', ex: null, fireSel: null, hover: null,
        compare: a.scene === 'tonight' ? false : s.compare,
        cam: null, sting: null, beats: 0, lastFlash: -Infinity, lastStep: null, woke: false, riddle: null, found: [], verdict: false,
        keep: a.scene === 'tonight' ? { marks: [], sealed: false } : null,
      }, freshWager(a.scene, 0));
    case 'day': {
      const day = Math.max(0, Math.min(102, a.day));
      const next: UIState = { ...s, day, running: s.scene !== 'tonight' && day < 102, cam: null, lastStep: 'scrub', verdict: false };
      // Dragging the candle past day 0 while the wager is open counts as Just watch (Requirement 4.6).
      return s.wager.open && day > 0 ? withWager(next, { marks: [], sealed: false, open: false }) : next;
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
      return { ...s, day, running: day < 102, lastStep: 'play', verdict: day === 102 };
    }
    case 'speed':
      return { ...s, speed: a.speed };
    case 'mark': {
      // Requirement 4.2: mark or unmark, up to three, only while the wager is open.
      if (!s.wager.open) return s;
      const has = s.wager.marks.includes(a.id);
      if (!has && s.wager.marks.length >= 3) return s;
      const marks = has ? s.wager.marks.filter((m) => m !== a.id) : [...s.wager.marks, a.id];
      return { ...s, selected: a.id, fireSel: null, wager: { ...s.wager, marks } };
    }
    case 'seal':
      // Requirement 4.4: only with three marks. Board seal() also puts the lantern out.
      if (!s.wager.open || s.wager.marks.length !== 3) return s;
      return withWager({ ...s, lantern: { ...s.lantern, on: false } }, { ...s.wager, sealed: true, open: false });
    case 'watch':
      if (!s.wager.open) return s;
      return withWager(s, { marks: [], sealed: false, open: false });
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
        // Once per replay, on the first beat's lead grave (Requirement 5.1, 5.4).
        riddle: plan.beat === 1 && s.riddle === null
          ? { id: plan.lead.id, picked: [], hint: null, open: false, done: false } : s.riddle,
      };
    }
    case 'riddlePick': {
      const r = s.riddle;
      if (!r?.open) return s;
      const has = r.picked.includes(a.key);
      if (!has && r.picked.length >= 3) return s;
      return { ...s, riddle: { ...r, picked: has ? r.picked.filter((k) => k !== a.key) : [...r.picked, a.key] } };
    }
    case 'riddleDig': {
      // Requirement 5.3: right opens the grave's exhumation; wrong keeps the choice and gives a hint. No limit.
      const r = s.riddle;
      if (!r?.open) return s;
      if (r.picked.length < 3) return { ...s, riddle: { ...r, hint: 'three' } };
      if (!checkRiddle(r.picked)) return { ...s, riddle: { ...r, hint: 'decoy' } };
      return { ...s, riddle: { ...r, hint: null, open: false, done: true }, ex: r.id, selected: r.id, fireSel: null, cam: null };
    }
    case 'again':
      // Requirement 7.6: the same season from day 0, with the wager open again.
      return s.scene === 'tonight' ? s : { ...step(s, { type: 'scene', scene: s.scene }), selected: s.selected };
    case 'keepMark': {
      // Lanterns go only on still-warm scars, up to the number the watch needs, and not once sealed.
      const k = s.keep;
      if (!k || k.sealed || !a.warm) return s;
      const has = k.marks.includes(a.id);
      if (!has && k.marks.length >= a.need) return s;
      return { ...s, selected: a.id, keep: { ...k, marks: has ? k.marks.filter((m) => m !== a.id) : [...k.marks, a.id] } };
    }
    case 'keepSeal':
      return s.keep && !s.keep.sealed && a.need > 0 && s.keep.marks.length === a.need ? { ...s, keep: { ...s.keep, sealed: true } } : s;
    case 'keepAgain':
      return s.keep ? { ...s, keep: { marks: [], sealed: false } } : s;
    case 'found': {
      const add = a.ids.filter((id) => !s.found.includes(id));
      return add.length ? { ...s, found: [...s.found, ...add] } : s;
    }
    case 'riddleLeave':
      return s.riddle?.open ? { ...s, riddle: { ...s.riddle, open: false, done: true } } : s;
    case 'endCam':
      return s.cam && s.cam.until === a.until ? { ...s, cam: null } : s;
    case 'endSting':
      return s.sting && s.sting.until === a.until ? { ...s, sting: null } : s;
    case 'say':
      return { ...s, say: a.line };
    case 'endSay':
      return s.say && s.say.until === a.until ? { ...s, say: null } : s;
    case 'woke':
      return { ...s, woke: true };
    case 'rot':
      return { ...s, rot: s.rot + 1 };
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
    let silent = s.say === null || now >= s.say.until;
    // Quiet years (spec 06 Requirement 3.2): a whisper on days 22, 48 and 76, if nothing is being said.
    const whisper = s.lastStep === 'play' && silent ? whisperAt(season, state.day) : null;
    if (whisper) { dispatch({ type: 'say', line: line(whisper, now, 3800, 'whisper') }); silent = false; }
    // First thaw (spec 06 Requirement 2.3): once per replay, while playing, and only when nothing else is being
    // said, so it never cuts off the night or season line. A rising on the same step speaks over it.
    if (s.lastStep === 'play' && !s.woke && silent) {
      const w = firstThaw(season, state.day);
      if (w) { dispatch({ type: 'woke' }); dispatch({ type: 'say', line: line(gk.firstThaw(w.id), now) }); }
    }
    const plan = planRising({
      season, from, to: state.day, played: s.lastStep === 'play', beatsSoFar: s.beats,
      speed: s.speed, lantern: s.lantern.on, compare: s.compare, now, lastFlash: s.lastFlash,
    });
    if (!plan) return;
    dispatch({ type: 'rising', plan, sting: stingView(plan, season.year), now });
    const ev = { ids: plan.graves.map((g) => g.id), lead: plan.lead.id, days: plan.days, beat: plan.beat, year: season.year };
    dispatch({ type: 'say', line: line(risingLine(ev, s.rot, s.wager.sealed ? s.wager.marks : []), now, plan.beat ? 6400 : undefined) });
    if (!plan.beat) dispatch({ type: 'rot' });
    if (plan.flash) playBoom(currentAudio());
    // A heartbeat under the camera push, quickening until the hand breaks through.
    if (plan.camera) playHeartbeat(currentAudio());
    if (plan.bells > 0) playBell(currentAudio(), plan.bells);
    risingCb.current?.({
      ids: plan.graves.map((g) => g.id), lead: plan.lead.id, days: plan.days, beat: plan.beat,
      camera: plan.camera !== null, season: season.key, year: season.year,
    });
  }, [state.day, state.scene]);

  // The verdict (spec 06 Requirement 7.1, 7.3): once the replay plays through to day 102. It is declared after the
  // step effect, so it speaks over a rising on the last day. Bells: 3 in a zombie year, 1 otherwise.
  useEffect(() => {
    if (!state.verdict) return;
    const s = ref.current;
    const season = s.scene === 'tonight' ? undefined : seasonsRef.current?.[s.scene];
    if (!season) return;
    const v = verdictView(season, s.wager.marks, s.wager.sealed);
    const ranked = s.wager.sealed ? ' ' + gk.verdict.ranked[wagerScore(season, s.wager.marks).k] : '';
    dispatch({ type: 'say', line: line(v.line + ranked, Date.now(), 10000) });
    playBell(currentAudio(), v.bells);
  }, [state.verdict]);

  // Lantern hunt (spec 06 Requirement 6): each lantern move may find new fires; the Gravekeeper names the first,
  // or counts them all when the last is found.
  const { on: lit, x: lx, y: ly, inside } = state.lantern;
  useEffect(() => {
    const s = ref.current;
    if (!lit || !inside || s.scene === 'tonight') return;
    const season = seasonsRef.current?.[s.scene];
    if (!season) return;
    const r = lanternRadius(season, s.wager.marks, s.day, s.wager.sealed);
    const h = huntView(visibleFires(season.fires, s.day), s.found, lx, ly, r, true);
    if (!h.fresh.length) return;
    const ids = h.fresh.map((f) => f.id);
    dispatch({ type: 'found', ids });
    const all = h.found + ids.length === h.total;
    dispatch({ type: 'say', line: line(all ? gk.hunt.all(h.total) : gk.hunt.found(ids[0]!), Date.now()) });
  }, [lit, lx, ly, inside]);

  // The camera and the sting end on their own timers.
  useEffect(() => {
    if (!state.cam) return;
    const until = state.cam.until;
    const t = setTimeout(() => dispatch({ type: 'endCam', until }), Math.max(0, until - Date.now()));
    return () => clearTimeout(t);
  }, [state.cam]);
  useEffect(() => {
    if (!state.say) return;
    const until = state.say.until;
    const t = setTimeout(() => dispatch({ type: 'endSay', until }), Math.max(0, until - Date.now()));
    return () => clearTimeout(t);
  }, [state.say]);
  useEffect(() => {
    if (!state.sting) return;
    const until = state.sting.until;
    const t = setTimeout(() => dispatch({ type: 'endSting', until }), Math.max(0, until - Date.now()));
    return () => clearTimeout(t);
  }, [state.sting]);

  return useMemo(() => ({ state, act }), [state, act]);
}
