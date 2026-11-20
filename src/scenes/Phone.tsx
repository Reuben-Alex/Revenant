// The field-crew phone (spec 07 Requirement 6). Layout and styles: reference/design/Phone.dc.html, at 390 px (320–480).
// Values come from `phoneView`. The page reads only its own hash (#tonight, #s2024/G-03); the viewer's position is
// asked for only on a press, used on the device, and never sent or stored.
import { useCallback, useEffect, useState } from 'react';
import * as copy from '../copy/phone';
import { handPath, tombPath, crossPath } from '../data/geometry';
import { DataError, loadSeasons, loadTonight } from '../data/load';
import { mapsLink, parsePhoneHash, phoneView, shareText, type PhoneScene, type Pos } from '../data/phone';
import type { SeasonsFile, TonightFile } from '../data/types';
import { SEASON_KEYS } from '../data/types';

const ACC = 'var(--ember)';
const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono)' };

function readHash() {
  return parsePhoneHash(typeof window === 'undefined' ? '' : window.location.hash);
}

// Map labels are placed in order, the card's grave first; a label that would overlap one already placed is left out
// (the stone stays, and its name is in the Graves list and the map's accessible name). k = grid px per screen px.
// A label that would leave the top of the crop goes below its stone, and one that would leave the right edge goes to
// its left. Returns id → text position and anchor.
type Label = { x: number; y: number; end: boolean };
function placeLabels(items: { id: string; x: number; y: number }[], first: string | null, k: number, crop: { x: number; y: number; w: number }): Map<string, Label> {
  const order = [...items].sort((a, b) => Number(b.id === first) - Number(a.id === first));
  const boxes: [number, number, number, number][] = [];
  const out = new Map<string, Label>();
  for (const i of order) {
    const y = i.y - 27 * k < crop.y ? i.y + 30 * k : i.y - 14 * k;
    const wide = (i.id.length * 8 + 4) * k;
    const end = i.x + 12 * k + wide > crop.x + crop.w;
    const x = end ? i.x - 14 * k : i.x + 14 * k;
    const x0 = end ? x - wide : x - 2 * k, x1 = x0 + wide, y0 = y - 14 * k, y1 = y + 4 * k;
    if (boxes.some(([a, b, c, d]) => x0 < c && a < x1 && y0 < d && b < y1)) continue;
    boxes.push([x0, y0, x1, y1]);
    out.set(i.id, { x, y, end });
  }
  return out;
}

type Loc = { state: 'off' } | { state: 'busy' } | { state: 'on'; pos: Pos } | { state: 'denied' };

