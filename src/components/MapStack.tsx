// The map (Main.dc.html L146–342): keyframes, grade, scar mask, fog, border, candles, tombstones,
// snowfall, grain/vignette, callout, hit targets, tooltip, credit chip.
import type { ReactNode } from 'react';
import * as copy from '../copy/graveyard';
import type { CalloutView, GraveView } from '../data/derive';
import { H, W } from '../data/derive';
import { fireFlame, fireTriangle } from '../data/geometry';
import type { Keyframe } from '../data/imagery';
import type { NewFire } from '../data/types';
import { Callout, Tooltip } from './Callout';
import { Tombstone } from './Tombstone';

const SVG: React.CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' };
const pct = (n: number, of: number) => `${((n / of) * 100).toFixed(2)}%`;

interface Props {
  frames: Keyframe[];
  weights: number[];
  night: boolean;
  maskClass: string;
  graves: GraveView[];
  fires: NewFire[];
  fireSel: string | null;
  clusters: [number, number, number][];
  selected: string;
  hover: string | null;
  callout: CalloutView | null;
  tip: { title: string; line: string; left: number; top: number } | null;
  flakes: number;
  credit: string;
  onGrave: (id: string) => void;
  onFire: (id: string) => void;
  onHover: (id: string | null) => void;
  onFocusGrave?: (id: string) => void;
  onMove?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onLeave?: () => void;
  cursor?: string;
  overlays?: ReactNode;
  panel?: ReactNode;
}

