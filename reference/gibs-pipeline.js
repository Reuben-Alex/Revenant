// REFERENCE ONLY — the research script used on Oct 29, 2026 to produce data/seasons.json.
// It ran in a browser tab on gibs.earthdata.nasa.gov (same-origin canvas reads). It works on RENDERED
// WMS images (each detection ≈ a 4 km dot), so proximity is approximate. The real pipeline must use
// FIRMS point data (see docs/method.md and the firms-points skill). Do not ship this.

const P = { W: 1060, H: 716 };
const BASE = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&CRS=EPSG:4326&BBOX=54,-126,60,-109&WIDTH=1060&HEIGHT=716&FORMAT=image/png&TRANSPARENT=TRUE';
const FIRE_LAYERS = ['VIIRS_SNPP_Thermal_Anomalies_375m_All', 'VIIRS_NOAA20_Thermal_Anomalies_375m_All'];

P.days = (a, b, step = 1) => { const o = []; for (let t = Date.parse(a); t <= Date.parse(b); t += step * 864e5) o.push(new Date(t).toISOString().slice(0, 10)); return o; };

// Alpha mask of a WMS layer for a date (1 = opaque pixel). Snow frames with < 2000 opaque px are treated as missing.
P.alpha = async (layer, date) => {
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(BASE + '&LAYERS=' + layer + '&TIME=' + date);
      if (!r.ok || !(r.headers.get('content-type') || '').includes('image')) return null;
      const bm = await createImageBitmap(await r.blob());
      const c = new OffscreenCanvas(1060, 716).getContext('2d'); c.drawImage(bm, 0, 0);
      const d = c.getImageData(0, 0, 1060, 716).data; const m = new Uint8Array(1060 * 716);
      for (let i = 0, j = 0; j < m.length; i += 4, j++) if (d[i + 3] > 40) m[j] = 1;
      if (layer.includes('Snow')) { let s = 0; for (let i = 0; i < m.length; i += 7) s += m[i]; if (s * 7 < 2000) return null; }
      return m;
    } catch (e) { /* retry */ }
  }
  return null;
};

P.pool = async (items, fn, n = 6) => { let i = 0; const out = new Array(items.length); await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } })); return out; };

P.dilate = (m, r) => { const W = 1060, H = 716, o = new Uint8Array(m.length); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!m[y * W + x]) continue; for (let dy = -r; dy <= r; dy++) { const yy = y + dy; if (yy < 0 || yy >= H) continue; for (let dx = -r; dx <= r; dx++) { const xx = x + dx; if (xx < 0 || xx >= W || dx * dx + dy * dy > r * r) continue; o[yy * W + xx] = 1; } } } return o; };

P.label = (m) => { /* 4-connected components → { lab, comps:[{id,n,cx,cy,x0,x1,y0,y1}] } */
  const W = 1060, lab = new Int32Array(m.length).fill(-1), comps = [], st = [];
  for (let s = 0; s < m.length; s++) {
    if (!m[s] || lab[s] >= 0) continue; const id = comps.length; let n = 0, sx = 0, sy = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1; st.push(s); lab[s] = id;
    while (st.length) { const p = st.pop(), x = p % W, y = (p / W) | 0; n++; sx += x; sy += y; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      for (const q of [p - 1, p + 1, p - W, p + W]) { if (q < 0 || q >= m.length || (q === p - 1 && x === 0) || (q === p + 1 && x === W - 1)) continue; if (m[q] && lab[q] < 0) { lab[q] = id; st.push(q); } } }
    comps.push({ id, n, cx: Math.round(sx / n), cy: Math.round(sy / n), x0, x1, y0, y1 });
  }
  return { lab, comps };
};

P.fireDays = async (a, b) => { const ds = P.days(a, b); const jobs = []; ds.forEach((d, k) => FIRE_LAYERS.forEach((l) => jobs.push([d, k, l])));
  const per = ds.map(() => []); (await P.pool(jobs, async ([d, k, l]) => { const m = await P.alpha(l, d); if (!m) return null; const idx = []; for (let i = 0; i < m.length; i++) if (m[i]) idx.push(i); return [k, idx]; })).forEach((r) => { if (r) for (const i of r[1]) per[r[0]].push(i); });
  return { ds, per }; };

// Season Y: scars = May–Oct of Y-1 (dilated 2 px); spring = Mar 21 – Jul 1 of Y.
// Static filter: pixels present in ≥3 of the 4 yearly masks, in components ≤120 px (gas flares), dilated 1 px.
// Graves = 24 largest scar components with < 40% static overlap.
// Melt = first day d with ≥3 valid obs in [d, d+6] all < 0.15 (snow fraction on scar, static px excluded, every 5th px sampled).
// Risen = first day in [melt, melt+50] with a non-static hit within 3 px of the scar; location = mean of that day's hits.
// New fire = spring hit > 15 px from any scar; clusters by 3-px dilation; first day; 24 largest.
// Chance = each scar shape shifted to 30 random offsets (±200 x, ±150 y) not overlapping scars; same window; any hit = 1.
