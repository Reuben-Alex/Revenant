// The title card between dusk and night (spec 04 Requirement 5). Markup and values: Main.dc.html `intro`
// L574–583. It has no controls, because the opening can't be skipped (Requirement 6.2). The card itself takes
// focus, so screen readers announce it and Tab can't reach the hidden daylight view.
import { useEffect, useRef } from 'react';
import * as copy from '../copy/daylight';

interface Props {
  staticLine: string;
}

const MONO = { fontFamily: 'var(--font-mono)', fontSize: 15, color: '#7C8884' } as const;
const FELL = { fontFamily: 'var(--font-fell)', fontStyle: 'italic', fontSize: 54, lineHeight: 1.1 } as const;

export function TitleCard({ staticLine }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  return (
    <div ref={ref} tabIndex={-1} className="rv-intro" role="dialog" aria-modal="true" aria-label={copy.title.aria} aria-describedby="rv-title-lines"
      style={{
        position: 'fixed', inset: 0, zIndex: 24, background: '#020303', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'flex-start', padding: '0 12%', gap: 14, boxSizing: 'border-box', outline: 'none',
      }}>
      <div id="rv-title-lines" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14 }}>
        <span className="rv-line" style={{ ...MONO, animationDelay: '0.2s' }}>{copy.title.line1}</span>
        <span className="rv-line" style={{ ...MONO, animationDelay: '0.8s' }}>{staticLine}<span className="rv-cursor" aria-hidden="true">_</span></span>
        <span className="rv-line" style={{ ...FELL, color: 'var(--bone)', marginTop: 24, animationDelay: '1.6s' }}>{copy.title.line3}</span>
        <span className="rv-line" style={{ ...FELL, color: 'var(--ember)', animationDelay: '2.8s' }}>{copy.title.line4}</span>
      </div>
    </div>
  );
}
