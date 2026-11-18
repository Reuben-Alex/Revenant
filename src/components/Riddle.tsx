// The Gravekeeper's riddle (spec 06 Requirement 5). New in the app; the board has no riddle, so the card borrows the
// wager panel's parchment and the stones' tombstone top. It is a modal dialog: it takes focus, keeps Tab inside, and
// gives focus back when it closes. Escape lets it lie.
import { useEffect, useRef, type KeyboardEvent } from 'react';
import * as copy from '../copy/gravekeeper';
import type { RiddleCard } from '../data/gravekeeper';
import { ironStyle } from './IronButton';

interface Props {
  id: string;
  cards: RiddleCard[];
  picked: string[];
  hint: string | null;
  onPick: (key: string) => void;
  onDig: () => void;
  onLeave: () => void;
}

function Mark({ on }: { on: boolean }) {
  return (
    <svg width="14" height="22" viewBox="0 0 14 22" aria-hidden="true" style={{ flex: 'none' }}>
      {on ? (
        <>
          <path d="M5 21 V10 H9 V21 Z" style={{ fill: '#E9DFC8', stroke: '#6E1E12', strokeWidth: 0.8 }} />
          <path className="rv-candle" d="M7 10 C9.5 7 8.5 4 7 2 C5.5 4 4.5 7 7 10 Z" style={{ fill: '#FFB86B' }} />
        </>
      ) : (
        <circle cx="7" cy="14" r="4" style={{ fill: 'none', stroke: '#6F6250', strokeWidth: 1.2 }} />
      )}
    </svg>
  );
}

export function Riddle({ id, cards, picked, hint, onPick, onDig, onLeave }: Props) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    box.current?.querySelector<HTMLButtonElement>('button')?.focus();
    // Give focus back; if nothing had it (the riddle opens by itself), go to the grave's own stone.
    return () => {
      const to = back && back !== document.body && document.contains(back) ? back : document.querySelector<HTMLElement>(`button[data-grave="${id}"]`);
      to?.focus();
    };
  }, [id]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') { e.preventDefault(); onLeave(); return; }
    if (e.key !== 'Tab' || !box.current) return;
    const items = [...box.current.querySelectorAll<HTMLButtonElement>('button')];
    const first = items[0], last = items[items.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(2,4,4,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, boxSizing: 'border-box' }}>
      <div ref={box} className="rv-say" role="dialog" aria-modal="true" aria-labelledby="rv-riddle-title" aria-describedby="rv-riddle-sub" onKeyDown={onKey}
        style={{
          width: 'min(560px, 100%)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8,
          padding: '28px 24px 20px', borderRadius: '48px 48px 8px 8px', border: '1px solid #5A4A32',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(42,36,24,0.98), rgba(14,12,9,0.98) 75%)',
          boxShadow: '0 16px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}>
        <span style={{ fontFamily: 'var(--font-fell-sc)', fontSize: 13, letterSpacing: 4, color: '#D8C8A0' }}>{copy.riddle.aria}</span>
        <h2 id="rv-riddle-title" style={{ margin: 0, fontFamily: 'var(--font-fell-sc)', fontWeight: 400, fontSize: 30, lineHeight: 1.1, color: '#F4EEE2' }}>{copy.riddle.title(id)}</h2>
        <span id="rv-riddle-sub" style={{ fontFamily: 'var(--font-fell)', fontStyle: 'italic', fontSize: 16, color: '#D8C8A0' }}>{copy.riddle.sub}</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, width: '100%', marginTop: 8 }}>
          {cards.map((c) => {
            const on = picked.includes(c.key);
            return (
              <button key={c.key} type="button" className="rv-btn" aria-pressed={on} onClick={() => onPick(c.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, minHeight: 56, padding: '8px 14px', boxSizing: 'border-box', cursor: 'pointer',
                  borderRadius: '18px 18px 3px 3px', textAlign: 'left',
                  border: `1px solid ${on ? '#8A5A45' : '#3A3022'}`,
                  background: on ? 'linear-gradient(180deg, #2A221C, #15110E)' : 'rgba(10,9,7,0.6)',
                  boxShadow: on ? '0 0 14px rgba(255,107,44,0.22)' : 'none',
                  fontFamily: 'var(--font-fell)', fontStyle: 'italic', fontSize: 16, lineHeight: 1.25, color: on ? '#F4E6C8' : '#D8C8A0',
                }}>
                <Mark on={on} />
                <span>{c.text}</span>
              </button>
            );
          })}
        </div>
        <span aria-live="polite" style={{ minHeight: 22, fontFamily: 'var(--font-fell)', fontStyle: 'italic', fontSize: 15, color: '#FFB86B' }}>{hint ?? ''}</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          <button type="button" className="rv-btn" onClick={onDig} style={ironStyle(true)}>{copy.riddle.dig}</button>
          <button type="button" className="rv-btn" onClick={onLeave} style={ironStyle(false)}>{copy.riddle.leave}</button>
        </div>
      </div>
    </div>
  );
}
