// The grave dossier page (spec 07 Requirement 5). Layout and styles: reference/design/Dossier.dc.html. Every value
// comes from `dossierView` (published fields). The page reads only its own hash, `#s2024/G-03`.
import { useEffect, useState } from 'react';
import * as copy from '../copy/dossier';
import { DEFAULT, dossierView, kml, parseHash } from '../data/dossier';
import { DataError, loadSeasons } from '../data/load';
import type { SeasonsFile } from '../data/types';
import { download } from '../components/EpitaphCard';

const ACC = 'var(--ember)';
const CARD: React.CSSProperties = { border: '1px solid #22302C', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 14, background: '#0A100E' };
const H2: React.CSSProperties = { margin: 0, fontFamily: 'var(--font-fell-sc)', fontWeight: 400, fontSize: 24 };
const BTN: React.CSSProperties = { display: 'flex', alignItems: 'center', minHeight: 48, padding: '0 20px', borderRadius: 8, fontSize: 14, textDecoration: 'none', cursor: 'pointer', boxSizing: 'border-box' };

function readHash() {
  const h = typeof window === 'undefined' ? '' : window.location.hash;
  const p = parseHash(h);
  return { ...(p ?? DEFAULT), unknown: h && h !== '#' && !p ? h : null };
}

function Mark({ ok }: { ok: 'yes' | 'no' | 'off' }) {
  const c = ok === 'yes' ? ACC : '#5D6A65';
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" style={{ flex: 'none', marginTop: 1 }}>
      <circle cx="10" cy="10" r="9" style={{ fill: 'none', stroke: c, strokeWidth: 1.4 }} />
      {ok === 'yes' ? <path d="M6 10.5 L9 13 L14 7" style={{ fill: 'none', stroke: c, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }} />
        : ok === 'no' ? <path d="M7 7 L13 13 M13 7 L7 13" style={{ fill: 'none', stroke: c, strokeWidth: 1.8, strokeLinecap: 'round' }} />
          : <path d="M6 10 H14" style={{ fill: 'none', stroke: c, strokeWidth: 1.8, strokeLinecap: 'round' }} />}
    </svg>
  );
}

