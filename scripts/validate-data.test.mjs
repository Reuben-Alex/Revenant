// Tests for scripts/validate-data.mjs (spec 02, Requirement 10). Run: node --test scripts/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { main, validateSeasons, validateTonight, isIsoDate, isIsoDateTime } from './validate-data.mjs';

const SNOW = Array.from({ length: 103 }, (_, i) => (i < 20 ? 80 : i === 50 ? -1 : 3)).join(',');
const CREDIT = 'NASA FIRMS · NASA GIBS/VIIRS · NBAC (NRCan) · Scholten et al. 2021';

function season({ risen = 1, chance = 0.2 } = {}) {
  const g = [];
  for (let i = 0; i < 24; i++) {
    const rise = i < risen ? [30, 100 + i, 200] : 0;
    g.push([5000 - i, 100 + i, 200, 20, rise, 0, SNOW]);
  }
  return { g, f: [[10, 20, 5]], chance, zombie: risen / 24 > 1.4 * chance };
}

function seasons() {
  return {
    s2024: season({ risen: 15, chance: 0.347 }),
    s2025: season({ risen: 8, chance: 0.365 }),
    s2026: season({ risen: 4, chance: 0.201 }),
    static: 12,
    meta: { generated_at: '2026-11-11T10:00:00Z', method: 'firms-nbac-v1', proximity_km: 1,
      sources: ['NASA FIRMS VIIRS 375 m SP'], credit: CREDIT },
  };
}

function tonight() {
  return {
    g: [[1202, 460, 645, '2026-10-26', 3, [462, 663], 40], [900, 300, 100, '2026-09-01', 0, 0, -1]],
    watch: [0, 1],
    r: [[10, 20, 5]],
    static: 7,
    as_of: '2026-11-11T10:05:00Z', frame_date: '2026-11-09', points_through: '2026-11-10',
    sources: ['NASA FIRMS VIIRS 375 m NRT'], credit: CREDIT,
  };
}

const clone = (o) => JSON.parse(JSON.stringify(o));

test('valid examples pass', () => {
  assert.deepEqual(validateSeasons(seasons()), []);
  assert.deepEqual(validateTonight(tonight()), []);
  const s = seasons();
  assert.equal(s.s2024.zombie, true);
  assert.equal(s.s2025.zombie, false);
});

test('a grave that never melted is allowed', () => {
  const s = seasons();
  s.s2025.g[23] = [100, 5, 5, -1, 0, 0, SNOW];
  assert.deepEqual(validateSeasons(s), []);
});

const seasonBreaks = {
  'grid x out of range': (s) => { s.s2024.g[0][1] = 1060; },
  'grid y out of range': (s) => { s.s2024.f[0][1] = -1; },
  'non-integer position': (s) => { s.s2024.g[0][4][1] = 100.5; },
  'rise day outside season': (s) => { s.s2024.g[0][4][0] = 103; },
  'rise before melt': (s) => { s.s2024.g[0][4][0] = 19; },
  'rise after melt + 50': (s) => { s.s2024.g[0][4][0] = 71; },
  'rise without melt': (s) => { s.s2024.g[0][3] = -1; },
  'melt out of range': (s) => { s.s2024.g[1][3] = 103; },
  'early hits without melt': (s) => { s.s2024.g[20] = [100, 5, 5, -1, 0, 2, SNOW]; },
  'new fire first day out of range': (s) => { s.s2024.f[0][2] = 103; },
  'snow series too short': (s) => { s.s2024.g[0][6] = SNOW.split(',').slice(1).join(','); },
  'snow value above 100': (s) => { s.s2024.g[0][6] = SNOW.replace(/^80/, '101'); },
  'snow value below -1': (s) => { s.s2024.g[0][6] = SNOW.replace(/^80/, '-2'); },
  'snow value not an integer': (s) => { s.s2024.g[0][6] = SNOW.replace(/^80/, '8.5'); },
  'chance above 1': (s) => { s.s2025.chance = 1.2; },
  'chance missing': (s) => { delete s.s2025.chance; },
  'zombie disagrees with risen and chance': (s) => { s.s2025.zombie = true; },
  'zombie missing': (s) => { delete s.s2026.zombie; },
  'more than 24 graves': (s) => { s.s2024.g.push(s.s2024.g[23]); },
  'more than 24 new fires': (s) => { s.s2024.f = Array.from({ length: 25 }, () => [1, 1, 1]); },
  'season missing': (s) => { delete s.s2026; },
  'no graves': (s) => { s.s2026.g = []; },
  'grave with wrong length': (s) => { s.s2024.g[0].pop(); },
  'static not an integer': (s) => { s.static = 'many'; },
  'generated_at not ISO': (s) => { s.meta.generated_at = 'yesterday'; },
  'generated_at without time zone': (s) => { s.meta.generated_at = '2026-11-11T10:00:00'; },
  'credit missing': (s) => { delete s.meta.credit; },
  'credit without NBAC': (s) => { s.meta.credit = 'NASA FIRMS · NASA GIBS · Scholten'; },
  'sources empty': (s) => { s.meta.sources = []; },
  'meta missing': (s) => { delete s.meta; },
};

