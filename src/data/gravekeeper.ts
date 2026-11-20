// The Gravekeeper's lines, the puzzles and the verdict, as pure functions of published data (spec 06 design.md,
// "Pure logic"). Ports of the board's say(), quiet(), rvGlitch, checkRise lines, wager and verdict (Main.dc.html).
import * as copy from '../copy/gravekeeper';
import { fmtDay, km2, lat } from './format';
import type { Grave, NewFire, SeasonData, SeasonKey } from './types';

export const TYPE_MS = 26; // typewriter speed, per character
export const ZOMBIE_FACTOR = 1.4; // method.md: zombie year = risen / n > 1.4 × chance (shown, never re-decided)
export const LANTERN_BASE = 130;
export const LANTERN_STEP = 30;
export const WHISPER_DAYS = [22, 48, 76] as const;
export const NIGHT_MS = 9500; // the night greeting stays this long (board night phase, say(…, 9500))

export type Who = 'keeper' | 'whisper';
export interface Line { text: string; who: Who; start: number; until: number }

/** Board say(): a line lasts the given ms, or max(4800, 30·length + 2800). */
export function line(text: string, now: number, ms?: number, who: Who = 'keeper'): Line {
  return { text, who, start: now, until: now + (ms ?? Math.max(4800, text.length * 30 + 2800)) };
}

/** Characters shown after `elapsed` ms of typing. */
export const typed = (text: string, elapsed: number) => text.slice(0, Math.max(0, Math.min(text.length, Math.floor(elapsed / TYPE_MS))));

export const quiet = (s: SeasonData) => !s.zombie;

const area = (s: SeasonData) => s.graves.reduce((a, g) => a + g.size, 0);
const ORDER: SeasonKey[] = ['s2024', 's2025', 's2026'];

/** A season's opening line (Requirement 2.2). */
export function introLine(seasons: Record<SeasonKey, SeasonData>, key: SeasonKey): string {
  const s = seasons[key];
  const before = ORDER[ORDER.indexOf(key) - 1];
  if (!before) return copy.intro.record(s.graves.length, s.year - 1);
  const p = seasons[before];
  return copy.intro.compared(s.graves.length, s.year - 1, area(s) < area(p), km2(area(s)), km2(area(p)));
}

/**
 * The grave to name at the first thaw (Requirement 2.3): of the graves whose snow has left by `day`, still inside
 * their 50-day window and not yet risen, the one that thawed most recently (published order breaks ties).
 * The line waits for silence, so it can come a few days after the first melt; naming the latest thaw keeps
 * "The snow is leaving" true on the day it is said.
 */
export function firstThaw(season: SeasonData, day: number): Grave | null {
  let best: Grave | null = null;
  for (const g of season.graves) {
    if (g.melt < 0 || g.melt > day || day > g.melt + 50) continue;
    if (g.rise && g.rise.day <= day) continue;
    if (!best || g.melt > best.melt) best = g;
  }
  return best;
}

export interface RisingInput { ids: string[]; lead: string; days: number[]; beat: 1 | 2 | 3 | null; year: number }

/** What the Gravekeeper says at a rising (Requirement 2.4). `rot` picks the later-rising line; `marks` are the wager. */
export function risingLine(r: RisingInput, rot: number, marks: string[]): string {
  const mineIds = r.ids.filter((id) => marks.includes(id));
  const leadDays = r.days[0] ?? 0;
  if (r.beat) {
    const text = r.beat === 1 ? copy.beat[1](r.lead, r.year - 1, leadDays) : copy.beat[r.beat](r.ids);
    return (mineIds.length ? copy.mine.prefix : '') + text;
  }
  if (mineIds.length) return copy.mine.line(mineIds);
  const f = copy.later[((rot % copy.later.length) + copy.later.length) % copy.later.length]!;
  return f(r.ids, r.lead, leadDays);
}

/** A whisper on days 22, 48 and 76 of a quiet year (Requirement 3.2). */
export function whisperAt(season: SeasonData, day: number): string | null {
  if (!quiet(season) || !(WHISPER_DAYS as readonly number[]).includes(day)) return null;
  return copy.whispers[(day * 7) % copy.whispers.length]!;
}

const GLYPHS = '\u2593\u2592\u2591\u2588\u2042\u00a7';

/** Board rvGlitch: replaces about 22 % of non-space characters. Visual only; never used for accessible text. */
export function glitchText(s: string, seed: number): string {
  let o = '';
  for (let i = 0; i < s.length; i++) {
    const r = ((i * 9301 + seed * 49297) % 233280) / 233280;
    const ch = s[i]!;
    o += ch !== ' ' && ch !== '\n' && r < 0.22 ? GLYPHS[(i + seed) % GLYPHS.length]! : ch;
  }
  return o;
}

/** Board glitchOn: 3 of every 46 ticks of 110 ms (0.33 s every ~5 s). */
export const glitchOn = (now: number) => Math.floor(now / 110) % 46 < 3;

export interface ClueCard { footprint: string; latitude: string; thaw: string; early: string }

/** The clue card's lines, in the order shown. */
export const clueLines = (c: ClueCard) => [`${c.footprint} · ${c.latitude}`, c.thaw, c.early];

