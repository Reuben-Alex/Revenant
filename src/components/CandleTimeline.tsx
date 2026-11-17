// Footer: play, speeds, date, and the candle timeline (Main.dc.html L440–483; candle, band, riseMarks
// from renderVals() L1203–1268, L1393–1399).
import * as copy from '../copy/graveyard';
import type { Speed } from '../data/derive';
import { ironStyle } from './IronButton';

interface Mark { id: string; pct: number; done: boolean; h: number; label: string }
interface Band { left: number; width: number; end: number; startLabel: string; endLabel: string }

interface Props {
  playing: boolean;
  speed: Speed;
  day: number;
  dateLabel: string;
  subLabel: string;
  marks: Mark[];
  band: Band | null;
  onPlay: () => void;
  onSpeed: (s: Speed) => void;
  onScrub: (day: number) => void;
}

export function CandleTimeline(p: Props) {
  const pct = (p.day / 102) * 100;
  return (
    <>
      <button type="button" className="rv-btn" aria-label={p.playing ? copy.footer.pause : copy.footer.play} onClick={p.onPlay} style={{
        width: 50, height: 50, borderRadius: 25, border: '1px solid #4A4236', background: 'radial-gradient(circle at 35% 30%, #3A332A, #14110E 70%)',
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 0 #000, 0 0 16px rgba(255,184,107,${p.playing ? '0.25' : '0.08'})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none',
      }}>
        {p.playing
          ? <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 2 V12 M11 2 V12" style={{ stroke: '#ECE6D6', strokeWidth: 2.4, strokeLinecap: 'round' }} /></svg>
          : <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.5 L12.5 7 L3 12.5 Z" style={{ fill: '#ECE6D6' }} /></svg>}
      </button>
      <div role="group" aria-label={copy.footer.speedGroup} style={{ display: 'flex', gap: 4, flex: 'none' }}>
        {(['0.5', '1', '2'] as const).map((k) => (
          <button key={k} type="button" className="rv-btn" aria-pressed={p.speed === k} onClick={() => p.onSpeed(k)}
            style={{ ...ironStyle(p.speed === k), padding: '0 12px', minWidth: 46, justifyContent: 'center' }}>{copy.footer.speed[k]}</button>
        ))}
      </div>
      {/* fixed width (board: min-width 160) so the candle doesn't shift as the date's width changes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: '0 0 200px' }}>
        <span style={{ fontFamily: 'var(--font-fell-sc)', fontSize: 24 }}>{p.dateLabel}</span>
        <span style={{ fontFamily: 'var(--font-fell)', fontStyle: 'italic', fontSize: 13, color: '#A3ADA8' }}>{p.subLabel}</span>
      </div>
      <div style={{ flex: '1 1 420px', minWidth: 260, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ position: 'relative', height: 16, fontFamily: 'var(--font-fell)', fontStyle: 'italic', fontSize: 13 }}>
          {p.band && <span style={{ position: 'absolute', left: `${p.band.left}%`, color: '#7FE0CF', whiteSpace: 'nowrap' }}>{p.band.startLabel}</span>}
          {p.band && p.band.endLabel && <span style={{ position: 'absolute', left: `${p.band.end}%`, transform: 'translateX(-100%)', color: '#7FE0CF', whiteSpace: 'nowrap' }}>{p.band.endLabel}</span>}
        </div>
        <div style={{ position: 'relative', height: 54 }}>
          {p.band && <div aria-hidden="true" style={{ position: 'absolute', left: `${p.band.left}%`, width: `${p.band.width}%`, top: 16, height: 22, borderRadius: 11, background: 'radial-gradient(ellipse at center, rgba(127,224,207,0.28), rgba(127,224,207,0) 70%)' }} />}
          <div aria-hidden="true" style={{ position: 'absolute', left: 0, width: `${pct.toFixed(2)}%`, top: 29, height: 4, borderRadius: 2, background: 'linear-gradient(180deg, #5E5240, #2E281E)' }} />
          <div aria-hidden="true" style={{ position: 'absolute', left: `${pct.toFixed(2)}%`, right: 0, top: 20, height: 13, borderRadius: '2px 6px 6px 2px', background: 'linear-gradient(180deg, #F2EAD6 0%, #DCD0B0 50%, #B4A57E 100%)', boxShadow: 'inset 0 -2px 3px rgba(0,0,0,0.25), 0 0 12px rgba(255,200,130,0.12)' }} />
          {p.marks.map((m) => (
            <div key={m.id} title={m.label} style={m.done
              ? { position: 'absolute', left: `${m.pct.toFixed(2)}%`, top: 31, width: 6, height: m.h, marginLeft: -3, borderRadius: '1px 1px 4px 4px / 1px 1px 7px 7px', background: 'linear-gradient(180deg, #7A2416, var(--ember))', boxShadow: '0 0 6px rgba(255,107,44,0.5)', pointerEvents: 'none' }
              : { position: 'absolute', left: `${m.pct.toFixed(2)}%`, top: 21, width: 2, height: 6, marginLeft: -1, background: '#8A3A22', opacity: 0.55, pointerEvents: 'none' }} />
          ))}
          <div aria-hidden="true" style={{ position: 'absolute', left: `${pct.toFixed(2)}%`, top: 0, width: 140, height: 54, transform: 'translateX(-50%)', pointerEvents: 'none', background: 'radial-gradient(ellipse at center, rgba(255,184,107,0.32), rgba(255,184,107,0) 68%)' }} />
          <svg width="18" height="30" viewBox="0 0 18 30" aria-hidden="true" style={{ position: 'absolute', left: `${pct.toFixed(2)}%`, top: -5, marginLeft: -9, pointerEvents: 'none', filter: 'drop-shadow(0 0 6px rgba(255,170,80,0.8))' }}>
            <path className="rv-candle" d="M9 2 C14 9 15 15 12.5 20 C11.4 22.6 6.6 22.6 5.5 20 C3 15 4 9 9 2 Z" style={{ fill: '#FFB86B' }} />
            <path className="rv-candle" d="M9 9 C11.5 13 11.8 16 10.6 19 C9.9 20.4 8.1 20.4 7.4 19 C6.2 16 6.5 13 9 9 Z" style={{ fill: '#FFF1C9' }} />
            <path d="M9 21 V26" style={{ stroke: '#2A2218', strokeWidth: 1.6 }} />
          </svg>
          <label htmlFor="rv-day" className="rv-sr">{copy.footer.scrub}</label>
          <input id="rv-day" className="rv-range" type="range" min={0} max={102} step={1} value={p.day} aria-valuetext={p.dateLabel}
            onChange={(e) => p.onScrub(Number(e.target.value))}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, width: '100%', height: 54, margin: 0, opacity: 0, cursor: 'pointer' }} />
          <div className="rv-knob" aria-hidden="true" style={{ position: 'absolute', left: `${pct.toFixed(2)}%`, top: 14, width: 1, height: 1, pointerEvents: 'none' }} />
        </div>
        <div style={{ position: 'relative', height: 16, fontFamily: 'var(--font-fell-sc)', fontSize: 13, color: '#8E9994' }}>
          {copy.footer.months.map(([label, at]) => (
            <span key={label} style={at === 100 ? { position: 'absolute', right: 0 } : { position: 'absolute', left: `${at}%` }}>{label}</span>
          ))}
        </div>
      </div>
    </>
  );
}
