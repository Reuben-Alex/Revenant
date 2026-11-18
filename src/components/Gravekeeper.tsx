// The Gravekeeper's panel (spec 06 Requirement 1). Markup and values: Main.dc.html `hasSay` L308–323 and `say` in
// renderVals() L1276–1290. The text types at 26 ms a character; the live region carries the whole line once, so
// screen readers hear it once and never the glitch. Under reduced motion the text appears whole.
import { useEffect, useState } from 'react';
import * as copy from '../copy/gravekeeper';
import { typed, type Line } from '../data/gravekeeper';
import { useReducedMotion } from '../motion/useReducedMotion';

interface Props {
  say: Line;
  /** The camera holds: sit above the letterbox (board bottom 11 %). */
  raised: boolean;
  /** Spec 06 task 6: visual-only glitch of the shown text. */
  glitch?: (s: string) => string;
}

export function Gravekeeper({ say, raised, glitch }: Props) {
  const reduced = useReducedMotion();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 40);
    return () => clearInterval(id);
  }, [say]);

  const elapsed = now - say.start;
  const shown = reduced ? say.text : typed(say.text, elapsed);
  const typing = shown.length < say.text.length;
  const progress = Math.max(0, Math.min(100, (elapsed / (say.until - say.start)) * 100));
  const whisper = say.who === 'whisper';
  const visible = glitch ? glitch(shown) : shown;

  return (
    <div className="rv-say" style={{
      position: 'absolute', left: 16, bottom: raised ? '11%' : 16, width: 'min(640px, calc(100% - 32px))', boxSizing: 'border-box',
      display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 18px 12px 14px', zIndex: 6, pointerEvents: 'none',
      background: 'linear-gradient(180deg, rgba(14,12,9,0.95), rgba(6,6,5,0.95))', border: '1px solid #4A3E2C', borderRadius: 6,
      boxShadow: '0 10px 40px rgba(0,0,0,0.7), inset 0 0 20px rgba(0,0,0,0.5)',
    }}>
      <svg width="54" height="64" viewBox="0 0 54 64" aria-hidden="true" style={{ flex: 'none' }}>
        <path d="M27 4 C14 4 8 16 8 28 C8 40 6 52 3 62 H51 C48 52 46 40 46 28 C46 16 40 4 27 4 Z" style={{ fill: '#0B0F0E', stroke: '#4D5A55', strokeWidth: 1.2 }} />
        <path d="M16 30 C16 20 21 14 27 14 C33 14 38 20 38 30 C38 38 33 43 27 43 C21 43 16 38 16 30 Z" style={{ fill: '#020303' }} />
        <circle className="rv-eyes" cx="22.5" cy="30" r="1.6" style={{ fill: 'var(--ember)' }} />
        <circle className="rv-eyes" cx="31.5" cy="30" r="1.6" style={{ fill: 'var(--ember)' }} />
        <path d="M44 44 V40 M40 46 H48 L49 58 H39 Z" style={{ fill: 'none', stroke: '#8A7A5A', strokeWidth: 1.2 }} />
        <path className="rv-candle" d="M44 56 C46 53 45.5 50 44 48.5 C42.5 50 42 53 44 56 Z" style={{ fill: '#FFB86B' }} />
      </svg>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: 1 }}>
        <span aria-hidden="true" style={{ fontFamily: 'var(--font-fell-sc)', fontSize: 13, letterSpacing: 4, color: whisper ? '#7FE0CF' : '#D8C8A0' }}>
          {whisper ? copy.who.whisper : copy.who.keeper}
        </span>
        <span aria-hidden="true" style={whisper
          ? { fontFamily: 'var(--font-mono)', fontSize: 17, lineHeight: 1.4, color: '#9FD8CC', letterSpacing: 2, whiteSpace: 'pre-line', textShadow: '2px 0 rgba(255,60,60,0.5), -2px 0 rgba(60,200,255,0.5)' }
          : { fontFamily: 'var(--font-fell)', fontStyle: 'italic', fontSize: 21, lineHeight: 1.35, color: '#F4EEE2', whiteSpace: 'pre-line', ...(glitch ? { textShadow: '2px 0 rgba(255,60,60,0.55), -2px 0 rgba(60,200,255,0.55)' } : null) }}>
          {visible}{typing && <span className="rv-cursor" style={{ color: '#D8C8A0', marginLeft: 1 }}>▌</span>}
        </span>
        <span aria-hidden="true" style={{ display: 'block', width: '100%', height: 2, background: 'rgba(216,200,160,0.15)', borderRadius: 1, overflow: 'hidden' }}>
          <span style={{ display: 'block', height: 2, background: '#D8C8A0', opacity: 0.6, width: `${progress.toFixed(1)}%` }} />
        </span>
      </span>
    </div>
  );
}

/** The panel's polite live region: the whole line, once, unglitched (Requirement 1.3). Rendered always. */
export function GravekeeperLive({ say }: { say: Line | null }) {
  return (
    <span role="status" aria-live="polite" className="rv-sr">
      {say ? `${say.who === 'whisper' ? copy.who.whisper : copy.who.keeper}: ${say.text.replace(/\n/g, ' ')}` : ''}
    </span>
  );
}