/** Read the stones (Requirement 4.3): only published values. */
export function clueCard(g: Grave, year: number): ClueCard {
  return {
    footprint: copy.clue.footprint(km2(g.size)),
    latitude: copy.clue.latitude(lat(g.cy).toFixed(1)),
    thaw: copy.clue.thaw(g.melt >= 0 ? fmtDay(g.melt, year) : null),
    early: copy.clue.early(g.early),
  };
}

export interface RiddleCard { key: string; text: string; truth: boolean }

/** Four cards, three true and one decoy chosen by the year, in an order fixed by the year (Requirement 5.2). */
export function riddleCards(year: number, proximityKm: number): RiddleCard[] {
  const truths = copy.riddle.truths(proximityKm).map((text, i) => ({ key: `t${i}`, text, truth: true }));
  const decoy = copy.riddle.decoys[year % copy.riddle.decoys.length]!;
  const cards: RiddleCard[] = [...truths, { key: 'd', text: decoy.text, truth: false }];
  let seed = year;
  for (let i = cards.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const j = seed % (i + 1);
    [cards[i], cards[j]] = [cards[j]!, cards[i]!];
  }
  return cards;
}

export const riddleHint = (year: number) => copy.riddle.decoys[year % copy.riddle.decoys.length]!.hint;

/** True iff the picked keys are exactly the three truths. */
export function checkRiddle(picked: string[]): boolean {
  const p = new Set(picked);
  return p.size === 3 && p.has('t0') && p.has('t1') && p.has('t2');
}

/** Fewest risen graves that would have to stay down for the year to fall under the bar, if that is 1 or 2. */
export function margin(s: SeasonData): number | null {
  const n = s.graves.length;
  if (!s.zombie || n === 0) return null;
  const bar = ZOMBIE_FACTOR * s.chance;
  for (let k = 1; k <= 2; k++) if ((s.risen - k) / n <= bar) return k;
  return null;
}

/** The Gravekeeper's own bet: the three largest graves (published order). */
export const gravekeeperGuess = (s: SeasonData) => s.graves.slice(0, 3).map((g) => g.id);

const rose = (s: SeasonData, id: string, day = 102) => s.graves.some((g) => g.id === id && g.rise !== null && g.rise.day <= day);

export function wagerScore(s: SeasonData, marks: string[]) {
  const n = s.graves.length;
  return {
    k: marks.filter((id) => rose(s, id)).length,
    blind: n ? (3 * s.risen) / n : 0,
    guess: gravekeeperGuess(s).filter((id) => rose(s, id)).length,
  };
}

/** Board LR: 130 + 30 per marked grave risen so far, once the wager is sealed. */
export function lanternRadius(s: SeasonData, marks: string[], day: number, sealed: boolean): number {
  return LANTERN_BASE + (sealed ? marks.filter((id) => rose(s, id, day)).length * LANTERN_STEP : 0);
}

/** Lantern hunt: a fire is found when the lantern centre is within the radius − 10 (board names rule). */
export const fireFound = (f: NewFire, lx: number, ly: number, r: number) => Math.hypot(f.x - lx, f.y - ly) < r - 10;

export interface HuntView {
  /** Fires drawn while the lantern is on: already found, or inside the light (Requirement 6.1). */
  shown: NewFire[];
  /** Fires the lantern finds at this position, not found before (Requirement 6.2). */
  fresh: NewFire[];
  found: number;
  total: number;
}

/** The lantern hunt at one lantern position. `visible` are the season's fires with first day ≤ the current day. */
export function huntView(visible: NewFire[], found: string[], lx: number, ly: number, r: number, lit: boolean): HuntView {
  const shown = visible.filter((f) => found.includes(f.id) || Math.hypot(f.x - lx, f.y - ly) < r);
  const fresh = lit ? visible.filter((f) => !found.includes(f.id) && fireFound(f, lx, ly, r)) : [];
  return { shown, fresh, found: visible.filter((f) => found.includes(f.id)).length, total: visible.length };
}

export interface VerdictView {
  kicker: string;
  title: string;
  detail: string;
  wager: string | null;
  line: string;
  bells: number;
}

export function verdictView(s: SeasonData, marks: string[], sealed: boolean): VerdictView {
  const n = s.graves.length;
  const pct = Math.round(s.chance * 100);
  const ratio = s.chance > 0 ? (s.risen / n / s.chance).toFixed(1) : '—';
  const k = margin(s);
  const detail = [
    copy.verdict.chance(pct),
    s.zombie ? copy.verdict.zombie(ratio, s.year - 1) : copy.verdict.quiet,
    ...(k ? [copy.verdict.thin(k)] : []),
  ].join(' ');
  let wager: string | null = null;
  if (sealed) {
    const sc = wagerScore(s, marks);
    wager = `${copy.verdict.wager(sc.k, marks, sc.blind.toFixed(1), sc.guess)} ${copy.verdict.ranked[sc.k]}`;
  }
  return {
    kicker: copy.verdict.kicker(s.year),
    title: copy.verdict.title(s.risen, n),
    detail,
    wager,
    line: copy.verdict.line(s.risen, n, Math.round(s.chance * n), s.zombie),
    bells: s.zombie ? 3 : 1,
  };
}
