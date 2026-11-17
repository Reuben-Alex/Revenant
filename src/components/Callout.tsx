// Callout card with a dashed leader, and the hover tooltip (Main.dc.html L246–262).
import type { CalloutView } from '../data/derive';
import { H, W } from '../data/derive';
import * as copy from '../copy/graveyard';

export function Callout({ c }: { c: CalloutView }) {
  const pct = (n: number, of: number) => `${((n / of) * 100).toFixed(2)}%`;
  return (
    <>
      <svg viewBox="0 0 1060 716" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
        <path d={`M${c.ax} ${c.ay} L${c.leader.x2} ${c.leader.y2}`} style={{ fill: 'none', stroke: c.color, strokeWidth: 1, strokeDasharray: '3 3' }} />
      </svg>
      <div role="status" aria-label={`${c.title}, ${c.status.toLowerCase()}. ${c.line1}. ${c.line2}.`}
        style={{
          position: 'absolute', left: pct(c.box.x, W), top: pct(c.box.y, H), width: pct(c.box.w, W), minWidth: 220, boxSizing: 'border-box',
          display: 'flex', flexDirection: 'column', gap: 3, padding: '18px 18px 12px',
          background: 'linear-gradient(180deg, rgba(22,28,26,0.96), rgba(7,11,10,0.96))', border: `1px solid ${c.color}`,
          borderRadius: '40px 40px 4px 4px', boxShadow: '0 8px 30px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)', pointerEvents: 'none', zIndex: 2,
        }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 3, color: c.color }}>{c.status}</span>
        <span style={{ fontFamily: 'var(--font-fell-sc)', fontSize: 22, lineHeight: 1.1, color: '#ECE6D6', textShadow: '0 -1px 0 #000' }}>{c.title}</span>
        <span style={{ fontFamily: 'var(--font-fell)', fontStyle: 'italic', fontSize: 14.5, lineHeight: 1.35, color: '#C7CFCB' }}>{c.line1}</span>
        <span style={{ fontFamily: 'var(--font-fell)', fontStyle: 'italic', fontSize: 14.5, lineHeight: 1.35, color: '#C7CFCB' }}>{c.line2}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: '#8E9994', marginTop: 2 }}>{c.coords}</span>
      </div>
    </>
  );
}

export function Tooltip({ title, line, left, top }: { title: string; line: string; left: number; top: number }) {
  return (
    <div role="tooltip" style={{
      position: 'absolute', left: `${left.toFixed(1)}%`, top: `calc(${top.toFixed(1)}% + 24px)`, display: 'flex', flexDirection: 'column', gap: 2,
      fontSize: 12, background: 'rgba(6,10,9,0.95)', border: '1px solid #3A4A45', borderRadius: 6, padding: '7px 10px', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 3,
    }}>
      <b style={{ fontFamily: 'var(--font-fell-sc)', fontWeight: 400, fontSize: 15 }}>{title}</b>
      <span style={{ color: '#A3ADA8' }}>{line}</span>
      <span style={{ color: '#7FE0CF' }}>{copy.tooltip.action}</span>
    </div>
  );
}