for (const [name, breakIt] of Object.entries(seasonBreaks)) {
  test(`seasons: ${name} fails`, () => {
    const s = clone(seasons());
    breakIt(s);
    const errors = validateSeasons(s);
    assert.ok(errors.length > 0, 'expected at least one error');
    assert.ok(errors.every((e) => e.startsWith('$')), `errors carry a JSON path: ${errors}`);
  });
}

const tonightBreaks = {
  'as_of not ISO': (t) => { t.as_of = '11/11/2026'; },
  'frame_date invalid': (t) => { t.frame_date = '2026-02-30'; },
  'frame_date after as_of': (t) => { t.frame_date = '2026-11-12'; },
  'points_through after as_of': (t) => { t.points_through = '2026-11-12'; },
  'last_burn after points_through': (t) => { t.g[0][3] = '2026-11-11'; },
  'last_burn invalid': (t) => { t.g[0][3] = 'Oct 26'; },
  'late heat position without hits': (t) => { t.g[0][4] = 0; },
  'hits without a late heat position': (t) => { t.g[1][4] = 2; },
  'snow now above 100': (t) => { t.g[0][6] = 101; },
  'cluster x out of range': (t) => { t.r[0][0] = 2000; },
  'cluster with zero points': (t) => { t.r[0][2] = 0; },
  'more than 30 clusters': (t) => { t.r = Array.from({ length: 31 }, () => [1, 1, 1]); },
  'more than 24 graves': (t) => { t.g = Array.from({ length: 25 }, () => t.g[1]); },
  'static missing': (t) => { delete t.static; },
  'credit missing': (t) => { t.credit = ''; },
  'credit without FIRMS': (t) => { t.credit = 'NASA GIBS/VIIRS · Scholten et al. 2021'; },
  'watch missing': (t) => { delete t.watch; },
  'watch with a duplicate index': (t) => { t.watch = [0, 0]; },
  'watch missing an index': (t) => { t.watch = [1]; },
  'watch index out of range': (t) => { t.watch = [0, 2]; },
};

test('tonight credit need not name NBAC (its scars are detection hulls)', () => {
  const t = tonight();
  t.credit = 'NASA FIRMS · NASA GIBS/VIIRS · Scholten et al. 2021';
  assert.deepEqual(validateTonight(t), []);
});

for (const [name, breakIt] of Object.entries(tonightBreaks)) {
  test(`tonight: ${name} fails`, () => {
    const t = clone(tonight());
    breakIt(t);
    assert.ok(validateTonight(t).length > 0);
  });
}

test('date helpers', () => {
  assert.ok(isIsoDate('2024-02-29'));
  assert.ok(!isIsoDate('2025-02-29'));
  assert.ok(isIsoDateTime('2026-11-11T10:00:00.123+00:00'));
  assert.ok(!isIsoDateTime('2026-11-11'));
});

test('CLI: exit codes, JSON paths, kinds and missing files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rv-validate-'));
  const good = join(dir, 'seasons.json');
  const bad = join(dir, 'tonight.json');
  const tmp = join(dir, 'out.json.tmp');
  writeFileSync(good, JSON.stringify(seasons()));
  const t = tonight();
  t.r[0][2] = 0;
  writeFileSync(bad, JSON.stringify(t));
  writeFileSync(tmp, JSON.stringify(seasons()));
  const out = [];
  const err = [];
  const io = { log: (m) => out.push(m), err: (m) => err.push(m) };
  assert.equal(main([good], io), 0);
  assert.equal(main([bad], io), 1);
  assert.ok(err.some((e) => e.includes('$.r[0][2]')), err.join('\n'));
  assert.equal(main([tmp], io), 1); // kind unknown from the name
  assert.equal(main(['--kind', 'seasons', tmp], io), 0);
  assert.equal(main([join(dir, 'nope.json')], io), 1); // an explicit file that doesn't exist fails
});

test('CLI with no arguments skips missing default files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rv-validate-'));
  const out = [];
  assert.equal(main([], { root: dir, log: (m) => out.push(m), err: () => {} }), 0);
  assert.ok(out.some((m) => m.includes('not found, skipped')));
});

test('runs as a script', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rv-validate-'));
  const f = join(dir, 'seasons.json');
  writeFileSync(f, '{ not json');
  const script = fileURLToPath(new URL('./validate-data.mjs', import.meta.url));
  const r = spawnSync(process.execPath, [script, f], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /not valid JSON/);
});
