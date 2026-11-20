// The grave dossier as a pure view of one published grave (spec 07 design.md, "Pure logic"). Built from the same
// published fields as the exhumation panel, at the end of the season (day 102).
import * as copy from '../copy/dossier';
import { DAYS } from './derive';
import { clamp, coords, fmtDay, km2, lat, lon, region } from './format';
import { FRAME_SATELLITE, KEYFRAMES } from './imagery';
import type { Grave, SeasonKey, SeasonsFile } from './types';
import { SEASON_KEYS } from './types';

export const DEFAULT = { season: 's2024' as SeasonKey, id: 'G-03' };
const W = 1060;
const H = 716;
const Z = 2.2; // board crop zoom

/** `#s2024/G-03` → { season, id }; null when malformed. */
export function parseHash(hash: string): { season: SeasonKey; id: string } | null {
  const m = /^#?(s20\d\d)\/(G-\d\d)$/.exec(hash.trim());
  if (!m || !(SEASON_KEYS as readonly string[]).includes(m[1]!)) return null;
  return { season: m[1] as SeasonKey, id: m[2]! };
}

export interface Band { from: number; to: number }

/** Runs of days after the melt day and before the rise (or the window's end) with snow ≥ 15 % again. */
export function lateSnowBands(series: number[], melt: number, rise: number | null): Band[] {
  if (melt < 0) return [];
  const end = Math.min(DAYS + 1, rise ?? melt + 51);
  const out: Band[] = [];
  for (let d = melt + 1; d < end && d < series.length; d++) {
    if ((series[d] ?? -1) < 15) continue;
    const last = out[out.length - 1];
    if (last && last.to === d - 1) last.to = d;
    else out.push({ from: d, to: d });
  }
  return out;
}

export type DossierState = 'risen' | 'rest' | 'buried';

export interface DossierView {
  season: SeasonKey; id: string; year: number; state: DossierState;
  kicker: string; title: string; lede: string;
  crops: { src: string; alt: string; title: string; caption: string; left: number; top: number; width: number; rx: number; ry: number; on: boolean }[];
  credit: string;
  checks: { ok: 'yes' | 'no' | 'off'; title: string; detail: string }[];
  ruleTitle: string;
  chart: {
    curve: string; band: { x: number; w: number } | null; meltX: number | null; meltLabel: string; riseX: number | null; riseLabel: string;
    late: { x: number; w: number }[]; aria: string; caption: string;
  };
  life: { date: string; state: string; text: string; color: string }[];
  sightings: { date: string; where: string; days: string }[];
  grave: Grave;
}

const X = (d: number) => (d / DAYS) * 420;
const Y = (v: number) => 160 - (v / 100) * 150;

/** Board lede: "Here lies the great burn of summer 2023 in northeast British Columbia. It did not stay down." */
const epitaph = (g: Grave, year: number, state: DossierState) => copy.hero.lede(km2(g.size), year - 1, region(g.cx), state);

