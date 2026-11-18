// Planning a rising (spec 05 design.md, "Planning a rising"). Port of the board's checkRise() (Main.dc.html L740–776)
// and the camera values in renderVals() (L1250–1255). Pure: every rising is a published rise in a forward step.
import * as copy from '../copy/rising';
import { clamp, fmtDay } from './format';
import type { Speed } from './derive';
import type { Grave, SeasonData } from './types';

export const ZOOM = 2.4;
export const BEATS = 3; // board storyBeats default
export const HOLD_BEAT_MS = 6000;
export const HOLD_MS = 3000;
export const STING_MS = 4500;
/** A flash (and boom) at most once a second keeps flashes under 3 per second (WCAG 2.3.1, Requirement 2.4). */
export const FLASH_GAP_MS = 1000;
export const MAX_BELLS = 5;

/** Graves of the season whose published rise day is in (from, to], in published order. */
export function risingsIn(season: SeasonData, from: number, to: number): Grave[] {
  if (to <= from) return [];
  return season.graves.filter((g) => g.rise !== null && g.rise.day > from && g.rise.day <= to);
}

export interface PlanInput {
  season: SeasonData;
  from: number;
  to: number;
  /** Reached by the replay clock, not by scrubbing. */
  played: boolean;
  beatsSoFar: number;
  speed: Speed;
  lantern: boolean;
  compare: boolean;
  now: number;
  /** Time of the last flash, or -Infinity. */
  lastFlash: number;
}

export interface RisingPlan {
  graves: Grave[];
  lead: Grave;
  /** rise.day − melt for each grave, in the same order. */
  days: number[];
  beat: 1 | 2 | 3 | null;
  camera: { id: string; x: number; y: number; until: number } | null;
  bells: number;
  flash: boolean;
  stingUntil: number;
}

export function planRising(i: PlanInput): RisingPlan | null {
  const graves = risingsIn(i.season, i.from, i.to);
  const lead = graves[0];
  if (!lead || !lead.rise) return null;
  const isBeat = i.played && i.beatsSoFar < BEATS;
  const beat = isBeat ? ((i.beatsSoFar + 1) as 1 | 2 | 3) : null;
  const camOk = i.played && !i.lantern && !i.compare && (isBeat || i.speed !== '2');
  const camera = camOk ? { id: lead.id, x: lead.rise.x, y: lead.rise.y, until: i.now + (isBeat ? HOLD_BEAT_MS : HOLD_MS) } : null;
  const risenSoFar = i.season.graves.filter((g) => g.rise !== null && g.rise.day <= i.to).length;
  return {
    graves,
    lead,
    days: graves.map((g) => g.rise!.day - g.melt),
    beat,
    camera,
    bells: camera ? Math.min(MAX_BELLS, risenSoFar) : 0,
    flash: i.now - i.lastFlash >= FLASH_GAP_MS,
    stingUntil: i.now + STING_MS,
  };
}

/** Camera translate (% of the map) and scale for a hotspot, clamped so the zoomed map always covers the frame. */
export function cameraTransform(x: number, y: number): { tx: number; ty: number; scale: number } {
  const lo = 100 - 100 * ZOOM;
  return {
    tx: clamp(50 - (ZOOM * x * 100) / 1060, lo, 0),
    ty: clamp(50 - (ZOOM * y * 100) / 716, lo, 0),
    scale: ZOOM,
  };
}

export interface StingView { title: string; detail: string; live: string; x: number; y: number }

export function stingView(plan: RisingPlan, year: number): StingView {
  const graves = plan.graves.map((g, k) => ({ id: g.id, days: plan.days[k]! }));
  const date = fmtDay(plan.lead.rise!.day, year);
  return {
    title: copy.sting.title(graves),
    detail: copy.sting.detail(graves, date),
    live: copy.sting.live(graves, date),
    x: plan.lead.rise!.x,
    y: plan.lead.rise!.y,
  };
}
