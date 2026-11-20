// Keep watch, puzzle 4 (spec 07 Requirement 4). The panel borrows the wager's parchment (Main.dc.html `wagerOpen`
// L326–341) and sits at the top of the aside, as the wager does. Lanterns go only on still-warm scars.
import type { CSSProperties } from 'react';
import * as copy from '../copy/tonight';
import { ironStyle } from './IronButton';

interface Props {
  year: number;
  need: number;
  marks: string[];
  sealed: boolean;
  result: string | null;
  saving: boolean;
  onSeal: () => void;
  onAgain: () => void;
  onSave: () => void;
}

const slot = (on: boolean): CSSProperties => ({
  minWidth: 66, textAlign: 'center', padding: '6px 10px', borderRadius: '16px 16px 3px 3px', boxSizing: 'border-box',
  fontFamily: 'var(--font-fell-sc)', fontSize: 16, color: on ? '#F4E6C8' : '#6F6250',
  border: `1px solid ${on ? '#8A5A45' : '#3A3022'}`, background: on ? 'linear-gradient(180deg, #2A221C, #15110E)' : 'transparent',
});

export function KeepWatch({ year, need, marks, sealed, result, saving, onSeal, onAgain, onSave }: Props) {
  const ready = marks.length === need && need > 0;
  return (
    <div className="rv-say" role="region" aria-label={copy.keep.aria} style={{
      width: '100%', boxSizing: 'border-box', flex: 'none',
      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 6, padding: '16px 14px',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(42,36,24,0.97), rgba(14,12,9,0.97) 75%)',
      border: '1px solid #5A4A32', borderRadius: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
    }}>
      <h2 style={{ margin: 0, fontFamily: 'var(--font-fell-sc)', fontWeight: 400, fontSize: 14, letterSpacing: 4, color: '#D8C8A0' }}>{copy.keep.title}</h2>
      {!sealed ? (
        <>
          <span aria-live="polite" style={{ fontFamily: 'var(--font-fell)', fontStyle: 'italic', fontSize: 19, lineHeight: 1.35, color: '#F4EEE2' }}>
            {copy.keep.prompt(year, need, marks.length)}
          </span>
          <span style={{ fontFamily: 'var(--font-fell)', fontStyle: 'italic', fontSize: 14, color: '#B8A880' }}>{copy.keep.hint}</span>
        </>
      ) : (
        <span role="status" style={{ fontFamily: 'var(--font-fell)', fontStyle: 'italic', fontSize: 17, lineHeight: 1.4, color: '#F4EEE2' }}>
          {result} <span style={{ color: '#E8A07A' }}>{copy.keep.caveat}</span>
        </span>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
        {Array.from({ length: Math.max(need, 1) }, (_, i) => (
          <span key={i} style={slot(!!marks[i])}>{marks[i] ?? <span aria-hidden="true">{copy.keep.empty}</span>}</span>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 6 }}>
        {!sealed ? (
          <button type="button" className="rv-btn" aria-disabled={!ready} onClick={() => ready && onSeal()}
            style={{ ...ironStyle(ready), padding: '0 14px', ...(ready ? null : { opacity: 0.5, cursor: 'not-allowed' }) }}>{copy.keep.seal}</button>
        ) : (
          <>
            <button type="button" className="rv-btn" onClick={onSave} aria-busy={saving} style={{ ...ironStyle(true), padding: '0 14px' }}>
              {saving ? copy.keep.saving : copy.keep.save}
            </button>
            <button type="button" className="rv-btn" onClick={onAgain} style={{ ...ironStyle(false), padding: '0 14px' }}>{copy.keep.again}</button>
          </>
        )}
      </div>
    </div>
  );
}
