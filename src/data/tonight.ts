// Tonight, live (spec 07 design.md, "Pure logic"): staleness, the wake window from published melt days, the
// Gravekeeper's Tonight line and the published watch order. Pure; the clock is passed in.
import * as copy from '../copy/tonight';
import { MONTHS, coords, fmtDay, fmtIso, km2, lat } from './format';
import type { SeasonData, SeasonKey, TonightFile, TonightScar } from './types';

export const STALE_MS = 48 * 3600 * 1000;
const DAY_MS = 86400000;
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Requirement 1.3: stale when the data is more than 48 h old; `days` is whole days since `as_of`. */
export function staleness(asOf: string, now: number): { stale: boolean; days: number } {
  const age = now - Date.parse(asOf);
  return { stale: age > STALE_MS, days: Math.max(0, Math.floor(age / DAY_MS)) };
}

export interface Spread { q1: number; median: number; q3: number; n: number }

/** Requirement 3.1–3.2: the middle half of the published melt days (melt −1 ignored); null under 4 graves. */
export function meltSpread(seasons: Record<SeasonKey, SeasonData>): Spread | null {
  const m = Object.values(seasons).flatMap((s) => s.graves.map((g) => g.melt)).filter((d) => d >= 0).sort((a, b) => a - b);
  if (m.length < 4) return null;
  const q = (p: number) => m[Math.floor((m.length - 1) * p)]!;
  return { q1: q(0.25), median: q(0.5), q3: q(0.75), n: m.length };
}

/** The year of Tonight's scars (from `points_through`). */
export const tonightYear = (t: TonightFile) => Number(t.pointsThrough.slice(0, 4));

export interface WakeView { window: string | null; pace: string; nights: string | null; month: string | null }

export function wakeView(seasons: Record<SeasonKey, SeasonData>, t: TonightFile): WakeView {
  const s = meltSpread(seasons);
  const next = tonightYear(t) + 1;
  if (!s) return { window: copy.footer.tooFew, pace: '', nights: null, month: null };
  const at = Date.UTC(next, 2, 21) + s.median * DAY_MS;
  const nights = Math.round((at - Date.parse(t.asOf)) / DAY_MS);
  return {
    window: copy.footer.window(fmtDay(s.q1, next), fmtDay(s.q3, next), next),
    pace: copy.footer.pace,
    nights: copy.footer.nights(nights, fmtIso(t.asOf.slice(0, 10)), fmtDay(s.median, next)),
    month: MONTH_NAMES[new Date(at).getUTCMonth()]!,
  };
}

export interface TonightFooter { wake: WakeView; snapshot: string; asOf: string; stale: string | null }

export function tonightFooter(seasons: Record<SeasonKey, SeasonData>, t: TonightFile, now: number): TonightFooter {
  const d = new Date(Date.parse(t.asOf));
  const time = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  const st = staleness(t.asOf, now);
  return {
    wake: wakeView(seasons, t),
    snapshot: copy.footer.snapshot(fmtIso(t.frameDate), fmtIso(t.pointsThrough), t.credit),
    asOf: copy.footer.asOf(`${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`, time),
    stale: st.stale ? copy.footer.stale(st.days) : null,
  };
}

/** The tab's sub-label: LIVE only while fresh (Requirement 1.3). */
export const tonightTab = (t: TonightFile, now: number) =>
  (staleness(t.asOf, now).stale ? copy.tab.stale : copy.tab.live)(fmtIso(t.pointsThrough));

/** What the Gravekeeper says on entering Tonight (Requirements 1.3, 3.3): the staleness first, if any. */
export function tonightLine(seasons: Record<SeasonKey, SeasonData>, t: TonightFile, now: number): string {
  const st = staleness(t.asOf, now);
  if (st.stale) return copy.keeper.stale(st.days, fmtIso(t.pointsThrough));
  const warm = t.scars.filter((s) => s.late > 0).length;
  return copy.keeper.line(tonightYear(t), warm, wakeView(seasons, t).month);
}

/** The published watch order (Requirement 2.3): scars ranked, best first. The app never ranks them itself. */
export const watchList = (t: TonightFile): TonightScar[] => t.watch.map((i) => t.scars[i]!);

/** Rank position (0 = top) of each scar id. */
export function watchRank(t: TonightFile): Map<string, number> {
  return new Map(t.watch.map((i, r) => [t.scars[i]!.id, r]));
}

// --- Keep watch (Requirement 4) ------------------------------------------------------------------

/** How many lanterns the watch needs: three, or every still-warm scar when fewer are warm. */
export const keepNeed = (t: TonightFile) => Math.min(3, t.scars.filter((s) => s.late > 0).length);

/** The ranking's top still-warm scars, as many as the watch needs (Requirement 4.4). */
export const rankedWarm = (t: TonightFile): string[] =>
  t.watch.map((i) => t.scars[i]!).filter((s) => s.late > 0).slice(0, keepNeed(t)).map((s) => s.id);

export function keepWatchScore(marks: string[], t: TonightFile): { k: number; top: string[] } {
  const top = rankedWarm(t);
  return { k: marks.filter((id) => top.includes(id)).length, top };
}

export function tonightClue(s: TonightScar): string[] {
  return [`Footprint ≈ ${km2(s.size)} km² · ${lat(s.cy).toFixed(1)}°N`, copy.clue.late(s.late), copy.clue.last(fmtIso(s.lastBurn)), copy.clue.snow(s.snowNow)];
}

export interface CardLines { kicker: string; title: string; rows: { id: string; line: string }[]; result: string; caveat: string; sealed: string; credit: string; site: string }

/** Everything the epitaph card draws (Requirement 4.5). Pure, so the PNG holds only what these lines say. */
export function cardLines(marks: string[], t: TonightFile): CardLines {
  const { k, top } = keepWatchScore(marks, t);
  const d = new Date(Date.parse(t.asOf));
  return {
    kicker: copy.card.kicker(tonightYear(t) + 1),
    title: copy.card.title,
    rows: marks.map((id) => {
      const s = t.scars.find((x) => x.id === id)!;
      return { id, line: copy.card.row(s.late, coords(s.cx, s.cy).replace('  ', ' ')) };
    }),
    result: copy.keep.result(k, top),
    caveat: copy.keep.caveat,
    sealed: copy.card.sealedOn(`${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`),
    credit: t.credit,
    site: copy.card.site,
  };
}
