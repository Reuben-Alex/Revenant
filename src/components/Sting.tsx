// The sting for a rising (spec 05 Requirement 2). Markup and values: Main.dc.html `hasSting` L299–305 and `sting`
// in renderVals() L1381–1384. The flash restarts only on a new flash (key = flashKey), so flashes stay under three a
// second (Requirement 2.4). The text restarts with each sting.
import type { Sting as StingState } from '../scenes/useGraveyard';

export function Sting({ s }: { s: StingState }) {
  return (
    <div aria-hidden="true" style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'flex-start', paddingTop: '11%', gap: 10, zIndex: 5, boxSizing: 'border-box',
    }}>
      <div key={`flash-${s.flashKey}`} className="rv-flash" style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at ${((s.x / 1060) * 100).toFixed(1)}% ${((s.y / 716) * 100).toFixed(1)}%, rgba(255,107,44,0.5), rgba(120,20,0,0.3) 35%, rgba(0,0,0,0.55) 75%)`,
      }} />
      <span key={`t-${s.until}`} className="rv-sting" style={{
        position: 'relative', fontFamily: 'var(--font-fell-sc)', fontSize: 62, color: '#F4E9DA', whiteSpace: 'nowrap',
        textShadow: '0 0 24px var(--ember), 0 0 60px var(--ember)',
      }}>{s.title}</span>
      <span key={`d-${s.until}`} className="rv-sting" style={{
        position: 'relative', fontFamily: 'var(--font-mono)', fontSize: 13, letterSpacing: 3, color: '#ECE6D6', textShadow: '0 1px 6px #000',
      }}>{s.detail}</span>
    </div>
  );
}
