// Loaders for public/data/*.json. The pipeline validates these files (scripts/validate-data.mjs);
// here we only check the shape we rely on, and fail loudly rather than render invented values.
import type { Grave, NewFire, SeasonData, SeasonKey, SeasonsFile, TonightFile, TonightScar } from './types';
import { SEASON_KEYS } from './types';

export class DataError extends Error {
  readonly file: string;
  constructor(file: string, message: string) {
    super(`${file}: ${message}`);
    this.file = file;
  }
}

const pad = (n: number) => String(n).padStart(2, '0');
type Raw = Record<string, unknown>;

function need(cond: unknown, file: string, msg: string): asserts cond {
  if (!cond) throw new DataError(file, msg);
}
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function parseGrave(row: unknown, i: number, file: string, where: string): Grave {
  need(Array.isArray(row) && row.length === 7, file, `${where}.g[${i}] is not a 7-field grave row`);
  const [size, cx, cy, melt, rise, early, snow] = row as unknown[];
  need(isNum(size) && isNum(cx) && isNum(cy) && isNum(melt) && isNum(early), file, `${where}.g[${i}] has a non-number field`);
  need(typeof snow === 'string', file, `${where}.g[${i}] snow series is not a string`);
  const series = snow.split(',').map(Number);
  need(series.length === 103 && series.every(Number.isFinite), file, `${where}.g[${i}] snow series is not 103 numbers`);
  let r: Grave['rise'] = null;
  if (rise !== 0) {
    need(Array.isArray(rise) && rise.length === 3 && rise.every(isNum), file, `${where}.g[${i}] rise is not [day, x, y]`);
    r = { day: rise[0] as number, x: rise[1] as number, y: rise[2] as number };
  }
  return { id: `G-${pad(i + 1)}`, size, cx, cy, melt, rise: r, early, snow: series };
}

export function parseSeasons(raw: unknown, file = 'seasons.json'): SeasonsFile {
  need(raw && typeof raw === 'object', file, 'top level is not an object');
  const d = raw as Raw;
  const seasons = {} as Record<SeasonKey, SeasonData>;
  for (const key of SEASON_KEYS) {
    const s = d[key] as Raw | undefined;
    need(s && Array.isArray(s.g) && Array.isArray(s.f), file, `${key} is missing or has no g/f lists`);
    need(isNum(s.chance) && typeof s.zombie === 'boolean', file, `${key} has no chance/zombie`);
    const graves = (s.g as unknown[]).map((row, i) => parseGrave(row, i, file, key));
    const fires: NewFire[] = (s.f as unknown[]).map((row, i) => {
      need(Array.isArray(row) && row.length === 3 && row.every(isNum), file, `${key}.f[${i}] is not [x, y, first_day]`);
      return { id: `F-${pad(i + 1)}`, x: row[0] as number, y: row[1] as number, day: row[2] as number };
    });
    seasons[key] = {
      key, year: Number(key.slice(1)), graves, fires,
      chance: s.chance, zombie: s.zombie, risen: graves.filter((g) => g.rise).length,
    };
  }
  need(isNum(d.static), file, 'static is not a number');
  const meta = d.meta as SeasonsFile['meta'] | undefined;
  need(meta && typeof meta.credit === 'string' && isNum(meta.proximity_km), file, 'meta is missing');
  return { seasons, static: d.static, meta };
}

export function parseTonight(raw: unknown, file = 'tonight.json'): TonightFile {
  need(raw && typeof raw === 'object', file, 'top level is not an object');
  const d = raw as Raw;
  need(Array.isArray(d.g) && Array.isArray(d.r), file, 'g/r lists are missing');
  const scars: TonightScar[] = (d.g as unknown[]).map((row, i) => {
    need(Array.isArray(row) && row.length === 7, file, `g[${i}] is not a 7-field row`);
    const [size, cx, cy, last, late, xy, snow] = row as unknown[];
    need(isNum(size) && isNum(cx) && isNum(cy) && typeof last === 'string' && isNum(late) && isNum(snow), file, `g[${i}] has a bad field`);
    const lateXY = Array.isArray(xy) && xy.length === 2 && xy.every(isNum) ? ([xy[0], xy[1]] as [number, number]) : null;
    return { id: `G-${pad(i + 1)}`, size, cx, cy, lastBurn: last, late, lateXY, snowNow: snow };
  });
  const clusters = (d.r as unknown[]).map((row, i) => {
    need(Array.isArray(row) && row.length === 3 && row.every(isNum), file, `r[${i}] is not [x, y, n]`);
    return [row[0], row[1], row[2]] as [number, number, number];
  });
  for (const k of ['as_of', 'frame_date', 'points_through', 'credit'] as const) {
    need(typeof d[k] === 'string', file, `${k} is missing`);
  }
  need(isNum(d.static) && Array.isArray(d.sources), file, 'static/sources missing');
  const watch = d.watch as unknown;
  need(Array.isArray(watch) && watch.length === scars.length && watch.every((v) => Number.isInteger(v) && v >= 0 && v < scars.length)
    && new Set(watch).size === scars.length, file, 'watch is not a ranking of the scars');
  return {
    scars, watch: watch as number[], clusters, static: d.static, asOf: d.as_of as string, frameDate: d.frame_date as string,
    pointsThrough: d.points_through as string, sources: d.sources as string[], credit: d.credit as string,
  };
}

async function fetchJson(url: string, file: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-cache' });
  } catch {
    throw new DataError(file, 'could not be fetched');
  }
  if (!res.ok) throw new DataError(file, `HTTP ${res.status}`);
  try {
    return await res.json();
  } catch {
    throw new DataError(file, 'is not valid JSON');
  }
}

export async function loadSeasons(): Promise<SeasonsFile> {
  return parseSeasons(await fetchJson('/data/seasons.json', 'seasons.json'));
}

/** Tonight is optional: the replay seasons still work without it (design.md, Error Handling). */
export async function loadTonight(): Promise<TonightFile | null> {
  try {
    return parseTonight(await fetchJson('/data/tonight.json', 'tonight.json'));
  } catch {
    return null;
  }
}
