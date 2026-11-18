// The rising cinematic (spec 05 Requirement 3.4). Markup and values: Main.dc.html `camOn` L208–220 (inside the camera
// layer) and L262–265 (letterbox, outside it); `cine` in renderVals() L1256–1267.
import { fissuresPath, handPath } from '../data/geometry';

const SVG: React.CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' };
const pct = (n: number, of: number) => `${((n / of) * 100).toFixed(2)}%`;

/** Underglow, fissures and their hot core, heave ring, burning hand and sparks at the hotspot. */
export function Cinematic({ x, y }: { x: number; y: number }) {
  const fissures = fissuresPath(x, y + 6);
  return (
    <>
      {/* The base transform centres the glow; rv-glowup animates it, and keeps it centred under reduced motion. */}
      <div aria-hidden="true" className="rv-underglow" style={{
        position: 'absolute', left: pct(x, 1060), top: pct(y + 6, 716), width: '11%', aspectRatio: '1.6', borderRadius: '50%',
        transform: 'translate(-50%, -50%)', pointerEvents: 'none', mixBlendMode: 'screen',
        background: 'radial-gradient(ellipse at center, rgba(255,190,110,0.95) 0%, rgba(255,110,40,0.55) 28%, rgba(160,30,0,0.25) 52%, rgba(0,0,0,0) 72%)',
      }} />
      <svg viewBox="0 0 1060 716" aria-hidden="true" style={SVG}>
        <defs>
          <filter id="rv-hot" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <path className="rv-fissure" d={fissures} style={{ fill: 'none', stroke: '#FF7A2E', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round', filter: 'url(#rv-hot)' }} />
        <path className="rv-fissure2" d={fissures} style={{ fill: 'none', stroke: '#FFF1C9', strokeWidth: 0.45, strokeLinecap: 'round' }} />
        <circle className="rv-heave" cx={x} cy={y} r={16} style={{ fill: 'none', stroke: '#FFB86B', strokeWidth: 1.2 }} />
        <g className="rv-burst">
          <path d={handPath(x, y, 1.25)} style={{ fill: 'none', stroke: 'var(--ember)', strokeWidth: 2.6, strokeLinecap: 'round', strokeLinejoin: 'round', filter: 'url(#rv-hot)' }} />
        </g>
        <circle className="rv-spark" cx={x - 3} cy={y} r={0.9} style={{ fill: '#FFD08A' }} />
        <circle className="rv-spark rv-spark2" cx={x + 2} cy={y} r={0.7} style={{ fill: '#FFD08A' }} />
        <circle className="rv-spark rv-spark3" cx={x + 6} cy={y} r={1.1} style={{ fill: '#FFD08A' }} />
      </svg>
    </>
  );
}

/** Letterbox bars, 9 % high, sliding in over 0.6 s (outside the camera layer). */
export function Letterbox() {
  const bar: React.CSSProperties = { position: 'absolute', left: 0, right: 0, height: '9%', background: '#000', pointerEvents: 'none', zIndex: 4 };
  return (
    <>
      <div aria-hidden="true" className="rv-lbt" style={{ ...bar, top: 0 }} />
      <div aria-hidden="true" className="rv-lbb" style={{ ...bar, bottom: 0 }} />
    </>
  );
}
