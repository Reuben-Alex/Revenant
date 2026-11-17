// Carved grave card (Main.dc.html L421–429; style from card() L1413–1420).
import * as copy from '../copy/graveyard';
import type { CardView } from '../data/derive';

export function GraveCard({ c, selected, onPick }: { c: CardView; selected: boolean; onPick: () => void }) {
  const glow = c.risen ? ', 0 0 24px rgba(255,107,44,0.20), inset 0 -22px 26px -14px rgba(255,107,44,0.45)'
    : c.warm ? ', inset 0 -18px 22px -14px rgba(232,160,122,0.35)' : '';
  return (
    <button type="button" className="rv-card" aria-pressed={selected} onClick={onPick} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, textAlign: 'center', width: '100%', boxSizing: 'border-box',
      padding: '20px 20px 14px', borderRadius: '70px 70px 4px 4px', cursor: 'pointer', color: 'inherit', border: `1px solid ${c.border}`,
      background: `linear-gradient(180deg, ${selected ? '#232C29' : '#1A201E'} 0%, #111614 65%, #0B0F0E 100%)`,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 5px 0 -2px #030404' + glow,
      ...(selected ? { outline: '1px solid #ECE6D6', outlineOffset: -5 } : null),
    }}>
      <span style={{ fontFamily: 'var(--font-fell-sc)', fontSize: 11, letterSpacing: 5, color: '#7C8884' }}>{copy.list.here}</span>
      <span style={{ fontFamily: 'var(--font-fell-sc)', fontSize: 24, lineHeight: 1, color: '#D6D0C0', textShadow: '0 -1px 0 #000, 0 1px 0 rgba(255,255,255,0.09)' }}>{c.id}</span>
      <span style={{ fontFamily: 'var(--font-fell)', fontStyle: 'italic', fontSize: 13.5, lineHeight: 1.35, color: '#A9B2AD' }}>{c.epitaph}</span>
      <span style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, width: '100%', marginTop: 2 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: 2, color: c.color }}>{c.label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: '#7C8884' }}>{c.dayText}</span>
      </span>
      <span aria-hidden="true" style={{ width: '70%', height: 3, borderRadius: 2, background: '#1C2725', display: 'block', alignSelf: 'center' }}>
        <span style={{ display: 'block', height: 4, borderRadius: 2, width: `${Math.max(0, Math.min(100, c.bar)).toFixed(0)}%`, background: c.barColor }} />
      </span>
    </button>
  );
}
