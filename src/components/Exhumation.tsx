// Exhumation panel: a tombstone-topped sheet sliding in from the right (Main.dc.html L350–399; values
// from renderVals() L1131–1197). Escape and × close it; focus returns to whatever opened it.
import { useEffect, useRef } from 'react';
import * as copy from '../copy/graveyard';
import type { ExhumeView } from '../data/derive';

export function Exhumation({ ex, onClose }: { ex: ExhumeView; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [ex.id, onClose]);

  return (
    <section className="rv-slide" aria-label={copy.exhume.aria(ex.id)} style={{
      position: 'absolute', top: 12, right: 12, bottom: 12, width: 'min(400px, 92%)', boxSizing: 'border-box', overflowY: 'auto', zIndex: 8,
      background: 'linear-gradient(180deg, #161B19 0%, #0A0E0D 60%)', border: `1px solid ${ex.color}`, borderRadius: '120px 120px 10px 10px',
      padding: '30px 22px 18px', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 0 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2, flex: 1, paddingLeft: 40 }}>
          <span style={{ fontFamily: 'var(--font-fell-sc)', fontSize: 12, letterSpacing: 5, color: '#8E9994' }}>{copy.exhume.here}</span>
          <span style={{ fontFamily: 'var(--font-fell-sc)', fontSize: 34, lineHeight: 1.05, color: '#DCD6C6', textShadow: '0 -1px 0 #000, 0 1px 0 rgba(255,255,255,0.10)' }}>{ex.id}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: 3, color: ex.color }}>{ex.status}</span>
        </div>
        <button ref={closeRef} type="button" className="rv-btn" aria-label={copy.exhume.close} onClick={onClose}
          style={{ width: 40, height: 40, flex: 'none', borderRadius: 20, border: '1px solid #3A4A45', background: '#0C1311', color: '#ECE6D6', fontSize: 18, cursor: 'pointer' }}>×</button>
      </div>
      <span style={{ fontFamily: 'var(--font-fell)', fontStyle: 'italic', fontSize: 15.5, lineHeight: 1.5, color: '#D8C8A0', textAlign: 'center' }}>“{ex.epitaph}”</span>
      <div style={{ display: 'flex', gap: 8 }}>
        {ex.crops.map((c) => (
          <figure key={c.src} style={{ margin: 0, flex: '1 1 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '1', overflow: 'hidden', borderRadius: 6, border: '1px solid #22302C', background: '#0A0F0E' }}>
              <img src={c.src} alt={c.alt} style={{ position: 'absolute', left: `${c.left.toFixed(1)}%`, top: `${c.top.toFixed(1)}%`, width: `${c.width.toFixed(1)}%`, maxWidth: 'none', height: 'auto', display: 'block' }} />
              <svg viewBox="0 0 100 100" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                <circle cx={+c.mx.toFixed(1)} cy={+c.my.toFixed(1)} r={9} style={{ fill: 'none', stroke: c.hit ? 'var(--ember)' : '#ECE6D6', strokeWidth: 1.5, strokeDasharray: '3 2' }} />
              </svg>
            </div>
            <figcaption style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#A3ADA8', textAlign: 'center' }}>{c.label}</figcaption>
          </figure>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: 2, color: '#A3ADA8' }}>{ex.chartTitle}</span>
        <svg viewBox="0 0 300 74" role="img" aria-label={ex.chartAria} style={{ width: '100%', height: 'auto', display: 'block' }}>
          {ex.band && <rect x={+ex.band.x.toFixed(1)} y={4} width={+ex.band.w.toFixed(1)} height={54} style={{ fill: '#7FE0CF', fillOpacity: 0.12 }} />}
          <path d="M0 58 H300" style={{ stroke: '#22302C', strokeWidth: 1 }} />
          <path d="M0 50.5 H300" style={{ stroke: '#4D5A55', strokeWidth: 0.8, strokeDasharray: '2 3' }} />
          <text x={298} y={48} textAnchor="end" style={{ fontFamily: 'var(--font-mono)', fontSize: 8, fill: '#7C8884' }}>15%</text>
          <path d={ex.curve} style={{ fill: 'none', stroke: '#E4EDEE', strokeWidth: 1.6, strokeLinejoin: 'round' }} />
          {ex.meltX !== null && <path d={`M${ex.meltX.toFixed(1)} 4 V58`} style={{ stroke: '#7FE0CF', strokeWidth: 1.2 }} />}
          {ex.riseX !== null && <path d={`M${ex.riseX.toFixed(1)} 58 L${(ex.riseX - 5).toFixed(1)} 46 L${(ex.riseX + 5).toFixed(1)} 46 Z`} style={{ fill: 'var(--ember)' }} />}
          <text x={0} y={71} style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, fill: '#7C8884' }}>{ex.axis[0]}</text>
          <text x={150} y={71} textAnchor="middle" style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, fill: '#7C8884' }}>{ex.axis[1]}</text>
          <text x={300} y={71} textAnchor="end" style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, fill: '#7C8884' }}>{ex.axis[2]}</text>
        </svg>
      </div>
      <ul aria-label={copy.exhume.checksAria} style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ex.checks.map((r, i) => (
          <li key={r.title} className="rv-line" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', animationDelay: `${(0.25 + i * 0.35).toFixed(2)}s` }}>
            <span className="rv-tick" aria-hidden="true" style={{
              flex: 'none', width: 24, height: 24, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600,
              animationDelay: `${(0.35 + i * 0.35).toFixed(2)}s`,
              ...(r.ok ? { background: i === 2 && !ex.tonight ? 'var(--ember)' : '#7FE0CF', color: '#050807' }
                : r.pending ? { border: '1px solid #7FE0CF', color: '#7FE0CF' } : { border: '1px solid #5D6A65', color: '#8E9994' }),
            }}>{r.mark}</span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <b style={{ fontWeight: 600, fontSize: 13 }}><span className="rv-sr">{r.ok ? 'Passed: ' : r.pending ? 'Pending: ' : 'Not met: '}</span>{r.title}</b>
              <span style={{ fontSize: 12, color: '#A3ADA8', lineHeight: 1.4 }}>{r.detail}</span>
            </span>
          </li>
        ))}
      </ul>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: '#7C8884', textAlign: 'center' }}>{ex.coords}</span>
    </section>
  );
}
