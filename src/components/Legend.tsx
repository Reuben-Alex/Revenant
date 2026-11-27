// Legend "Every symbol is a rule" (Main.dc.html L430–437; swatches from renderVals() L1230–1243).
import type { CSSProperties } from 'react';
import * as copy from '../copy/graveyard';
import type { Swatch } from '../data/derive';

const base: CSSProperties = { flex: 'none', display: 'inline-block', width: 16, height: 16, boxSizing: 'border-box' };
const SW: Record<Swatch, CSSProperties> = {
  scar: { borderRadius: 4, background: '#7A2E10' },
  buried: { borderRadius: '8px 8px 2px 2px', background: '#141B19', border: '1.5px solid #8A9692', borderTop: '3px solid #F1F6F6' },
  waking: { borderRadius: 8, background: 'rgba(127,224,207,0.2)', border: '1px solid #7FE0CF' },
  risen: { borderRadius: 2, borderBottom: '3px solid var(--ember)', borderLeft: '2px solid var(--ember)', borderRight: '2px solid var(--ember)' },
  fire: { clipPath: 'polygon(50% 0, 100% 100%, 0 100%)', background: '#F2C14E' },
  rest: { borderRadius: '8px 8px 2px 2px', background: '#0D1210', border: '1.5px solid #4D5753', opacity: 0.6 },
  warm: { borderRadius: 8, background: 'rgba(232,160,122,0.2)', border: '1px solid #E8A07A' },
  hotspot: { borderRadius: 8, background: '#F2C14E' },
  mist: { borderRadius: 8, background: 'radial-gradient(closest-side, rgba(220,232,232,0.7), rgba(220,232,232,0))' },
  ash: { borderRadius: 8, background: 'radial-gradient(circle at 30% 35%, #FF8A4C 0 2px, transparent 2.5px), radial-gradient(circle at 70% 65%, #9A8F86 0 2px, transparent 2.5px)' },
  dark: { borderRadius: 3, background: 'radial-gradient(closest-side, rgba(0,0,0,0) 30%, #000 100%), #3A4446' },
};

export function Legend({ items, note }: { items: { swatch: Swatch; text: readonly [string, string] }[]; note: string }) {
  return (
    <section aria-label="Legend" style={{ borderRadius: 4, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 7, marginTop: 6, background: 'radial-gradient(ellipse at 30% 0%, #221E15 0%, #14110B 70%)', border: '1px solid #3A3022' }}>
      <span style={{ fontFamily: 'var(--font-fell-sc)', fontSize: 16, letterSpacing: 2, color: '#E6D6AE' }}>{copy.legend.title}</span>
      {items.map((l) => (
        <div key={l.text[0]} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
          <span aria-hidden="true" style={{ ...base, ...SW[l.swatch] }} />
          <span><b style={{ fontWeight: 600, color: '#E6D6AE' }}>{l.text[0]}</b> <span style={{ color: '#B8A880' }}>{l.text[1]}</span></span>
        </div>
      ))}
      <span style={{ fontFamily: 'var(--font-fell)', fontStyle: 'italic', fontSize: 12.5, lineHeight: 1.45, color: '#9A8C6A' }}>{note}</span>
    </section>
  );
}
