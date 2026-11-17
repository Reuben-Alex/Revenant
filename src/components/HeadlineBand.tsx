// Headline band with counts (Main.dc.html L131–142). The headline is the page's h1. After nightfall, focus moves
// to it so keyboard and screen-reader users land in the scene (spec 04 Requirement 8.3).
import { useEffect, useRef } from 'react';

interface Props {
  headline: string;
  subline: string;
  glow: boolean;
  counts: { label: string; n: string; color: string }[];
  /** Move focus to the headline on mount (set once nightfall reaches night). */
  focusOnMount?: boolean;
}

export function HeadlineBand({ headline, subline, glow, counts, focusOnMount = false }: Props) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (focusOnMount) ref.current?.focus(); }, [focusOnMount]);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px 22px', padding: '14px 28px 12px', borderBottom: '1px solid #172120', background: '#050807' }}>
      <div role="status" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 20px' }}>
        <h1 ref={ref} tabIndex={-1} style={{ margin: 0, fontWeight: 400, outline: 'none', fontFamily: 'var(--font-fell-sc)', fontSize: 44, lineHeight: 1, letterSpacing: 2, textShadow: glow ? '0 0 18px var(--ember), 0 2px 8px #000' : '0 2px 10px #000' }}>{headline}</h1>
        <span style={{ fontFamily: 'var(--font-fell)', fontStyle: 'italic', fontSize: 18, color: '#C7CFCB' }}>{subline}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
        {counts.map((k) => (
          <span key={k.label} style={{ color: '#A3ADA8' }}>{k.label} <b style={{ color: k.color, fontWeight: 500 }}>{k.n}</b></span>
        ))}
      </div>
    </div>
  );
}