export function Phone() {
  const [data, setData] = useState<SeasonsFile | null>(null);
  const [tonight, setTonight] = useState<TonightFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scene, setScene] = useState<PhoneScene>(() => readHash()?.scene ?? 'tonight');
  const [focus, setFocus] = useState<string | null>(() => readHash()?.id ?? null);
  const [tab, setTab] = useState<'map' | 'graves'>('map');
  const [loc, setLoc] = useState<Loc>({ state: 'off' });
  const [seen, setSeen] = useState<string | null>(null);
  const [said, setSaid] = useState('');

  useEffect(() => {
    let live = true;
    Promise.all([loadSeasons(), loadTonight()])
      .then(([d, t]) => { if (!live) return; setData(d); setTonight(t); })
      .catch((e: unknown) => live && setError(e instanceof DataError ? e.file : 'seasons.json'));
    const onHash = () => { const h = readHash(); if (h) { setScene(h.scene); setFocus(h.id); } };
    window.addEventListener('hashchange', onHash);
    return () => { live = false; window.removeEventListener('hashchange', onHash); };
  }, []);

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) { setLoc({ state: 'denied' }); return; }
    setLoc({ state: 'busy' });
    navigator.geolocation.getCurrentPosition(
      (p) => setLoc({ state: 'on', pos: { lat: p.coords.latitude, lon: p.coords.longitude } }),
      () => setLoc({ state: 'denied' }),
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 15000 },
    );
  }, []);

  const pos = loc.state === 'on' ? loc.pos : null;
  const v = data ? phoneView(data, tonight, scene, pos, focus) : null;
  const card = v?.card ?? null;

  const share = useCallback(async () => {
    if (!v || !card) return;
    if (!seen) { setSaid(copy.report.pick); return; }
    const text = shareText(v, card, seen, Date.now());
    try {
      if (navigator.share) { await navigator.share({ text }); setSaid(copy.report.shared); return; }
    } catch { /* cancelled or unsupported: fall through to copying */ }
    try { await navigator.clipboard.writeText(text); setSaid(copy.report.copied); } catch { setSaid(text); }
  }, [v, card, seen]);

  if (error) return <main role="alert" style={{ padding: 24, color: '#ECE6D6', background: '#070B0A', minHeight: '100vh' }}>{error}</main>;
  if (!v) return <main aria-busy="true" style={{ background: '#070B0A', minHeight: '100vh' }} />;

  const pick = (s: PhoneScene) => { setScene(s); setFocus(null); setSaid(''); };
  const c = v.crop;
  const shown = v.items.concat(card && !v.items.includes(card) ? [card] : []);
  const labels = placeLabels(shown, card?.id ?? null, c.w / 350, c);
  const scenes: PhoneScene[] = [...(tonight ? ['tonight' as const] : []), ...[...SEASON_KEYS].reverse()];

  return (
    <div style={{ width: '100%', maxWidth: 480, minWidth: 320, minHeight: '100dvh', margin: '0 auto', boxSizing: 'border-box', background: '#070B0A', color: '#ECE6D6', fontFamily: 'var(--font-ui)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 20px 10px' }}>
        <span style={{ fontFamily: 'var(--font-fell-sc)', fontSize: 22, letterSpacing: 3 }}>{copy.header.brand}</span>
        <span style={{ border: '1px solid #3E6F67', color: '#7FE0CF', padding: '3px 7px', borderRadius: 4, ...MONO, fontSize: 10.5 }}>{v.badge}</span>
      </header>

      <div role="group" aria-label={copy.seasons.group} style={{ display: 'flex', gap: 6, padding: '0 20px 8px', overflowX: 'auto' }}>
        {scenes.map((s) => {
          const on = v.scene === s;
          return (
            <button key={s} type="button" className="rv-btn" aria-pressed={on} onClick={() => pick(s)}
              aria-label={s === 'tonight' ? undefined : copy.seasons.spring(data!.seasons[s].year)} style={{
              flex: '1 0 auto', minHeight: 48, padding: '0 12px', borderRadius: '18px 18px 3px 3px', cursor: 'pointer',
              border: `1px solid ${on ? (s === 'tonight' ? '#7FE0CF' : ACC) : '#2A3532'}`, background: on ? '#232B28' : '#161C1A',
              color: on ? '#F4EEE2' : '#AEB6B2', fontFamily: 'var(--font-fell-sc)', fontSize: 15,
            }}>{s === 'tonight' ? copy.seasons.tonight : copy.seasons.short(data!.seasons[s].year)}</button>
          );
        })}
      </div>

      <section style={{ padding: '6px 20px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ ...MONO, fontSize: 11, letterSpacing: 2, color: ACC }}>{v.kicker}</span>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-fell)', fontWeight: 400, fontSize: 30, lineHeight: 1.1 }}>{v.title}</h1>
      </section>

      {tab === 'map' ? (
        <>
          <div style={{ position: 'relative', margin: '0 20px', aspectRatio: '350 / 250', borderRadius: 14, overflow: 'hidden', border: '1px solid #22302C', background: '#090E0D' }}>
            <div role="img" aria-label={copy.map.aria(v.items.map((i) => i.id), !!v.you)} style={{
              position: 'absolute', width: `${(1060 / c.w) * 100}%`, aspectRatio: '1060 / 716',
              left: `${(-c.x / c.w) * 100}%`, top: `${(-c.y / c.h) * 100}%`,
            }}>
              <img src={v.frame} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', filter: 'brightness(0.62) saturate(0.75) contrast(1.15)' }} />
              <div className={`rv-scars ${v.mask}`} aria-hidden="true" style={{ background: '#B4461A', opacity: 0.42, mixBlendMode: 'screen' }} />
              <svg viewBox="0 0 1060 716" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
                {shown.map((i) => {
                  const k = c.w / 350;
                  const sel = card?.id === i.id;
                  const lab = labels.get(i.id);
                  return (
                    <g key={i.id}>
                      {i.view.risen ? (
                        <>
                          <circle className="rv-pulse" cx={i.x} cy={i.y} r={24 * k} style={{ fill: 'none', stroke: ACC, strokeWidth: 1.5 * k }} />
                          <path d={handPath(i.x, i.y + 4 * k, 0.8 * k)} style={{ fill: 'none', stroke: ACC, strokeWidth: 2 * k, strokeLinecap: 'round' }} />
                        </>
                      ) : (
                        <>
                          <circle cx={i.x} cy={i.y} r={22 * k} style={{ fill: i.view.warm ? '#E8A07A' : '#7FE0CF', fillOpacity: 0.15, stroke: i.view.warm ? '#E8A07A' : '#7FE0CF', strokeOpacity: 0.5, strokeWidth: k }} />
                          <g transform={`translate(${i.x} ${i.y}) scale(${0.8 * k}) translate(${-i.x} ${-i.y})`}>
                            <path d={tombPath(i.x, i.y)} style={{ fill: '#10201D', stroke: i.color, strokeWidth: 1.3 }} />
                            <path d={crossPath(i.x, i.y)} style={{ fill: 'none', stroke: i.color, strokeWidth: 1.1 }} />
                          </g>
                        </>
                      )}
                      {lab && <text x={lab.x} y={lab.y} textAnchor={lab.end ? 'end' : 'start'} style={{ fontFamily: 'var(--font-fell-sc)', fontSize: 13 * k, fill: sel ? '#ECE6D6' : '#C7CFCB', paintOrder: 'stroke', stroke: '#070B0A', strokeWidth: 3 * k }}>{i.id}</text>}
                    </g>
                  );
                })}
                {v.you && (
                  <>
                    <circle cx={v.you.x} cy={v.you.y} r={16 * (c.w / 350)} style={{ fill: '#ECE6D6', fillOpacity: 0.12 }} />
                    <circle cx={v.you.x} cy={v.you.y} r={6 * (c.w / 350)} style={{ fill: '#ECE6D6', stroke: '#070B0A', strokeWidth: 2 * (c.w / 350) }} />
                    <text x={v.you.x + 14 * (c.w / 350)} y={v.you.y + 20 * (c.w / 350)} style={{ fontFamily: 'var(--font-mono)', fontSize: 10 * (c.w / 350), fill: '#A3ADA8' }}>{copy.map.you}</text>
                  </>
                )}
              </svg>
            </div>
          </div>

          <div style={{ margin: '10px 20px 0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 10px' }}>
            <button type="button" className="rv-btn" onClick={locate} aria-busy={loc.state === 'busy'} style={{ minHeight: 48, padding: '0 16px', borderRadius: 8, border: '1px solid #3E6F67', background: 'transparent', color: '#7FE0CF', font: '500 14px var(--font-ui)', cursor: 'pointer' }}>
              {loc.state === 'busy' ? copy.locate.busy : loc.state === 'on' ? copy.locate.again : copy.locate.button}
            </button>
            <span style={{ fontSize: 12, color: '#A3ADA8', flex: '1 1 160px', lineHeight: 1.4 }} aria-live="polite">
              {loc.state === 'denied' ? copy.locate.denied : v.outside ? copy.map.outside : copy.locate.note}
            </span>
          </div>

          {card ? (
            <article style={{ margin: '14px 20px 0', border: `1px solid ${card.color}`, borderRadius: '56px 56px 12px 12px', padding: '22px 20px 18px', background: '#140F0C', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ ...MONO, fontSize: 11, letterSpacing: 2, color: card.color }}>{card.status} · <span style={{ whiteSpace: 'nowrap' }}>{v.cardLabel}</span></span>
                <span style={{ ...MONO, fontSize: 11, color: '#A3ADA8' }}>{card.lat.toFixed(2)}°N {Math.abs(card.lon).toFixed(2)}°W</span>
              </div>
              <span style={{ fontFamily: 'var(--font-fell-sc)', fontSize: 26 }}>{copy.card.title(card.id)}</span>
              <span style={{ fontSize: 13.5, color: '#C7CFCB', lineHeight: 1.45 }}>{card.line1}. {card.line2}.</span>
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <a className="rv-btn rv-btn-light" href={mapsLink(card.lat, card.lon)} target="_blank" rel="noopener" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: 8, background: '#ECE6D6', color: '#070B0A', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>{copy.card.navigate}</a>
                <a className="rv-btn" href="#report" onClick={(e) => { e.preventDefault(); document.getElementById('rv-report')?.focus(); }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 10px', minHeight: 48, borderRadius: 8, border: '1px solid #4D5A55', color: '#ECE6D6', fontWeight: 500, fontSize: 14, textDecoration: 'none' }}>{copy.card.report}</a>
              </div>
            </article>
          ) : <p style={{ margin: '14px 20px 0', color: '#A3ADA8' }}>{copy.card.none}</p>}

          {card && (
            <section aria-label={copy.report.aria} style={{ margin: '14px 20px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span id="rv-report" tabIndex={-1} style={{ fontFamily: 'var(--font-fell)', fontStyle: 'italic', fontSize: 14, color: '#A3ADA8' }}>{copy.report.prompt}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {copy.report.options.map((o) => (
                  <button key={o} type="button" className="rv-btn" aria-pressed={seen === o} onClick={() => { setSeen(seen === o ? null : o); setSaid(''); }} style={{
                    flex: 1, minHeight: 48, borderRadius: 24, border: `1px solid ${seen === o ? ACC : '#3A4A45'}`, background: seen === o ? '#2A170D' : 'transparent',
                    color: '#ECE6D6', font: '500 13px var(--font-ui)', cursor: 'pointer',
                  }}>{o}</button>
                ))}
              </div>
              <button type="button" className="rv-btn" onClick={share} style={{ minHeight: 48, borderRadius: 8, border: '1px solid #4D5A55', background: '#0C1311', color: '#ECE6D6', font: '500 14px var(--font-ui)', cursor: 'pointer' }}>{copy.report.share}</button>
              <span role="status" style={{ fontSize: 12, color: '#A3ADA8', lineHeight: 1.4 }}>{said}</span>
            </section>
          )}
        </>
      ) : (
        <section aria-label={copy.list.title(v.seasonLabel)} style={{ margin: '0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {v.items.map((i) => (
            <button key={i.id} type="button" className="rv-card" onClick={() => { setFocus(i.id); setTab('map'); }} style={{
              display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left', minHeight: 48, padding: '12px 16px', borderRadius: '24px 24px 4px 4px', cursor: 'pointer',
              border: `1px solid ${i.color}`, background: '#111614', color: 'inherit', font: 'inherit',
            }}>
              <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <b style={{ fontFamily: 'var(--font-fell-sc)', fontWeight: 400, fontSize: 20 }}>{i.id}</b>
                <span style={{ ...MONO, fontSize: 11, color: i.color }}>{i.status}{i.km !== null ? ` · ${copy.list.km(Math.round(i.km).toLocaleString('en-US'))}` : ''}</span>
              </span>
              <span style={{ fontSize: 13, color: '#C7CFCB' }}>{i.line1}. {i.line2}.</span>
            </button>
          ))}
        </section>
      )}

      <p style={{ margin: '16px 20px 8px', ...MONO, fontSize: 10, color: '#8E9994' }}>{tonight && v.scene === 'tonight' ? tonight.credit : copy.footer}</p>

      <nav aria-label={copy.nav.aria} style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-around', borderTop: '1px solid #1A2422', padding: '8px 10px 22px', background: '#080D0C', position: 'sticky', bottom: 0 }}>
        {(['map', 'graves'] as const).map((k) => (
          <button key={k} type="button" className="rv-btn" aria-pressed={tab === k} onClick={() => setTab(k)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 64, minHeight: 48, justifyContent: 'center',
            color: tab === k ? '#ECE6D6' : '#A3ADA8', background: 'transparent', border: 'none', fontSize: 11, cursor: 'pointer',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <path d={k === 'map' ? 'M2 5 L7 3 L13 5 L18 3 V15 L13 17 L7 15 L2 17 Z M7 3 V15 M13 5 V17' : 'M4 18 V8 A6 6 0 0 1 16 8 V18 Z M10 6 V12 M7.5 8.5 H12.5'} style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinejoin: 'round' }} />
            </svg>
            {k === 'map' ? copy.nav.map : copy.nav.graves}
          </button>
        ))}
      </nav>
    </div>
  );
}