export function Dossier() {
  const [data, setData] = useState<SeasonsFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState(readHash);
  useEffect(() => {
    let live = true;
    loadSeasons().then((d) => live && setData(d)).catch((e: unknown) => live && setError(e instanceof DataError ? e.file : 'seasons.json'));
    const onHash = () => setSel(readHash());
    window.addEventListener('hashchange', onHash);
    return () => { live = false; window.removeEventListener('hashchange', onHash); };
  }, []);

  const v = data ? dossierView(data, sel.season, sel.id) ?? dossierView(data, DEFAULT.season, DEFAULT.id) : null;
  useEffect(() => { if (v) document.title = copy.page.title(v.id, v.year); }, [v]);
  const missing = data && !dossierView(data, sel.season, sel.id) ? `#${sel.season}/${sel.id}` : sel.unknown;

  if (error) return <main role="alert" style={{ minHeight: '100vh', background: '#070B0A', color: '#ECE6D6', padding: 40, fontFamily: 'var(--font-fell)' }}>{error}</main>;
  if (!v) return <main aria-busy="true" style={{ minHeight: '100vh', background: '#070B0A', color: '#A3ADA8', padding: 40, fontFamily: 'var(--font-fell)' }}>{copy.page.loading}</main>;

  return (
    <div style={{ width: '100%', minHeight: 900, boxSizing: 'border-box', background: '#070B0A', color: '#ECE6D6', fontFamily: 'var(--font-ui)' }}>
      <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 28px', borderBottom: '1px solid #1A2422', background: '#080D0C' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, color: '#A3ADA8', textDecoration: 'none', fontSize: 13 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 L5 8 L10 13" style={{ fill: 'none', stroke: '#A3ADA8', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }} /></svg>
            {copy.page.back}</a>
          <span style={{ fontFamily: 'var(--font-fell-sc)', fontSize: 22, letterSpacing: 3 }}>{copy.page.brand}</span>
        </div>
        <span style={{ border: '1px solid #3E6F67', color: '#7FE0CF', padding: '4px 8px', borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{copy.page.badge(v.year)}</span>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 28px 48px', display: 'flex', flexDirection: 'column', gap: 28, boxSizing: 'border-box' }}>
        {missing && <p role="status" style={{ margin: 0, fontFamily: 'var(--font-fell)', fontStyle: 'italic', color: '#E8A07A' }}>{copy.page.unknown(missing)}</p>}

        <section style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, border: `1px solid ${v.state === 'risen' ? ACC : '#3A4A45'}`, borderRadius: '160px 160px 16px 16px', padding: '56px 48px 32px', background: '#110D0B' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: 4, color: v.state === 'risen' ? ACC : '#A3ADA8' }}>{v.kicker}</span>
            <h1 style={{ margin: 0, fontFamily: 'var(--font-fell-sc)', fontWeight: 400, fontSize: 56, lineHeight: 1 }}>{v.title}</h1>
            <p style={{ margin: 0, fontFamily: 'var(--font-fell)', fontStyle: 'italic', fontSize: 20, color: '#C7CFCB' }}>{v.lede}</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <a className="rv-btn rv-btn-light" href={`phone.html#${v.season}/${v.id}`} style={{ ...BTN, background: '#ECE6D6', color: '#070B0A', fontWeight: 600 }}>{copy.hero.send}</a>
            <button type="button" className="rv-btn" title={copy.hero.kmlNote} aria-describedby="rv-kml-note"
              onClick={() => download(new Blob([kml(v)], { type: 'application/vnd.google-earth.kml+xml' }), copy.kml.file(v.season, v.id))}
              style={{ ...BTN, border: '1px solid #4D5A55', color: '#ECE6D6', background: 'transparent', fontWeight: 500, font: '500 14px var(--font-ui)' }}>{copy.hero.kml}</button>
            <span id="rv-kml-note" className="rv-sr">{copy.hero.kmlNote}</span>
          </div>
        </section>

        <section aria-labelledby="sat-h" style={CARD}>
          <h2 id="sat-h" style={H2}>{copy.sat.title}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {v.crops.map((c) => (
              <figure key={c.src} style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ position: 'relative', width: '100%', aspectRatio: '1', overflow: 'hidden', borderRadius: 8, border: '1px solid #22302C', background: '#050807' }}>
                  <img src={c.src} alt={c.alt} style={{ position: 'absolute', left: `${c.left.toFixed(1)}%`, top: `${c.top.toFixed(1)}%`, width: `${c.width.toFixed(1)}%`, maxWidth: 'none', height: 'auto', display: 'block' }} />
                  <svg viewBox="0 0 100 100" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                    <circle className={c.on ? 'rv-pulse' : undefined} cx={+c.rx.toFixed(1)} cy={+c.ry.toFixed(1)} r={7} style={{ fill: 'none', stroke: c.on ? ACC : '#ECE6D6', strokeWidth: 1.5 }} />
                    {c.on && <circle cx={+c.rx.toFixed(1)} cy={+c.ry.toFixed(1)} r={2.2} style={{ fill: ACC }} />}
                  </svg>
                </div>
                <figcaption style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <b style={{ fontFamily: 'var(--font-fell-sc)', fontWeight: 400, fontSize: 18 }}>{c.title}</b>
                  <span style={{ fontSize: 12.5, color: '#A3ADA8', lineHeight: 1.45 }}>{c.caption}</span>
                </figcaption>
              </figure>
            ))}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: '#8E9994' }}>{v.credit}</span>
        </section>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          <section aria-labelledby="rule-h" style={{ ...CARD, flex: '1 1 340px' }}>
            <h2 id="rule-h" style={H2}>{v.ruleTitle}</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#A3ADA8', lineHeight: 1.5 }}>{copy.rule.intro}</p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {v.checks.map((c) => (
                <li key={c.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <Mark ok={c.ok} />
                  <span style={{ fontSize: 14, lineHeight: 1.45 }}>
                    <span className="rv-sr">{c.ok === 'yes' ? 'Passed: ' : c.ok === 'no' ? 'Not met: ' : 'Not checked: '}</span>
                    <b style={{ fontWeight: 600 }}>{c.title}</b> <span style={{ color: c.ok === 'off' ? '#A3ADA8' : '#C7CFCB' }}>{c.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="snow-h" style={{ ...CARD, flex: '1 1 380px', gap: 12 }}>
            <h2 id="snow-h" style={H2}>{copy.snow.title(v.year)}</h2>
            <svg viewBox="0 0 420 200" role="img" aria-label={v.chart.aria} style={{ width: '100%', height: 'auto', display: 'block' }}>
              {v.chart.band && <rect x={+v.chart.band.x.toFixed(1)} y={10} width={+v.chart.band.w.toFixed(1)} height={150} style={{ fill: '#7FE0CF', fillOpacity: 0.1 }} />}
              <path d="M0 160 H420" style={{ stroke: '#22302C', strokeWidth: 1 }} />
              <path d="M0 137.5 H420" style={{ stroke: '#4D5A55', strokeWidth: 1, strokeDasharray: '3 4' }} />
              <text x={418} y={133.5} textAnchor="end" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: '#8E9994' }}>15%</text>
              {v.chart.late.map((b) => <rect key={b.x} x={+b.x.toFixed(1)} y={10} width={+b.w.toFixed(1)} height={150} style={{ fill: '#E4EDEE', fillOpacity: 0.08 }} />)}
              {v.chart.late[0] && <text x={+(v.chart.late[0].x + v.chart.late[0].w + 6).toFixed(1)} y={52} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: '#C7CFCB' }}>{copy.snow.late}</text>}
              <path d={v.chart.curve} style={{ fill: 'none', stroke: '#E4EDEE', strokeWidth: 1.8, strokeLinejoin: 'round' }} />
              {v.chart.meltX !== null && (
                <>
                  <path d={`M${v.chart.meltX.toFixed(1)} 10 V160`} style={{ stroke: '#7FE0CF', strokeWidth: 1.4 }} />
                  <text x={+Math.min(v.chart.meltX + 6, 300).toFixed(1)} y={24} style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fill: '#7FE0CF' }}>{v.chart.meltLabel}</text>
                </>
              )}
              {v.chart.riseX !== null && (
                <>
                  <circle className="rv-pulse" cx={+v.chart.riseX.toFixed(1)} cy={150} r={10} style={{ fill: 'none', stroke: ACC, strokeWidth: 1.5 }} />
                  <circle cx={+v.chart.riseX.toFixed(1)} cy={150} r={4} style={{ fill: ACC }} />
                  {/* Above the 15 % line (y 137.5), which the board's y = 138 sat on. */}
                  <text x={+Math.min(v.chart.riseX + 14, 330).toFixed(1)} y={126} style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fill: ACC }}>{v.chart.riseLabel}</text>
                </>
              )}
              <text x={0} y={182} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: '#8E9994' }}>Mar 21</text>
              <text x={210} y={182} textAnchor="middle" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: '#8E9994' }}>May 10</text>
              <text x={420} y={182} textAnchor="end" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: '#8E9994' }}>Jul 1</text>
            </svg>
            <p style={{ margin: 0, fontSize: 13, color: '#A3ADA8', lineHeight: 1.5 }}>{v.chart.caption}</p>
          </section>
        </div>

        <section aria-labelledby="life-h" style={{ ...CARD, gap: 18 }}>
          <h2 id="life-h" style={H2}>{copy.life.title}</h2>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {v.life.map((l) => (
              <li key={l.state} style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: `2px solid ${l.color}`, paddingTop: 12 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: l.color === 'var(--ember)' ? ACC : '#A3ADA8' }}>{l.date}</span>
                <span style={{ fontFamily: 'var(--font-fell-sc)', fontSize: 19 }}>{l.state}</span>
                <span style={{ fontSize: 13, color: '#C7CFCB' }}>{l.text}</span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="det-h" style={CARD}>
          <h2 id="det-h" style={H2}>{copy.sightings.title}</h2>
          {v.sightings.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 420 }}>
                <thead><tr style={{ textAlign: 'left', color: '#A3ADA8', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1 }}>
                  {copy.sightings.head.map((h, i) => <th key={h} style={{ padding: i ? '8px 12px' : '8px 12px 8px 0', fontWeight: 500 }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {v.sightings.map((r) => (
                    <tr key={r.date} style={{ borderTop: '1px solid #1A2422' }}>
                      <td style={{ padding: '12px 12px 12px 0' }}>{r.date}</td><td style={{ padding: 12 }}>{r.where}</td><td style={{ padding: 12 }}>{r.days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p style={{ margin: 0, fontSize: 13.5, color: '#A3ADA8' }}>{copy.sightings.none}</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTop: '1px solid #1A2422', paddingTop: 14 }}>
            <span style={{ fontFamily: 'var(--font-fell)', fontStyle: 'italic', fontSize: 15, color: '#A3ADA8' }}>{copy.sightings.crew}</span>
            <a className="rv-btn" href={`phone.html#${v.season}/${v.id}`} style={{ display: 'flex', alignItems: 'center', minHeight: 44, padding: '0 16px', borderRadius: 8, border: '1px solid #4D5A55', color: '#ECE6D6', fontSize: 13, textDecoration: 'none' }}>{copy.hero.send}</a>
          </div>
        </section>

        <footer style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8E9994' }}>
          <span>{copy.footer.credit}</span>
          <a className="rv-btn" href={copy.footer.methodHref} target="_blank" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 40, margin: '-12px 0', color: '#7FE0CF' }}>{copy.footer.method}</a>
        </footer>
      </main>
    </div>
  );
}
