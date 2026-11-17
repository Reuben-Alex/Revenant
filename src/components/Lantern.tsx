// Lantern mode and the before/after split (Main.dc.html L268–289, L338–341; renderVals() L1093–1119).
import * as copy from '../copy/graveyard';
import { H, W } from '../data/derive';
import { lanternFlame, lanternIcon } from '../data/geometry';

interface LanternProps {
  x: number;
  y: number;
  r: number;
  inside: boolean;
  src: string;
  names: { id: string; text: string; x: number; y: number }[];
}

export function Lantern({ x, y, r, inside, src, names }: LanternProps) {
  const lpx = ((x / W) * 100).toFixed(2);
  const lpy = ((y / H) * 100).toFixed(2);
  return (
    <>
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4,
        background: `radial-gradient(circle at ${lpx}% ${lpy}%, rgba(255,214,150,0.10) 0, rgba(2,4,4,0) 9%, rgba(2,4,4,0.93) 12%, rgba(2,4,4,0.96) 100%)` }} />
      <img className="rv-img" src={src} alt="" style={{ pointerEvents: 'none', zIndex: 4, clipPath: `circle(${r * 0.9}px at ${lpx}% ${lpy}%)`, filter: 'sepia(0.25) saturate(1.1) brightness(1.08)' }} />
      <svg viewBox="0 0 1060 716" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', zIndex: 4 }}>
        <circle cx={x} cy={y} r={r} style={{ fill: 'none', stroke: '#FFD9A0', strokeOpacity: 0.35, strokeWidth: 1.5 }} />
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
