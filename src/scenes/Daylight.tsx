// "Boreal Fire Watch", the daylight viewer (spec 04 Requirement 2). Markup and inline values are the board's
// `dayOn` block (Main.dc.html L492–573). Every number comes from `daylightView()` (src/data/daylight.ts).
// Differences from the board: no sound toggle (immersion decision), 40 px buttons, and AA greys (#5F7181).
import type { CSSProperties } from 'react';
import * as copy from '../copy/daylight';
import { SCALE_60KM_PCT, type DaylightView } from '../data/daylight';
import { useReducedMotion } from '../motion/useReducedMotion';
import { smear, useSlip } from '../motion/useSlip';
import '../styles/daylight.css';

interface Props {
  view: DaylightView;
  src: string;
  maskClass: string;
  /** Phase `dusk`: drain the colour, sweep the sunset, sink the markers (Requirement 4.1). */
  dusk: boolean;
  onNightShift: () => void;
}

const INK = '#14212B';
const GREY = '#5F7181'; // board #5F7181; also replaces the board's #7A8B99 / #8696A3, which fail AA (Req 8.2)
const LINE = '#E2E7EC';
const CARD_SHADOW = '0 4px 16px rgba(16,32,48,0.14)';
const LABEL_STROKE: CSSProperties = { fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, fill: '#FFFFFF', paintOrder: 'stroke', stroke: 'rgba(20,33,43,0.55)', strokeWidth: 3 };
const DOT_LABEL: CSSProperties = { fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, fill: '#FFFFFF', paintOrder: 'stroke', stroke: 'rgba(15,40,60,0.75)', strokeWidth: 3 };
const SUNSET: CSSProperties = { position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(255,150,70,0) 0%, rgba(255,120,40,0.30) 35%, rgba(90,20,40,0.55) 70%, rgba(5,4,10,0.9) 100%)' };

const Moon = ({ size, fill }: { size: number; fill: string }) => (
  <svg width={size} height={size} viewBox="0 0 15 15" aria-hidden="true" style={{ flex: 'none' }}>
    <path d="M11.5 9.6 A5.2 5.2 0 0 1 5.4 3.5 A5.2 5.2 0 1 0 11.5 9.6 Z" style={{ fill }} />
  </svg>
);

