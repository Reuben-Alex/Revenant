// Read the stones (spec 06 Requirement 4). The panel follows the board's `wagerOpen` markup (Main.dc.html L326–341)
// and `wg` in renderVals() (L1364–1376), with one change: it sits at the top of the right column, not over the map.
// At the board's place (top centre of the map, 580 × 204 px at 1440) it covered 11 of the 24 Spring 2024 stones, so
// they could be neither read nor clicked. The clue card takes the hover tooltip's place (L258–262, L1120–1126) and
// holds only published values (`clueCard`).
import type { CSSProperties } from 'react';
import * as copy from '../copy/gravekeeper';
import { ironStyle } from './IronButton';

interface Props {
  marks: string[];
  onSeal: () => void;
  onWatch: () => void;
}

const slot = (on: boolean): CSSProperties => ({
  minWidth: 66, textAlign: 'center', padding: '6px 10px', borderRadius: '16px 16px 3px 3px', boxSizing: 'border-box',
  fontFamily: 'var(--font-fell-sc)', fontSize: 16, color: on ? '#F4E6C8' : '#6F6250', // the empty dots are decorative (aria-hidden)
  border: `1px solid ${on ? '#8A5A45' : '#3A3022'}`, background: on ? 'linear-gradient(180deg, #2A221C, #15110E)' : 'transparent',
});

export function Wager({ marks, onSeal, onWatch }: Props) {
  const ready = marks.length === 3;
  return (
    <div className="rv-say" role="region" aria-label={copy.wager.aria} style={{
      width: '100%', boxSizing: 'border-box', flex: 'none',
      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 6, padding: '16px 14px',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(42,36,24,0.97), rgba(14,12,9,0.97) 75%)',
      border: '1px solid #5A4A32', borderRadius: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
    }}>
      <h2 style={{ margin: 0, fontFamily: 'var(--font-fell-sc)', fontWeight: 400, fontSize: 14, letterSpacing: 4, color: '#D8C8A0' }}>{copy.wager.title}</h2>
      <span aria-live="polite" style={{ fontFamily: 'var(--font-fell)', fontStyle: 'italic', fontSize: 19, lineHeight: 1.35, color: '#F4EEE2' }}>{copy.wager.prompt(marks.length)}</span>
      <span style={{ fontFamily: 'var(--font-fell)', fontStyle: 'italic', fontSize: 14, color: '#B8A880' }}>{copy.wager.hint}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={slot(!!marks[i])}>{marks[i] ?? <span aria-hidden="true">{copy.wager.empty}</span>}</span>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 6 }}>
        {/* aria-disabled, not disabled: the button stays in the Tab order and says why it can't be pressed yet. */}
        <button type="button" className="rv-btn" aria-disabled={!ready} onClick={() => ready && onSeal()}
          style={{ ...ironStyle(ready), padding: '0 14px', ...(ready ? null : { opacity: 0.5, cursor: 'not-allowed' }) }}>{copy.wager.seal}</button>
        <button type="button" className="rv-btn" onClick={onWatch} style={{ ...ironStyle(false), padding: '0 14px' }}>{copy.wager.watch}</button>
      </div>
    </div>
  );
}

interface ClueProps {
  title: string;
  /** Published values only, one per line. */
  lines: string[];
  action: string;
  marked: boolean;
  left: number;
  top: number;
}

/** The hover/focus card while the wager (spec 06 Requirement 4.3) or Keep watch (spec 07 Requirement 4.3) is open. */
export function ClueCard({ title, lines, action, marked, left, top }: ClueProps) {
  return (
    <div role="tooltip" style={{
      position: 'absolute', left: `${left.toFixed(1)}%`, top: `calc(${top.toFixed(1)}% + 24px)`, display: 'flex', flexDirection: 'column', gap: 2,
      fontSize: 12, background: 'rgba(6,10,9,0.95)', border: '1px solid #3A4A45', borderRadius: 6, padding: '7px 10px', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 3,
    }}>
      <b style={{ fontFamily: 'var(--font-fell-sc)', fontWeight: 400, fontSize: 15 }}>{title}</b>
      {lines.map((l) => <span key={l} style={{ color: '#A3ADA8' }}>{l}</span>)}
      <span style={{ color: marked ? '#FFB86B' : '#7FE0CF' }}>{action}</span>
    </div>
  );
}