export function dossierView(data: SeasonsFile, season: SeasonKey, id: string): DossierView | null {
  const s = data.seasons[season];
  const g = s?.graves.find((x) => x.id === id);
  if (!s || !g) return null;
  const year = s.year;
  const rise = g.rise?.day ?? null;
  const state: DossierState = rise !== null ? 'risen' : g.melt >= 0 ? 'rest' : 'buried';
  const [px, py] = g.rise ? [g.rise.x, g.rise.y] : [g.cx, g.cy];
  const km = data.meta.proximity_km;

  const win = 100 / Z;
  const ox = clamp(px - win / 2, 0, W - win);
  const oy = clamp(py - win / 2, 0, H - win);
  const crops = KEYFRAMES[season].map((f) => {
    const phase = g.melt < 0 || f.day < g.melt ? 'buried' : rise !== null && f.day >= rise ? 'risen' : f.day > g.melt + 50 ? 'rest' : 'waking';
    return {
      src: f.src, alt: copy.sat.alt(g.id, f.label, year), title: `${f.label} · ${copy.sat.phase[phase]}`,
      caption: `${copy.sat.snow(g.snow[f.day] ?? -1)} ${copy.sat.rel(f.day, g.melt, rise)}`,
      left: (-ox / win) * 100, top: (-oy / win) * 100, width: (W / win) * 100, rx: (px - ox) * Z, ry: (py - oy) * Z,
      on: rise !== null && f.day >= rise,
    };
  });

  const bands = lateSnowBands(g.snow, g.melt, rise);
  const pts: string[] = [];
  g.snow.forEach((v, i) => { if (v >= 0) pts.push(`${X(i).toFixed(1)} ${Y(v).toFixed(1)}`); });
  const end = Math.min(DAYS, g.melt + 50);
  const firstSeen = g.snow.findIndex((v) => v >= 0);

  const life = [
    { ...copy.life.burned(year - 1, g.size, s.graves.indexOf(g) + 1), color: '#48301F' },
    { ...copy.life.buried(year - 1, year, firstSeen >= 0 ? { day: firstSeen, pct: g.snow[firstSeen]! } : null), color: '#8C989A' },
    { ...copy.life.stirred(year, g.melt), color: '#7FE0CF' },
  ];
  const last = copy.life.end(year, g.melt, rise);
  if (last) life.push({ ...last, color: rise !== null ? 'var(--ember)' : '#5D6A65' });

  const riseDate = rise !== null ? `${fmtDay(rise, year)}, ${year}` : '';
  return {
    season, id: g.id, year, state, grave: g,
    kicker: `${copy.hero.state[state]} · ${rise !== null ? fmtDay(rise, year) : g.melt >= 0 ? fmtDay(g.melt, year) : 'JUL 1'}, ${year} · ${coords(g.cx, g.cy).replace('  ', ' ')}`.toUpperCase(),
    title: copy.hero.title(g.id),
    lede: epitaph(g, year, state),
    crops,
    credit: copy.sat.credit(FRAME_SATELLITE[season], g.rise ? copy.sat.ringRise(fmtDay(g.rise.day, year), coords(g.rise.x, g.rise.y).replace('  ', ' ')) : copy.sat.ringCentre),
    ruleTitle: rise !== null ? copy.rule.title : copy.rule.titleNot,
    checks: [
      { ok: rise !== null ? 'yes' : 'no', ...copy.rule.scar(year - 1, km, rise !== null) },
      { ok: rise !== null ? 'yes' : 'no', ...copy.rule.window(year, g.melt, rise) },
      { ok: 'yes', ...copy.rule.flare(data.static, rise !== null) },
      { ok: 'off', ...copy.rule.lightning },
    ],
    chart: {
      curve: pts.length ? 'M' + pts.join(' L') : '',
      band: g.melt >= 0 ? { x: X(g.melt), w: X(end) - X(g.melt) } : null,
      meltX: g.melt >= 0 ? X(g.melt) : null, meltLabel: g.melt >= 0 ? copy.snow.melt(fmtDay(g.melt, year)) : '',
      riseX: rise !== null ? X(rise) : null, riseLabel: rise !== null ? copy.snow.rise(fmtDay(rise, year)) : '',
      late: bands.map((b) => ({ x: X(b.from - 0.5), w: X(b.to + 0.5) - X(b.from - 0.5) })),
      aria: copy.snow.aria(year, g.melt, rise, bands),
      caption: copy.snow.caption(year, g.melt, rise, bands),
    },
    life,
    sightings: g.rise ? [{ date: riseDate, where: coords(g.rise.x, g.rise.y).replace('  ', ' '), days: String(g.rise.day - g.melt) }] : [],
  };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const pt = (x: number, y: number) => `${lon(x).toFixed(4)},${lat(y).toFixed(4)},0`;

/** KML 2.2: the scar centre and, when it rose, the rise point (Requirement 5.8). Points only. */
export function kml(v: DossierView): string {
  const g = v.grave;
  const place = (name: string, x: number, y: number) =>
    `  <Placemark><name>${esc(name)}</name><description>${esc(copy.kml.desc(v.year - 1))}</description><Point><coordinates>${pt(x, y)}</coordinates></Point></Placemark>`;
  const marks = [place(copy.kml.centre(g.id), g.cx, g.cy)];
  if (g.rise) marks.push(place(copy.kml.rise(g.id, `${fmtDay(g.rise.day, v.year)}, ${v.year}`), g.rise.x, g.rise.y));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n <Document>\n  <name>${esc(copy.kml.doc(g.id, v.year))}</name>\n${marks.join('\n')}\n </Document>\n</kml>\n`;
}
