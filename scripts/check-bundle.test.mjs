// Spec 07 Property 9: the bundle checker finds URL reads in any chunk the main page loads, and only there.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, normalize } from 'node:path';
import { chunkImports, htmlAssets, scanPage } from './check-bundle.mjs';

const DIST = normalize('/d');
const files = (map) => (p) => {
  const k = normalize(p);
  if (!(k in map)) throw new Error(`missing ${k}`);
  return map[k];
};

test('htmlAssets and chunkImports find what a page loads', () => {
  assert.deepEqual(htmlAssets('<script type="module" src="/assets/main-1.js"></script><link rel="modulepreload" href="/assets/c-2.js">'),
    ['/assets/main-1.js', '/assets/c-2.js']);
  assert.deepEqual(chunkImports('import{a as b}from"./c-2.js";import "./d-3.js";export{x}from"./e.js"'), ['./c-2.js', './d-3.js', './e.js']);
});

test('a URL read in a chunk the main page loads fails; one only the dossier loads does not', () => {
  const base = {
    [join(DIST, 'index.html')]: '<script src="/assets/main.js"></script>',
    [join(DIST, 'assets/main.js')]: 'import{a}from"./shared.js";',
    [join(DIST, 'assets/dossier.js')]: 'const h=location.hash;',
  };
  const clean = scanPage(DIST, 'index.html', files({ ...base, [join(DIST, 'assets/shared.js')]: 'export const a=1;' }));
  assert.deepEqual(clean.offenders, []);
  assert.equal(clean.chunks.length, 2);
  for (const bad of ['new URLSearchParams(x)', 'location.search', 'location.hash', 'addEventListener("hashchange",f)']) {
    const r = scanPage(DIST, 'index.html', files({ ...base, [join(DIST, 'assets/shared.js')]: bad }));
    assert.deepEqual(r.offenders, [join(DIST, 'assets/shared.js')]);
  }
});
