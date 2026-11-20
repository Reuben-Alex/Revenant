// The verdict card (spec 06 Requirement 7). Markup and values: Main.dc.html `hasVerdict` L289–298 and `verdict` in
// renderVals() L1393–1401. Every number comes from `verdictView` (published fields only).
import * as copy from '../copy/gravekeeper';
import type { VerdictView } from '../data/gravekeeper';
import { ironStyle } from './IronButton';

interface Props {
  v: VerdictView;
  onAgain: () => void;
  /** Quiet years: the visual glitch of the title and detail (their accessible text stays true). */
  glitch?: (s: string) => string;
}

export function Verdict({ v, onAgain, glitch }: Props) {
  const g = glitch ?? ((s: string) => s);
  return (
    <div className="rv-beat" style={{
      position: 'absolute', left: '50%', top: '12%', transform: 'translateX(-50%)', width: 'min(520px, 88%)', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10, padding: '36px 28px 22px',
      background: 'radial-gradient(ellipse at 50% 0%, #2A2418, #120F0A 75%)', border: '1px solid #5A4A32', borderRadius: '160px 160px 8px 8px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.75), inset 0 0 30px rgba(0,0,0,0.6)', zIndex: 5,
    }}>
      {/* The announced text is always the true one; the shown text below may glitch (Requirement 3.3). */}
      <span role="status" className="rv-sr">{[v.kicker + '.', v.title, v.detail, v.wager].filter(Boolean).join(' ')}</span>
      <span aria-hidden="true" style={{ fontFamily: 'var(--font-fell-sc)', fontSize: 13, letterSpacing: 4, color: '#D8C8A0' }}>{v.kicker}</span>
      <span aria-hidden="true" style={{ fontFamily: 'var(--font-fell-sc)', fontSize: 34, lineHeight: 1.05, color: '#F4EEE2' }}>{g(v.title)}</span>
      <span aria-hidden="true" style={{ fontFamily: 'var(--font-fell)', fontStyle: 'italic', fontSize: 17, lineHeight: 1.45, color: '#D8C8A0' }}>{g(v.detail)}</span>
      {v.wager && (
        <span aria-hidden="true" style={{ fontFamily: 'var(--font-fell-sc)', fontSize: 16, letterSpacing: 1, color: '#F4B98A', paddingTop: 6, borderTop: '1px dashed rgba(216,200,160,0.3)' }}>{v.wager}</span>
      )}
      <button type="button" className="rv-btn" onClick={onAgain} style={{ ...ironStyle(false), alignSelf: 'center', marginTop: 4 }}>{copy.verdict.again}</button>
    </div>
  );
}
