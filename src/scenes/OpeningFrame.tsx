// The video's opening frame (spec 07 Requirement 7): reference/design/Opening.dc.html at exactly 1920 × 1080.
// Geometry and styles follow the board (its renderVals() rows and flakes, accent and snow at their defaults).
// It shows no data; the only change from the board is the credit line (copy/opening.ts).
import type { CSSProperties } from 'react';
import * as copy from '../copy/opening';
import '../styles/opening.css';

const ACCENT = 'var(--ember)';
const W = 1920, H = 1080;
const SNOW = 70;

const ROWS = [
  { y: 640, w: 26, h: 36, n: 11, x0: 140, gap: 150, stroke: '#20292B', cap: 3 },
  { y: 760, w: 44, h: 60, n: 8, x0: 90, gap: 230, stroke: '#2C3537', cap: 4 },
  { y: 950, w: 80, h: 110, n: 5, x0: 40, gap: 420, stroke: '#384244', cap: 6 },
];

/** The three rows of stones; the front row leaves room for the hero stone (23 stones). */
function openingTombs(): CSSProperties[] {
  const out: CSSProperties[] = [];
  ROWS.forEach((r, ri) => {
    for (let i = 0; i < r.n; i++) {
      const x = r.x0 + i * r.gap + ((i * 37 + ri * 53) % 40) - 20;
      if (ri === 2 && x > 820 && x < 1160) continue;
      const tilt = ((i * 29 + ri * 17) % 9) - 4;
      out.push({
        position: 'absolute', left: x, top: r.y - r.h, width: r.w, height: r.h,
        borderRadius: `${r.w / 2}px ${r.w / 2}px 4px 4px`, background: '#0D1214',
        border: `1.5px solid ${r.stroke}`, borderTop: `${r.cap}px solid #C9D2D1`, boxSizing: 'border-box',
        transform: `rotate(${tilt}deg)`,
      });
    }
  });
  return out;
}

/** The falling snow. `--rest` is where each flake sits at t = 0, used as its still position under reduced motion. */
function openingFlakes(n = SNOW): CSSProperties[] {
  const out: CSSProperties[] = [];
  for (let i = 0; i < n; i++) {
    const size = 2 + (i % 3);
    const dur = 9 + (i % 7) * 1.7;
    const delay = -((i * 1.37) % dur);
    const rest = -40 + (H + 80) * (-delay / dur);
    out.push({
      position: 'absolute', left: (i * 271) % W, top: 0, width: size, height: size, borderRadius: size,
      background: '#DCE4E3', opacity: 0.25 + (i % 4) * 0.12,
      animationDuration: `${dur}s`, animationDelay: `${delay.toFixed(2)}s`,
      ['--rest' as string]: `${rest.toFixed(1)}px`,
    });
  }
  return out;
}

const TOMBS = openingTombs();
const FLAKES = openingFlakes();
const EMBERS = [
  { left: 990, top: 940, size: 5, color: ACCENT, delay: 0 },
  { left: 1030, top: 950, size: 4, color: '#FFB86B', delay: 1.2 },
  { left: 1010, top: 945, size: 6, color: ACCENT, delay: 2.4 },
];
const MONO = "var(--font-mono)";

export function OpeningFrame() {
  return (
    <main style={{ width: W, height: H, position: 'relative', overflow: 'hidden', background: '#05080A', color: '#ECE6D6', fontFamily: 'var(--font-fell)' }}>
      <div aria-hidden="true" style={{ position: 'absolute', left: 1420, top: 110, width: 120, height: 120, borderRadius: 60, background: '#D8DFDD', opacity: 0.85, boxShadow: '0 0 120px 40px rgba(170,190,195,0.18)' }} />
      <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: 600, bottom: 0, background: 'linear-gradient(180deg, #11181A 0%, #0B1012 100%)' }} />
      <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: 596, height: 8, background: '#1E2729', opacity: 0.8 }} />

      {TOMBS.map((s, i) => <div key={i} aria-hidden="true" data-stone="" style={s} />)}

      <div aria-hidden="true" className="rv-o-breathe" style={{ position: 'absolute', left: 880, top: 880, width: 260, height: 120, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,107,44,0.55), rgba(255,107,44,0))' }} />
      <div aria-hidden="true" data-stone="hero" style={{ position: 'absolute', left: 960, top: 830, width: 96, height: 130, borderRadius: '48px 48px 6px 6px', background: '#0F1416', border: '2px solid #3A4446', borderTop: '6px solid #DCE4E3', boxSizing: 'border-box', transform: 'rotate(-9deg)' }} />
      <svg aria-hidden="true" width="300" height="80" viewBox="0 0 300 80" style={{ position: 'absolute', left: 860, top: 950 }}>
        <path d="M20 40 L70 30 L100 46 L150 26 L190 44 L240 32 L280 42" style={{ fill: 'none', stroke: ACCENT, strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' }} />
        <path d="M100 46 L112 66 M190 44 L198 62" style={{ fill: 'none', stroke: ACCENT, strokeWidth: 2, strokeLinecap: 'round' }} />
      </svg>
      {EMBERS.map((e, i) => (
        <div key={i} aria-hidden="true" className="rv-o-ember" style={{ position: 'absolute', left: e.left, top: e.top, width: e.size, height: e.size, borderRadius: Math.ceil(e.size / 2), background: e.color, animationDelay: `${e.delay}s` }} />
      ))}

      {FLAKES.map((s, i) => <div key={i} aria-hidden="true" className="rv-o-flake" style={s} />)}

      <div style={{ position: 'absolute', left: 0, right: 0, top: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-fell-sc)', fontWeight: 400, fontSize: 200, letterSpacing: 28, lineHeight: 1, paddingLeft: 28, color: '#ECE6D6' }}>{copy.title}</h1>
        <p style={{ margin: 0, fontStyle: 'italic', fontSize: 44, color: '#C7CFCB' }}>{copy.subtitle}</p>
      </div>

      <span style={{ position: 'absolute', left: 72, bottom: 56, fontFamily: MONO, fontSize: 20, letterSpacing: 4, color: '#8E9994' }}>{copy.contest}</span>
      <span style={{ position: 'absolute', right: 72, bottom: 56, fontFamily: MONO, fontSize: 18, color: '#75817C' }}>{copy.credit}</span>
    </main>
  );
}