const Check = () => (
  <span style={{ width: 15, height: 15, borderRadius: 4, background: 'var(--day-brand)', color: '#FFFFFF', fontSize: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>
);

export function Daylight({ view, src, maskClass, dusk, onNightShift }: Props) {
  const t = view.text;
  // The disguise slips now and then (never during dusk or under reduced motion). Visual only: no value changes.
  const reduced = useReducedMotion();
  const slip = useSlip(!dusk && !reduced);
  const stoneAt = slip?.kind === 'stone' && view.dots.length ? slip.n % view.dots.length : -1;
  const nightBtn: CSSProperties = { minHeight: 40, padding: '0 14px', borderRadius: 10, font: '600 13px Inter, sans-serif', cursor: 'pointer' };

  return (
    // `inert` during dusk: nightfall can't be pressed twice or tabbed away from while the colour drains.
    <main aria-label={copy.page.main} className={dusk ? 'rv-dusk' : ''} inert={dusk} style={{
      position: 'relative', minHeight: '100vh', boxSizing: 'border-box', background: 'var(--day-bg)', color: INK,
      fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px 20px', padding: '10px 20px', background: '#FFFFFF', borderBottom: `1px solid ${LINE}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
            <rect x="0" y="0" width="32" height="32" rx="9" style={{ fill: 'var(--day-brand)' }} />
            <path d="M16 6 C20.5 11.5 22.5 15.5 20.4 20 C19.2 22.6 12.8 22.6 11.6 20 C9.5 15.5 11.5 11.5 16 6 Z" style={{ fill: '#FFFFFF' }} />
            <path d="M16 13 C17.8 15.4 18.3 17.2 17.4 19 C17 19.8 15 19.8 14.6 19 C13.7 17.2 14.2 15.4 16 13 Z" style={{ fill: '#F2A33A' }} />
            <path d="M7 25 H25" style={{ stroke: '#7FC3E8', strokeWidth: 1.6, strokeLinecap: 'round' }} />
          </svg>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <h1 style={{ margin: 0, fontWeight: 650, fontSize: 16, lineHeight: 'normal', letterSpacing: -0.2 }}>{copy.brand.name}</h1>
            <span style={{ fontSize: 12, color: GREY }}>{copy.brand.sub}</span>
          </span>
        </div>
        {/* Inert, as on the board: text, not an input, so the keyboard never stops on a dead control (Req 2.5). */}
        <div style={{ flex: '1 1 260px', maxWidth: 420, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', minHeight: 38, borderRadius: 10, background: '#F1F4F7', border: `1px solid ${LINE}`, color: GREY, fontSize: 13.5 }}>
          <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">
            <circle cx="6.5" cy="6.5" r="4.8" style={{ fill: 'none', stroke: '#7A8B99', strokeWidth: 1.5 }} />
            <path d="M10.2 10.2 L13.5 13.5" style={{ stroke: '#7A8B99', strokeWidth: 1.5, strokeLinecap: 'round' }} />
          </svg>
          {copy.header.search}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, background: 'var(--day-ok-bg)', color: 'var(--day-ok)', fontSize: 12.5, fontWeight: 600 }}>
            <span style={{ width: 7, height: 7, borderRadius: 4, background: '#22A06B', display: 'inline-block' }} />{t.chip}
          </span>
          <button type="button" className="rv-day-btn" onClick={onNightShift} aria-label={copy.header.nightShiftAria}
            style={{ ...nightBtn, display: 'flex', alignItems: 'center', gap: 7, border: '1px solid #D5DDE4', background: '#FFFFFF', color: INK }}>
            <Moon size={15} fill={INK} />{copy.header.nightShift}
          </button>
          <span aria-hidden="true" style={{ width: 34, height: 34, borderRadius: 17, background: '#D8E6F1', color: 'var(--day-brand)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{copy.brand.avatar}</span>
        </div>
      </header>

      <div style={{ flex: '1 1 auto', display: 'flex', flexWrap: 'wrap', minHeight: 0, gap: 0 }}>
        <div className="rv-day-map" style={{ flex: '999 1 560px', minWidth: 0, position: 'relative', aspectRatio: '1060 / 716', overflow: 'hidden', background: '#CFD8DC', alignSelf: 'flex-start' }}>
          <img className="rv-img" src={src} alt={copy.map.alt} style={{ opacity: 1, filter: slip?.kind === 'dim' ? 'grayscale(1) brightness(0.32) contrast(1.2)' : 'saturate(1.08) contrast(1.04)' }} />
          <div className={`rv-scars ${maskClass}`} aria-hidden="true" style={{ background: '#F2913A', opacity: 0.42 }} />
          <svg viewBox="0 0 1060 716" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <path d="M374 0 V716" style={{ fill: 'none', stroke: '#FFFFFF', strokeOpacity: 0.8, strokeWidth: 1.4, strokeDasharray: '6 5' }} />
            <text x="364" y="700" textAnchor="end" style={LABEL_STROKE}>{copy.map.bc}</text>
            <text x="386" y="700" style={LABEL_STROKE}>{copy.map.ab}</text>
          </svg>
          <svg viewBox="0 0 1060 716" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
            {view.dots.map((p, i) => (
              <g key={p.id}>
                {i === stoneAt ? (
                  // For a moment the marker is what it is at night: a stone on the same burn area.
                  <g data-slip="stone">
                    <path d={`M${p.x - 7} ${p.y + 8} V${p.y - 1} A7 7 0 0 1 ${p.x + 7} ${p.y - 1} V${p.y + 8} Z`} style={{ fill: '#10201D', stroke: '#ECE6D6', strokeWidth: 1.6 }} />
                    <path d={`M${p.x} ${p.y - 4} V${p.y + 5} M${p.x - 3} ${p.y - 1} H${p.x + 3}`} style={{ fill: 'none', stroke: '#ECE6D6', strokeWidth: 1.4, strokeLinecap: 'round' }} />
                  </g>
                ) : (
                  <>
                    <circle className="rv-dot" cx={p.x} cy={p.y} r={13} style={{ fill: 'var(--day-brand)', fillOpacity: 0.18 }} />
                    <circle className="rv-dot" cx={p.x} cy={p.y} r={6.5} style={{ fill: 'var(--day-brand)', stroke: '#FFFFFF', strokeWidth: 2.2 }} />
                  </>
                )}
                {p.label && <text className="rv-dot" x={p.lx} y={p.ly} style={DOT_LABEL}>{p.id}</text>}
              </g>
            ))}
          </svg>
          <div style={{ position: 'absolute', left: 14, top: 14, display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', background: 'rgba(255,255,255,0.96)', borderRadius: 12, fontSize: 12.5, color: '#24333F', boxShadow: CARD_SHADOW, minWidth: 190 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.6, color: GREY, textTransform: 'uppercase' }}>{copy.map.layersTitle}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}><Check />{copy.map.layerAreas}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}><Check />{t.layerScars}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}><Check />{copy.map.layerHotspots}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 9, color: GREY }}>
              <span style={{ width: 15, height: 15, borderRadius: 4, border: '1.5px solid #B9C5CF', boxSizing: 'border-box', display: 'inline-block' }} />{copy.map.layerSnow}
            </span>
          </div>
          <div aria-hidden="true" style={{ position: 'absolute', right: 14, top: 14, display: 'flex', flexDirection: 'column', borderRadius: 10, overflow: 'hidden', background: '#FFFFFF', boxShadow: CARD_SHADOW }}>
            <span style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#24333F', borderBottom: `1px solid ${LINE}` }}>{copy.map.zoomIn}</span>
            <span style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#24333F' }}>{copy.map.zoomOut}</span>
          </div>
          <div style={{ position: 'absolute', left: 14, bottom: 14, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.96)', borderRadius: 10, fontSize: 12, color: '#24333F', boxShadow: CARD_SHADOW }}>
            <span aria-hidden="true" style={{ display: 'inline-block', width: `${SCALE_60KM_PCT.toFixed(3)}cqw`, boxSizing: 'border-box', height: 6, border: '1.5px solid #24333F', borderTop: 'none' }} />{copy.map.scale}
          </div>
          <span style={{ position: 'absolute', right: 12, bottom: 12, fontSize: 11, color: '#24333F', background: 'rgba(255,255,255,0.88)', padding: '3px 8px', borderRadius: 6 }}>{t.imageCredit}</span>
        </div>

        <aside aria-label={copy.page.aside} style={{ flex: '1 1 340px', background: 'var(--day-bg)', padding: '16px 18px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          <section style={{ background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 1px 2px rgba(16,32,48,0.05)' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.5, color: GREY, textTransform: 'uppercase' }}>{copy.status.title}</span>
              <span style={{ fontSize: 12, color: GREY }}>{t.date}</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {view.clear ? (
                <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
                  <circle cx="15" cy="15" r="15" style={{ fill: 'var(--day-ok-bg)' }} />
                  <path d="M9 15.5 L13.2 19.5 L21 11" style={{ fill: 'none', stroke: 'var(--day-ok)', strokeWidth: 2.6, strokeLinecap: 'round', strokeLinejoin: 'round' }} />
                </svg>
              ) : (
                <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
                  <circle cx="15" cy="15" r="15" style={{ fill: '#FDF0E6' }} />
                  <path d="M15 8.5 V16.5 M15 20.5 V21" style={{ fill: 'none', stroke: '#B4541A', strokeWidth: 2.6, strokeLinecap: 'round' }} />
                </svg>
              )}
              {slip?.kind === 'text' ? (
                <span style={{ fontSize: 24, fontWeight: 650, letterSpacing: -0.3 }}>
                  <span aria-hidden="true" data-slip="text">{smear(t.headline)}</span><span className="rv-sr">{t.headline}</span>
                </span>
              ) : <span style={{ fontSize: 24, fontWeight: 650, letterSpacing: -0.3 }}>{t.headline}</span>}
            </span>
            <span style={{ fontSize: 13.5, color: '#3D4F5D', lineHeight: 1.55 }}>{t.status}</span>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
            <span style={statCard}>
              <span style={statLabel}>{copy.stats.reignited}</span><b style={statValue}>{t.reignited}</b>
              <svg viewBox="0 0 80 18" aria-hidden="true" style={{ width: '100%', height: 18 }}><path d="M0 15 H80" style={{ stroke: '#22A06B', strokeWidth: 2 }} /></svg>
            </span>
            <span style={statCard}>
              <span style={statLabel}>{copy.stats.areas}</span><b style={statValue}>{t.areas}</b>
              <span style={{ fontSize: 11.5, color: view.clear ? 'var(--day-ok)' : '#B4541A' }}>{t.areasSub}</span>
            </span>
            <span style={statCard}>
              <span style={statLabel}>{copy.stats.snow}</span><b style={statValue}>{t.snow}</b>
              <span style={{ fontSize: 11.5, color: GREY }}><NoBreakTail text={t.snowSub} /></span>
            </span>
          </div>

          <section style={{ background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{copy.rows.title}</span>
              <span style={{ fontSize: 12, color: 'var(--day-brand)', fontWeight: 600 }}>{t.viewAll}</span>
            </span>
            {view.rows.map((r) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid #EEF1F4' }}>
                <span style={{ width: 54, fontWeight: 600, fontSize: 13 }}>{r.id}</span>
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 12, color: GREY }}>{r.line}</span>
                  <span aria-hidden="true" style={{ height: 5, borderRadius: 3, background: '#EAF0F5', display: 'block', overflow: 'hidden' }}>
                    <span style={{ display: 'block', height: 5, borderRadius: 3, background: '#7FB6DA', width: `${r.bar}%` }} />
                  </span>
                </span>
                <span style={{ fontSize: 11.5, padding: '3px 9px', borderRadius: 999, fontWeight: 600, ...(r.reignited ? { background: '#FDF0E6', color: '#9A4614' } : { background: 'var(--day-ok-bg)', color: 'var(--day-ok)' }) }}>{r.pill}</span>
              </div>
            ))}
          </section>

          <section style={{ background: 'linear-gradient(135deg, #14212B, #22384A)', color: '#EAF2F8', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Moon size={26} fill="#F2C14E" />
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <b style={{ fontSize: 13.5, fontWeight: 600 }}>{copy.nightCard.title}</b>
              <span style={{ fontSize: 12, color: '#A9BCCB' }}>{copy.nightCard.sub}</span>
            </span>
            <button type="button" className="rv-day-btn" onClick={onNightShift} style={{ ...nightBtn, border: 'none', background: '#FFFFFF', color: INK, flex: 'none' }}>{copy.nightCard.button}</button>
          </section>

          <span style={{ fontSize: 11.5, color: GREY }}>{copy.credit}</span>
        </aside>
      </div>
      <div aria-hidden="true" className="rv-sunset" style={dusk ? SUNSET : { display: 'none' }} />
    </main>
  );
}

/** "avg, Mar 21–27": keeps the date range on one line so it never breaks after the dash. */
function NoBreakTail({ text }: { text: string }) {
  const i = text.indexOf(', ');
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i + 1)} <span style={{ whiteSpace: 'nowrap' }}>{text.slice(i + 2)}</span></>;
}

const statCard: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, padding: 12, background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: 12 };
// Two lines reserved so the three values line up when a label wraps ("Re-ignited burn areas", "Snow on scars").
const statLabel: CSSProperties = { fontSize: 11.5, color: GREY, lineHeight: 1.25, minHeight: '2.5em' };
const statValue: CSSProperties = { fontSize: 22, fontWeight: 650 };
