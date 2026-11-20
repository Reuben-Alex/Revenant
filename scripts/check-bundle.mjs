// Spec 07 Property 9 (and spec 04 Requirement 1.1): the production main page reads no URL, so nothing can skip
// daylight, nightfall or the title card. Walks every chunk index.html loads (script, modulepreload, and their static
// imports) and fails if one reads the query string or the hash. The dossier and phone pages may read their hash; their
// own chunks are not checked here.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

export const URL_READ = /location\.(search|hash)|URLSearchParams|['"]hashchange['"]/;

/** Asset paths an HTML page loads directly. */
export function htmlAssets(html) {
  const out = [];
  for (const m of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+\.js)"/g)) out.push(m[1]);
  return out;
}

/** Relative static imports of a chunk ("./x.js"). */
export function chunkImports(js) {
  const out = [];
  for (const m of js.matchAll(/(?:import|export)\s*(?:[^'"]*?from\s*)?["'](\.\.?\/[^"']+\.js)["']/g)) out.push(m[1]);
  return out;
}

/** Every chunk reachable from a page, and those that read the URL. */
export function scanPage(dist, htmlFile, read = (p) => readFileSync(p, 'utf8')) {
  const seen = new Set();
  const offenders = [];
  const queue = htmlAssets(read(join(dist, htmlFile))).map((a) => normalize(join(dist, a.replace(/^\//, ''))));
  while (queue.length) {
    const p = queue.shift();
    if (seen.has(p)) continue;
    seen.add(p);
    const js = read(p);
    if (URL_READ.test(js)) offenders.push(p);
    for (const rel of chunkImports(js)) queue.push(normalize(join(dirname(p), rel)));
  }
  return { chunks: [...seen], offenders };
}

function main() {
  const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
  if (!existsSync(join(dist, 'index.html'))) {
    console.error('check-bundle: dist/index.html is missing; run npm run build first');
    return 1;
  }
  const { chunks, offenders } = scanPage(dist, 'index.html');
  if (offenders.length) {
    console.error(`check-bundle: the main page reads the URL in ${offenders.join(', ')}`);
    return 1;
  }
  console.log(`check-bundle: main page reads no URL (${chunks.length} chunks)`);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1])) process.exit(main());
