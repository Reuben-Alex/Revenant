// Lantern mode and the before/after split (Main.dc.html L268–289, L338–341; renderVals() L1093–1119).
import * as copy from '../copy/graveyard';
import { H, W } from '../data/derive';
import { fireFlame, fireTriangle, handPath, lanternFlame, lanternIcon } from '../data/geometry';
import type { Reach } from '../data/reach';
import type { NewFire } from '../data/types';

interface LanternProps {
  x: number;
  y: number;
  r: number;
  inside: boolean;
  src: string;
  names: { id: string; text: string; x: number; y: number }[];
  /** Spec 06 lantern hunt: new fires found or inside the light, drawn above it. */
  fires?: NewFire[];
  /** The hunt counter, announced politely (Requirement 6.4). */
  counter?: string;
  /** Idle for 20 s: the nearest risen grave reaches toward the light, from its real hotspot. */
  reach?: Reach | null;
}

export function Lantern({ x, y, r, inside, src, names, fires = [], counter, reach }: LanternProps) {
  const lpx = ((x / W) * 100).toFixed(2);
  const lpy = ((y / H) * 100).toFixed(2);
  return (
    <>
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4,
        background: `radial-gradient(circle at ${lpx}% ${lpy}%, rgba(255,214,150,0.10) 0, rgba(2,4,4,0) 9%, rgba(2,4,4,0.93) 12%, rgba(2,4,4,0.96) 100%)` }} />
      <img className="rv-img" src={src} alt="" style={{ pointerEvents: 'none', zIndex: 4, clipPath: `circle(${r * 0.9}px at ${lpx}% ${lpy}%)`, filter: 'sepia(0.25) saturate(1.1) brightness(1.08)' }} />
      <svg viewBox="0 0 1060 716" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', zIndex: 4 }}>
        <circle cx={x} cy={y} r={r} style={{ fill: 'none', stroke: '#FFD9A0', strokeOpacity: 0.35, strokeWidth: 1.5 }} />
        {fires.map((f) => (
          <g key={f.id}>
            <path className="rv-appear" d={fireTriangle(f.x, f.y)} style={{ fill: '#F2C14E', stroke: '#050807', strokeWidth: 1 }} />
            <path className="rv-candle" d={fireFlame(f.x, f.y)} style={{ fill: '#FFE7A3', opacity: 0.9 }} />
          </g>
        ))}
        {reach && (
          <g key={reach.id} data-reach={reach.id} transform={`rotate(${reach.angle} ${reach.x} ${reach.y})`}>
            <g className="rv-reach">
              <circle cx={reach.x} cy={reach.y} r={30} style={{ fill: 'var(--ember)', fillOpacity: 0.2 }} />
              <path d={handPath(reach.x, reach.y, 1.8)} style={{ fill: 'none', stroke: 'var(--ember)', strokeWidth: 3.2, strokeLinecap: 'round', strokeLinejoin: 'round', filter: 'drop-shadow(0 0 6px #FF6B2C)' }} />
              <path d={handPath(reach.x, reach.y, 1.8)} style={{ fill: 'none', stroke: '#FFE1B0', strokeWidth: 1, strokeLinecap: 'round', strokeLinejoin: 'round' }} />
            </g>
          </g>
        )}
        {inside && (
          <g>
            <path d={lanternIcon(x, y)} style={{ fill: 'none', stroke: '#FFE7C2', strokeWidth: 1.4, strokeLinejoin: 'round' }} />
            <path className="rv-candle" d={lanternFlame(x, y)} style={{ fill: '#FFB86B' }} />
          </g>
        )}
      </svg>
      {inside && names.map((n) => (
        <span key={n.id} style={{ position: 'absolute', zIndex: 4, left: `${((n.x / W) * 100).toFixed(2)}%`, top: `${((n.y / H) * 100).toFixed(2)}%`,
          fontFamily: 'var(--font-fell-sc)', fontSize: 15, color: '#FFE7C2', textShadow: '0 0 4px #050807, 0 0 8px #050807', pointerEvents: 'none', whiteSpace: 'nowrap' }}>{n.text}</span>
      ))}
      {counter !== undefined && (
        <span role="status" aria-live="polite" style={{ position: 'absolute', top: 12, left: 12, zIndex: 6, pointerEvents: 'none',
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: '14px 14px 3px 3px',
          background: 'linear-gradient(180deg, rgba(42,36,24,0.95), rgba(14,12,9,0.95))', border: '1px solid #5A4A32',
          fontFamily: 'var(--font-fell-sc)', fontSize: 15, letterSpacing: 1, color: '#E6D6AE' }}>
          <svg width="12" height="14" viewBox="-7 -16 14 22" aria-hidden="true"><path d={fireTriangle(0, 0)} style={{ fill: '#F2C14E' }} /></svg>
          {counter}
        </span>
      )}
    </>
  );
}

interface CompareProps {
  src: string;
  night: boolean;
  split: number;
  left: string;
  right: string;
  onSplit: (n: number) => void;
}

const TAG: React.CSSProperties = { position: 'absolute', top: 12, fontFamily: 'var(--font-mono)', fontSize: 11, color: '#050807', background: '#ECE6D6', padding: '3px 7px', borderRadius: 3, pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 4 };

export function Compare({ src, night, split, left, right, onSplit }: CompareProps) {
  return (
    <>
      <img className="rv-img" src={src} alt="" style={{ zIndex: 3, filter: night ? 'brightness(0.62) saturate(0.75) contrast(1.15)' : 'none', clipPath: `inset(0 ${100 - split}% 0 0)` }} />
      <div aria-hidden="true" style={{ position: 'absolute', top: 0, bottom: 0, left: `${split}%`, width: 2, marginLeft: -1, background: '#ECE6D6', boxShadow: '0 0 10px #000', pointerEvents: 'none', zIndex: 4 }} />
      <span style={{ ...TAG, left: `calc(${split}% - 12px)`, transform: 'translateX(-100%)' }}>{left}</span>
      <span style={{ ...TAG, left: `calc(${split}% + 12px)` }}>{right}</span>
      <label htmlFor="rv-split" className="rv-sr">{copy.compare.label}</label>
      <input id="rv-split" type="range" min={2} max={98} step={1} value={split} onChange={(e) => onSplit(Number(e.target.value))}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: '100%', margin: 0, opacity: 0, cursor: 'ew-resize', zIndex: 5 }} />
    </>
  );
}
