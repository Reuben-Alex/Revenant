// Data contract for public/data/*.json (spec 02, Requirement 10). Node built-ins only.
//
//   node scripts/validate-data.mjs                      -> checks public/data/seasons.json and tonight.json (skips missing)
//   node scripts/validate-data.mjs FILE [FILE...]       -> kind from the file name (seasons* / tonight*)
//   node scripts/validate-data.mjs --kind seasons FILE  -> explicit kind (used by the pipeline on temp files)
//
// Exit 0 when every check passes, 1 otherwise. Each failure is printed as "<file> <json path>: <message>".

import { readFileSync, existsSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const GRID_W = 1060;
export const GRID_H = 716;
export const SEASON_DAYS = 103;
export const RISE_WINDOW = 50;
export const ZOMBIE_FACTOR = 1.4;
export const SEASON_KEYS = ['s2024', 's2025', 's2026'];
export const MAX_GRAVES = 24;
export const MAX_NEW_FIRES = 24;
export const MAX_CLUSTERS = 30;
// honesty.md: credit the sources whose data the file holds. Tonight's scars are detection hulls, not NBAC.
export const SEASON_CREDITS = ['FIRMS', 'GIBS', 'NBAC', 'Scholten'];
export const TONIGHT_CREDITS = ['FIRMS', 'GIBS', 'Scholten'];

const isInt = (v) => Number.isInteger(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function isIsoDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function isIsoDateTime(s) {
  if (typeof s !== 'string') return false;
  const m = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.exec(s);
  return Boolean(m) && isIsoDate(m[1]) && !Number.isNaN(new Date(s).getTime());
}

function checker() {
  const errors = [];
  const fail = (path, msg) => errors.push(`${path}: ${msg}`);
  const need = (cond, path, msg) => { if (!cond) fail(path, msg); return cond; };
  const int = (v, path, lo, hi, what) =>
    need(isInt(v) && v >= lo && v <= hi, path, `${what} must be an integer in [${lo}, ${hi}], got ${JSON.stringify(v)}`);
  const gx = (v, path) => int(v, path, 0, GRID_W - 1, 'grid x');
  const gy = (v, path) => int(v, path, 0, GRID_H - 1, 'grid y');
  const list = (v, path, max, what) =>
    need(Array.isArray(v), path, `${what} must be an array`) &&
    need(v.length <= max, path, `at most ${max} ${what}, got ${v.length}`);
  const credit = (v, path, required) => {
    if (!need(typeof v === 'string' && v.trim() !== '', path, 'credit string is missing')) return;
    for (const c of required) need(v.includes(c), path, `credit must name ${c}`);
  };
  const sources = (v, path) =>
    need(Array.isArray(v) && v.length > 0 && v.every((s) => typeof s === 'string' && s.trim() !== ''),
      path, 'sources must be a non-empty array of strings');
  return { errors, fail, need, int, gx, gy, list, credit, sources };
}

function checkSnow(c, s, path) {
  if (!c.need(typeof s === 'string', path, 'snow series must be a string')) return;
  const parts = s.split(',');
  if (!c.need(parts.length === SEASON_DAYS, path, `snow series must have ${SEASON_DAYS} values, got ${parts.length}`)) return;
  parts.forEach((p, i) => {
    const ok = /^-?\d+$/.test(p) && Number(p) >= -1 && Number(p) <= 100;
    c.need(ok, `${path}[${i}]`, `snow value must be an integer in [-1, 100], got ${JSON.stringify(p)}`);
  });
}

function checkGrave(c, g, path) {
  if (!c.need(Array.isArray(g) && g.length === 7, path, 'grave must be [size_px, cx, cy, melt, rise|0, early_hits, snow]')) return false;
  const [size, cx, cy, melt, rise, early, snow] = g;
  c.int(size, `${path}[0]`, 1, GRID_W * GRID_H, 'size_px');
  c.gx(cx, `${path}[1]`);
  c.gy(cy, `${path}[2]`);
  const meltOk = c.need(melt === -1 || (isInt(melt) && melt >= 0 && melt < SEASON_DAYS), `${path}[3]`,
    `melt day must be -1 or an integer in [0, ${SEASON_DAYS - 1}], got ${JSON.stringify(melt)}`);
  c.int(early, `${path}[5]`, 0, Number.MAX_SAFE_INTEGER, 'early_hits');
  if (meltOk && melt === -1) c.need(early === 0, `${path}[5]`, 'early_hits must be 0 when the grave never melted');
  checkSnow(c, snow, `${path}[6]`);
  if (rise === 0) return false;
  if (!c.need(Array.isArray(rise) && rise.length === 3, `${path}[4]`, 'rise must be 0 or [day, x, y]')) return false;
  const [day, x, y] = rise;
  c.int(day, `${path}[4][0]`, 0, SEASON_DAYS - 1, 'rise day');
  c.gx(x, `${path}[4][1]`);
  c.gy(y, `${path}[4][2]`);
  if (meltOk) {
    if (melt === -1) c.fail(`${path}[4]`, 'a grave that never melted cannot rise');
    else {
      const hi = Math.min(melt + RISE_WINDOW, SEASON_DAYS - 1);
      c.need(isInt(day) && day >= melt && day <= hi, `${path}[4][0]`, `rise day ${day} outside [melt ${melt}, ${hi}]`);
    }
  }
  return true;
}

export function validateSeasons(data) {
  const c = checker();
  if (!c.need(isObj(data), '$', 'top level must be an object')) return c.errors;
  for (const key of SEASON_KEYS) {
    const s = data[key];
    const p = `$.${key}`;
    if (!c.need(isObj(s), p, 'season is missing')) continue;
    let risen = 0;
    if (c.list(s.g, `${p}.g`, MAX_GRAVES, 'graves')) {
      c.need(s.g.length > 0, `${p}.g`, 'season has no graves');
      s.g.forEach((g, i) => { if (checkGrave(c, g, `${p}.g[${i}]`)) risen += 1; });
    }
    if (c.list(s.f, `${p}.f`, MAX_NEW_FIRES, 'new fires')) {
      s.f.forEach((f, i) => {
        const fp = `${p}.f[${i}]`;
        if (!c.need(Array.isArray(f) && f.length === 3, fp, 'new fire must be [x, y, first_day]')) return;
        c.gx(f[0], `${fp}[0]`);
        c.gy(f[1], `${fp}[1]`);
        c.int(f[2], `${fp}[2]`, 0, SEASON_DAYS - 1, 'first_day');
      });
    }
    const chanceOk = c.need(isNum(s.chance) && s.chance >= 0 && s.chance <= 1, `${p}.chance`,
      `chance must be a number in [0, 1], got ${JSON.stringify(s.chance)}`);
    if (c.need(typeof s.zombie === 'boolean', `${p}.zombie`, 'zombie must be true or false') &&
        chanceOk && Array.isArray(s.g) && s.g.length > 0) {
      const expected = risen / s.g.length > ZOMBIE_FACTOR * s.chance;
      c.need(s.zombie === expected, `${p}.zombie`,
        `zombie is ${s.zombie} but ${risen}/${s.g.length} > ${ZOMBIE_FACTOR} × ${s.chance} is ${expected}`);
    }
  }
  c.int(data.static, '$.static', 0, Number.MAX_SAFE_INTEGER, 'static');
  const m = data.meta;
  if (c.need(isObj(m), '$.meta', 'meta is missing')) {
    c.need(isIsoDateTime(m.generated_at), '$.meta.generated_at', 'generated_at must be an ISO date-time with a time zone');
    c.need(typeof m.method === 'string' && m.method.trim() !== '', '$.meta.method', 'method must be a non-empty string');
    c.need(isNum(m.proximity_km) && m.proximity_km > 0, '$.meta.proximity_km', 'proximity_km must be a positive number');
    c.sources(m.sources, '$.meta.sources');
    c.credit(m.credit, '$.meta.credit', SEASON_CREDITS);
  }
  return c.errors;
}

export function validateTonight(data) {
  const c = checker();
  if (!c.need(isObj(data), '$', 'top level must be an object')) return c.errors;
  const asOf = c.need(isIsoDateTime(data.as_of), '$.as_of', 'as_of must be an ISO date-time with a time zone');
  const through = c.need(isIsoDate(data.points_through), '$.points_through', 'points_through must be YYYY-MM-DD');
  const frame = c.need(isIsoDate(data.frame_date), '$.frame_date', 'frame_date must be YYYY-MM-DD');
  const asOfDay = asOf ? new Date(data.as_of).toISOString().slice(0, 10) : null;
  if (asOf && through) c.need(data.points_through <= asOfDay, '$.points_through', 'points_through is after as_of');
  if (asOf && frame) c.need(data.frame_date <= asOfDay, '$.frame_date', 'frame_date is after as_of');
  if (c.list(data.g, '$.g', MAX_GRAVES, 'graves')) {
    data.g.forEach((g, i) => {
      const p = `$.g[${i}]`;
      if (!c.need(Array.isArray(g) && g.length === 7, p,
        'grave must be [size_px, cx, cy, last_burn, late_hits_14d, [x, y]|0, snow_pct_now]')) return;
      const [size, cx, cy, last, hits, xy, snow] = g;
      c.int(size, `${p}[0]`, 1, GRID_W * GRID_H, 'size_px');
      c.gx(cx, `${p}[1]`);
      c.gy(cy, `${p}[2]`);
      if (c.need(isIsoDate(last), `${p}[3]`, 'last_burn must be YYYY-MM-DD') && through)
        c.need(last <= data.points_through, `${p}[3]`, 'last_burn is after points_through');
      const hitsOk = c.int(hits, `${p}[4]`, 0, Number.MAX_SAFE_INTEGER, 'late_hits_14d');
      if (xy === 0) {
        if (hitsOk) c.need(hits === 0, `${p}[5]`, 'late heat position is 0 but late_hits_14d > 0');
      } else if (c.need(Array.isArray(xy) && xy.length === 2, `${p}[5]`, 'late heat position must be 0 or [x, y]')) {
        c.gx(xy[0], `${p}[5][0]`);
        c.gy(xy[1], `${p}[5][1]`);
        if (hitsOk) c.need(hits > 0, `${p}[5]`, 'late heat position given but late_hits_14d is 0');
      }
      c.int(snow, `${p}[6]`, -1, 100, 'snow_pct_now');
    });
  }
  // spec 07 Requirement 2.2: the watch ranking is a permutation of the grave indices.
  if (c.need(Array.isArray(data.watch), '$.watch', 'watch must be an array of grave indices') && Array.isArray(data.g)) {
    const n = data.g.length;
    const ok = data.watch.length === n && data.watch.every((v) => Number.isInteger(v) && v >= 0 && v < n)
      && new Set(data.watch).size === n;
    c.need(ok, '$.watch', `watch must be a permutation of 0..${n - 1}`);
  }
  if (c.list(data.r, '$.r', MAX_CLUSTERS, 'clusters')) {
    data.r.forEach((r, i) => {
      const p = `$.r[${i}]`;
      if (!c.need(Array.isArray(r) && r.length === 3, p, 'cluster must be [x, y, point_count]')) return;
      c.gx(r[0], `${p}[0]`);
      c.gy(r[1], `${p}[1]`);
      c.int(r[2], `${p}[2]`, 1, Number.MAX_SAFE_INTEGER, 'point_count');
    });
  }
  c.int(data.static, '$.static', 0, Number.MAX_SAFE_INTEGER, 'static');
  c.sources(data.sources, '$.sources');
  c.credit(data.credit, '$.credit', TONIGHT_CREDITS);
  return c.errors;
}

export function kindOf(file) {
  const name = basename(file).toLowerCase();
  if (name.startsWith('seasons')) return 'seasons';
  if (name.startsWith('tonight')) return 'tonight';
  return null;
}

export function validateFile(file, kind = kindOf(file)) {
  if (kind !== 'seasons' && kind !== 'tonight') return [`cannot tell whether ${file} is seasons or tonight data (use --kind)`];
  let data;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    return [`$: not valid JSON (${e.message})`];
  }
  return kind === 'seasons' ? validateSeasons(data) : validateTonight(data);
}

export function main(argv, { root = process.cwd(), log = console.log, err = console.error } = {}) {
  let kind = null;
  const files = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--kind') kind = argv[++i];
    else files.push(argv[i]);
  }
  const explicit = files.length > 0;
  const targets = explicit ? files : ['public/data/seasons.json', 'public/data/tonight.json'];
  let failed = 0;
  let checked = 0;
  for (const f of targets) {
    const path = resolve(root, f);
    if (!existsSync(path)) {
      if (explicit) { err(`${f}: file not found`); failed++; } else log(`${f}: not found, skipped`);
      continue;
    }
    checked++;
    const errors = validateFile(path, kind ?? kindOf(f));
    if (errors.length) {
      failed++;
      for (const e of errors) err(`${f} ${e}`);
    } else log(`${f}: ok`);
  }
  if (!explicit && checked === 0) log('no data files yet');
  return failed ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exit(main(process.argv.slice(2)));
}
