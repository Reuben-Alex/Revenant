// Daylight view values (spec 04 design.md, "Daylight derivations"). Port of the board's renderVals() `day: {…}`
// (Main.dc.html L1353–1359), with the snow average and status rebuilt from published fields only.
import * as copy from '../copy/daylight';
import { MONTHS, fmtDay, km2 } from './format';
import type { Keyframe } from './imagery';
import type { Grave, SeasonData } from './types';

/** Opening week: replay days 0–6 (Mar 21–27). */
export const WEEK_DAYS = 7;
/** A burn area counts as snow-covered when its opening-week mean is at least this. */
export const COVERED_PCT = 50;

/** km per grid px along x at 57° N: 17/1060° × 111.32 km × cos 57° ≈ 0.972 km. */
export const KM_PER_PX_X = (17 / 1060) * 111.32 * Math.cos((57 * Math.PI) / 180);
/** Width of a 60 km scale bar as a percentage of the map width (≈ 5.82 %). */
export const SCALE_60KM_PCT = (60 / KM_PER_PX_X / 1060) * 100;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** "Thu, Mar 21, 2024" for season day 0, in UTC. */
export function dayZeroLabel(year: number): string {
  const t = new Date(Date.UTC(year, 2, 21));
  return `${WEEKDAYS[t.getUTCDay()]}, ${MONTHS[t.getUTCMonth()]} ${t.getUTCDate()}, ${year}`;
}

/** "Mar 21–27": the dates the opening-week mean covers. */
export function weekRange(year: number): string {
  const a = fmtDay(0, year);
  const b = fmtDay(WEEK_DAYS - 1, year);
  const [ma] = a.split(' ');
  const [mb, db] = b.split(' ');
  return ma === mb ? `${a}–${db}` : `${a}–${mb} ${db}`;
}

/** Mean of the valid (≥ 0) snow values in the opening week, rounded; null when none is valid. */
export function areaSnow(g: Grave): number | null {
  const v = g.snow.slice(0, WEEK_DAYS).filter((x) => x >= 0);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
}

/** Mean of the non-null area values, rounded; null when no area has data. */
export function snowAverage(areas: (number | null)[]): number | null {
  const v = areas.filter((x): x is number => x !== null);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
}

/** A burn area has re-ignited by day 0 when its published rise is on or before day 0. */
export const reignitedByDayZero = (g: Grave) => g.rise !== null && g.rise.day <= 0;

export const baId = (graveId: string) => graveId.replace('G-', 'BA-');

export interface DayDot { id: string; x: number; y: number; lx: number; ly: number; label: boolean }
export interface DayRow { id: string; line: string; bar: number; pill: string; reignited: boolean }

export interface DaylightView {
  dots: DayDot[];
  rows: DayRow[];
  areas: (number | null)[];
  snowAvg: number | null;
  covered: number;
  reignited: number;
  total: number;
  clear: boolean;
  text: {
    chip: string;
    date: string;
    headline: string;
    status: string;
    reignited: string;
    areas: string;
    areasSub: string;
    snow: string;
    snowSub: string;
    viewAll: string;
    layerScars: string;
    imageCredit: string;
    titleLine2: string;
  };
}

export function daylightView(season: SeasonData, keyframe: Keyframe, satellite: string, staticCount: number): DaylightView {
  const { graves, year } = season;
  const areas = graves.map(areaSnow);
  const snowAvg = snowAverage(areas);
  const covered = areas.filter((v) => v !== null && v >= COVERED_PCT).length;
  const reignited = graves.filter(reignitedByDayZero).length;
  const total = graves.length;
  const clear = reignited === 0;

  const dots = graves.map((g, i) => ({ id: baId(g.id), x: g.cx, y: g.cy, lx: g.cx + 11, ly: g.cy + 4, label: i < 8 }));
  const rows = graves.slice(0, 5).map((g) => {
    const r = reignitedByDayZero(g);
    const snow = areaSnow(g);
    return { id: baId(g.id), line: copy.rows.line(km2(g.size), snow), bar: snow ?? 0, pill: r ? copy.rows.reignited : copy.rows.inactive, reignited: r };
  });

  return {
    dots, rows, areas, snowAvg, covered, reignited, total, clear,
    text: {
      chip: copy.header.chip(year),
      date: dayZeroLabel(year),
      headline: clear ? copy.status.clear : copy.status.notClear(reignited),
      status: copy.status.text(reignited, covered, total),
      reignited: String(reignited),
      areas: String(total),
      areasSub: clear ? copy.stats.allInactive : copy.stats.active(reignited),
      snow: copy.stats.snowValue(snowAvg),
      snowSub: copy.stats.snowSub(weekRange(year)),
      viewAll: copy.rows.viewAll(total),
      layerScars: copy.map.layerScars(year - 1),
      imageCredit: copy.map.imageCredit(satellite, keyframe.label, year),
      titleLine2: copy.title.line2(staticCount),
    },
  };
}
