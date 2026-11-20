// The Parish Register (Main.dc.html L400–415; rows from renderVals() L1218–1228).
import * as copy from '../copy/graveyard';
import type { SeasonKey } from '../data/types';

interface Row { key: SeasonKey; year: number; on: boolean; obs: number; chance: number; zombie: boolean; text: string }

interface Props {
  rows: Row[];
  note: string;
  onPick: (k: SeasonKey) => void;
  /** Spec 06 quiet-year glitch: the current row's text only, visual only (board L1223). */
  glitch?: (s: string) => string;
}

export function Register({ rows, note, onPick, glitch }: Props) {
  return (
    <section aria-label={copy.register.aria} style={{
      position: 'relative', borderRadius: 4, padding: '16px 18px 14px', display: 'flex', flexDirection: 'column', gap: 9,
      background: 'repeating-linear-gradient(180deg, rgba(0,0,0,0) 0, rgba(0,0,0,0) 25px, rgba(216,200,160,0.07) 25px, rgba(216,200,160,0.07) 26px), radial-gradient(ellipse at 30% 0%, #2A2418 0%, #18140D 60%, #100D08 100%)',
      border: '1px solid #3A3022', boxShadow: 'inset 0 0 30px rgba(0,0,0,0.6)',
    }}>
      <span style={{ fontFamily: 'var(--font-fell-sc)', fontSize: 20, letterSpacing: 1, color: '#E6D6AE', textAlign: 'center' }}>{copy.register.title}</span>
      <span style={{ fontFamily: 'var(--font-fell)', fontStyle: 'italic', fontSize: 13.5, color: '#B8A880', textAlign: 'center', marginTop: -6 }}>{copy.register.sub}</span>
      {rows.map((r) => (
        <button key={r.key} type="button" className="rv-card" aria-pressed={r.on} onClick={() => onPick(r.key)} style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 40, padding: '7px 6px', borderRadius: 2, cursor: 'pointer',
          color: 'inherit', textAlign: 'left', border: 'none', borderBottom: '1px dashed rgba(216,200,160,0.22)', background: r.on ? 'rgba(216,200,160,0.07)' : 'transparent',
        }}>
          <span style={{ fontFamily: 'var(--font-fell-sc)', fontSize: 16, width: 44, flex: 'none', color: r.on ? '#F4E6C0' : '#B8A880' }}>{r.year}</span>
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ position: 'relative', height: 8, display: 'block' }}>
              <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(r.obs * 100).toFixed(1)}%`, borderRadius: '1px 5px 2px 1px', background: `linear-gradient(90deg, #6E1E12, ${r.zombie ? '#C2472C' : '#8E3A26'})`, opacity: 0.92 }} />
            </span>
            <span style={{ position: 'relative', height: 4, display: 'block' }}>
              <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(r.chance * 100).toFixed(1)}%`, background: 'repeating-linear-gradient(90deg, #B8A880 0, #B8A880 6px, rgba(0,0,0,0) 6px, rgba(0,0,0,0) 9px)', opacity: 0.7 }} />
            </span>
          </span>
          <span style={{ fontFamily: 'var(--font-fell)', fontStyle: 'italic', fontSize: 14, minWidth: 92, flex: 'none', textAlign: 'right', whiteSpace: 'nowrap', color: '#E6D6AE' }}>
            {glitch && r.on ? <><span aria-hidden="true">{glitch(r.text)}</span><span className="rv-sr">{r.text}</span></> : r.text}
          </span>
        </button>
      ))}
      <span style={{ fontFamily: 'var(--font-fell)', fontStyle: 'italic', fontSize: 13, lineHeight: 1.45, color: '#B8A880' }}>{note}</span>
    </section>
  );
}