export function MapStack(p: Props) {
  const grade = p.night ? 'brightness(0.62) saturate(0.75) contrast(1.15)' : 'none';
  return (
    <div onMouseMove={p.onMove} onMouseLeave={p.onLeave}
      // alignSelf keeps the 1060:716 box: if the row stretched it, the images would distort while the
      // SVG layers (viewBox, letterboxed) would not, and graves would drift off their scars.
      style={{ flex: '999 1 560px', minWidth: 0, alignSelf: 'flex-start', position: 'relative', aspectRatio: '1060 / 716', overflow: 'hidden', borderRight: '1px solid #172120', background: '#060A09', cursor: p.cursor ?? 'default' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        {p.frames.map((f, i) => (
          <img key={f.src} className="rv-img" src={f.src} alt="" style={{ filter: grade, opacity: +(p.weights[i] ?? 0).toFixed(3) }} />
        ))}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: '#04121A', mixBlendMode: 'multiply', transition: 'opacity .6s', opacity: p.night ? 0.45 : 0 }} />
        <div className={`rv-scars ${p.maskClass}`} aria-hidden="true"
          style={{ background: p.night ? '#B4461A' : '#E0561C', opacity: p.night ? 0.42 : 0.35, mixBlendMode: 'screen' }} />
        <div aria-hidden="true" style={{ position: 'absolute', inset: '-10% -20%', pointerEvents: 'none', overflow: 'hidden' }}>
          <div className="rv-fog" style={{
            width: '140%', height: '100%', opacity: p.night ? 0.5 : 0.25,
            background: 'radial-gradient(ellipse 30% 18% at 20% 30%, rgba(200,214,214,0.20), transparent 70%), radial-gradient(ellipse 26% 14% at 62% 64%, rgba(200,214,214,0.16), transparent 70%), radial-gradient(ellipse 22% 12% at 84% 22%, rgba(200,214,214,0.14), transparent 70%)',
          }} />
        </div>

        <svg viewBox="0 0 1060 716" aria-hidden="true" style={SVG}>
          <path d="M374 0 V716" style={{ fill: 'none', stroke: '#C9D2D1', strokeOpacity: 0.35, strokeWidth: 1.2, strokeDasharray: '6 5' }} />
          <text x="382" y="672" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: '#C9D2D1', fillOpacity: 0.6 }}>{copy.map.border}</text>
          <text x="24" y="698" style={{ fontFamily: 'var(--font-fell-sc)', fontSize: 15, letterSpacing: 8, fill: '#C9D2D1', fillOpacity: 0.7 }}>{copy.map.bc}</text>
          <text x="880" y="698" style={{ fontFamily: 'var(--font-fell-sc)', fontSize: 15, letterSpacing: 8, fill: '#C9D2D1', fillOpacity: 0.7 }}>{copy.map.ab}</text>
        </svg>

        {p.clusters.length > 0 && (
          <svg viewBox="0 0 1060 716" aria-hidden="true" style={SVG}>
            {p.clusters.map(([x, y, n], i) => (
              <circle key={`${x}-${y}`} className="rv-candle" cx={x} cy={y} r={+(1.6 + Math.sqrt(n) / 4).toFixed(1)}
                style={{ fill: '#F2C14E', fillOpacity: 0.85, animationDelay: `-${((i * 0.37) % 1.8).toFixed(2)}s` }} />
            ))}
          </svg>
        )}

        <svg viewBox="0 0 1060 716" aria-hidden="true" style={{ ...SVG, overflow: 'visible' }}>
          {p.fires.map((f) => {
            const sel = p.fireSel === f.id;
            return (
              <g key={f.id}>
                <path className="rv-appear" d={fireTriangle(f.x, f.y)} style={{ fill: '#F2C14E', stroke: sel ? '#ECE6D6' : '#050807', strokeWidth: sel ? 2 : 1 }} />
                <path className="rv-candle" d={fireFlame(f.x, f.y)} style={{ fill: '#FFE7A3', opacity: 0.9 }} />
              </g>
            );
          })}
        </svg>

        {p.graves.map((v) => (
          <Tombstone key={v.id} v={v} selected={p.selected === v.id} hovered={p.hover === v.id} />
        ))}

        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {Array.from({ length: p.flakes }, (_, i) => {
            const size = 1.5 + (i % 3);
            const dur = 7 + (i % 6) * 1.6;
            return (
              <div key={i} className="rv-snow" style={{
                position: 'absolute', left: `${((i * 37.3) % 100).toFixed(2)}%`, top: 0, width: size, height: size, borderRadius: size,
                background: '#E4EDEE', opacity: 0.2 + (i % 4) * 0.12, animationDuration: `${dur}s`, animationDelay: `-${((i * 1.31) % dur).toFixed(2)}s`,
              }} />
            );
          })}
        </div>

        <svg viewBox="0 0 1060 716" aria-hidden="true" style={SVG}>
          <defs>
            <filter id="rv-grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
            <radialGradient id="rv-vignette" cx="0.5" cy="0.5" r="0.78"><stop offset="0.55" stopColor="#000000" stopOpacity="0" /><stop offset="1" stopColor="#000000" stopOpacity="0.75" /></radialGradient>
          </defs>
          <rect x="0" y="0" width="1060" height="716" style={{ filter: 'url(#rv-grain)', opacity: 0.06 }} />
          {p.night && <rect x="0" y="0" width="1060" height="716" style={{ fill: 'url(#rv-vignette)' }} />}
        </svg>

        {p.callout && <Callout c={p.callout} />}

        {p.fires.map((f) => (
          <button key={f.id} type="button" className="rv-hit" aria-label={copy.map.fireAria(f.id)} aria-pressed={p.fireSel === f.id} onClick={() => p.onFire(f.id)}
            style={{ position: 'absolute', left: pct(f.x, W), top: pct(f.y, H), width: 28, height: 28, margin: '-16px 0 0 -14px', borderRadius: 14, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }} />
        ))}
        {p.graves.map((v) => (
          <button key={v.id} type="button" className="rv-hit" aria-label={copy.map.graveAria(v.id, v.label)} aria-pressed={p.selected === v.id}
            onClick={() => p.onGrave(v.id)} onMouseEnter={() => p.onHover(v.id)} onMouseLeave={() => p.onHover(null)}
            onFocus={() => { p.onHover(v.id); p.onFocusGrave?.(v.id); }} onBlur={() => p.onHover(null)}
            style={{ position: 'absolute', left: pct(v.cx, W), top: pct(v.cy, H), width: 40, height: 40, margin: '-20px 0 0 -20px', borderRadius: 20, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }} />
        ))}

        {p.tip && <Tooltip {...p.tip} />}
      </div>

      {p.overlays}

      <span style={{ position: 'absolute', right: 12, bottom: 10, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: '#C9D2D1', background: 'rgba(4,7,6,0.72)', padding: '3px 6px', borderRadius: 3, pointerEvents: 'none', zIndex: 6 }}>{p.credit}</span>
      {p.panel}
    </div>
  );
}
