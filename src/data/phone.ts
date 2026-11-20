// The field-crew phone as a pure view (spec 07 design.md, "Pure logic"): which graves to list, the card (nearest when
// the viewer's position is known, else the top of the list), the map crop, and the share text. The position is an
// argument; nothing here stores or sends it.
import * as copy from '../copy/phone';
import { graveCallout, graveViews, tonightViews, type GraveView } from './derive';
import { clamp, fmtIso, lat, lon } from './format';
import { KEYFRAMES, MASK_CLASS, TONIGHT_FRAME } from './imagery';
import { watchRank } from './tonight';
import type { SeasonKey, SeasonsFile, TonightFile } from './types';

export type PhoneScene = 'tonight' | SeasonKey;
export interface Pos { lat: number; lon: number }

const R_KM = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export interface Item { id: string; x: number; y: number; lat: number; lon: number; status: string; color: string; line1: string; line2: string; km: number | null; view: GraveView }

/** The nearest item to `pos`; ties go to the earlier item. */
export function nearest<T extends { lat: number; lon: number }>(pos: Pos, items: T[]): T | null {
  let best: T | null = null;
  let d = Infinity;
  for (const it of items) {
    const k = haversineKm(pos.lat, pos.lon, it.lat, it.lon);
    if (k < d) { d = k; best = it; }
  }
  return best;
}

export const mapsLink = (la: number, lo: number) => `https://www.google.com/maps/search/?api=1&query=${la.toFixed(5)},${lo.toFixed(5)}`;
const toGrid = (p: Pos) => ({ x: ((p.lon + 126) / 17) * 1060, y: ((60 - p.lat) / 6) * 716 });
const inRegion = (p: Pos) => p.lat >= 54 && p.lat <= 60 && p.lon >= -126 && p.lon <= -109;

export interface PhoneView {
  scene: PhoneScene; year: number; kicker: string; title: string; badge: string;
  items: Item[]; card: Item | null; cardLabel: string;
  frame: string; mask: string; crop: { x: number; y: number; w: number; h: number };
  you: { x: number; y: number } | null; outside: boolean; seasonLabel: string;
}

function item(v: GraveView, year: number, pos: Pos | null): Item {
  const c = graveCallout(v, year);
  const x = v.rx, y = v.ry;
  return {
    id: v.id, x, y, lat: lat(y), lon: lon(x), status: v.label, color: v.color, line1: c.line1, line2: c.line2, view: v,
    km: pos ? haversineKm(pos.lat, pos.lon, lat(y), lon(x)) : null,
  };
}

/** The crop: the listed points (and the viewer, if inside the region), padded, at the board's 350:250 aspect. */
export function cropFor(points: { x: number; y: number }[], aspect = 350 / 250) {
  if (!points.length) return { x: 0, y: 0, w: 1060, h: 1060 / aspect };
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  let w = Math.max(240, Math.max(...xs) - Math.min(...xs) + 120);
  let h = Math.max(...ys) - Math.min(...ys) + 120;
  if (w / h < aspect) w = h * aspect; else h = w / aspect;
  // Keep the aspect. The crop may run up to EDGE px past the grid so a stone on the region's edge isn't cut off
  // (the overhang shows the empty map background); a crop larger than the grid is centred on it.
  if (w > 1060) { w = 1060; h = w / aspect; }
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const EDGE = 40;
  const at = (c: number, size: number, full: number) =>
    size >= full ? (full - size) / 2 : clamp(c - size / 2, -EDGE, full - size + EDGE);
  return { x: at(cx, w, 1060), y: at(cy, h, 716), w, h };
}

export function phoneView(data: SeasonsFile, t: TonightFile | null, scene: PhoneScene, pos: Pos | null, focus: string | null): PhoneView {
  const isT = scene === 'tonight' && t !== null;
  const key = (isT ? 'tonight' : scene === 'tonight' ? 's2024' : scene) as PhoneScene;
  const year = isT ? Number(t!.pointsThrough.slice(0, 4)) : data.seasons[key as SeasonKey].year;
  const views = isT ? tonightViews(t!) : graveViews(data.seasons[key as SeasonKey], 102);
  let listed: GraveView[];
  if (isT) {
    const rank = watchRank(t!);
    listed = views.filter((v) => v.warm).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
  } else {
    listed = views.filter((v) => v.risen).sort((a, b) => b.grave!.rise!.day - a.grave!.rise!.day);
  }
  const items = listed.map((v) => item(v, year, pos));
  const focused = focus ? views.find((v) => v.id === focus) : undefined;
  let card: Item | null;
  let cardLabel: string;
  if (focused) { card = items.find((i) => i.id === focused.id) ?? item(focused, year, pos); cardLabel = copy.card.sent; }
  else if (pos && items.length) { card = nearest(pos, items); cardLabel = copy.card.nearest(Math.round(card!.km!).toLocaleString('en-US')); }
  else { card = items[0] ?? null; cardLabel = copy.card.top; }

  const youIn = pos && inRegion(pos) ? toGrid(pos) : null;
  const pts = [...items, ...(card && !items.includes(card) ? [card] : []), ...(youIn ? [youIn] : [])];
  const frames = isT ? [{ src: TONIGHT_FRAME }] : KEYFRAMES[key as SeasonKey];
  return {
    scene: key, year,
    kicker: (isT ? copy.title.kickerTonight(fmtIso(t!.pointsThrough).toUpperCase(), copy.header.region) : copy.title.kickerSpring(year, copy.header.region)),
    title: isT ? copy.title.tonight(items.length) : copy.title.spring(items.length, year),
    badge: copy.header.badge(year),
    items, card, cardLabel,
    frame: frames[frames.length - 1]!.src, mask: MASK_CLASS[key],
    crop: cropFor(pts), you: youIn, outside: !!pos && !youIn,
    seasonLabel: isT ? copy.seasons.tonight : copy.seasons.spring(year),
  };
}

export function shareText(v: PhoneView, card: Item, seen: string, now: number): string {
  const d = new Date(now);
  const when = `${fmtIso(d.toISOString().slice(0, 10))}, ${d.getUTCFullYear()}, ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  return copy.report.text(card.id, v.seasonLabel, `${card.lat.toFixed(4)}°N ${Math.abs(card.lon).toFixed(4)}°W`, when, seen.toLowerCase());
}

/** `#s2024/G-03` or `#tonight/G-02` → scene and grave. */
export function parsePhoneHash(h: string): { scene: PhoneScene; id: string | null } | null {
  const m = /^#?(tonight|s202[4-6])(?:\/(G-\d\d))?$/.exec(h.trim());
  return m ? { scene: m[1] as PhoneScene, id: m[2] ?? null } : null;
}
