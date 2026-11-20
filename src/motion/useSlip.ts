// Daylight slips: about every 20 s the sober agency viewer slips for a moment, then is itself again. No number
// changes. The kinds take turns: the headline smears, one marker shows as a tombstone, the map dims to night.
// One slip at a time, each a single change under 0.3 s, so nothing flashes more than once a second.
// Off under reduced motion and during dusk (the caller passes `active`).
import { useEffect, useState } from 'react';

export type SlipKind = 'text' | 'stone' | 'dim';
export interface Slip { kind: SlipKind; n: number }

export const SLIP = {
  firstMs: 14000,
  gapMs: [18000, 28000] as const,
  holdMs: { text: 240, stone: 280, dim: 160 } as Record<SlipKind, number>,
  order: ['text', 'stone', 'dim'] as const,
};

/** The headline with one letter smeared (a visual copy only; the real text stays for screen readers). */
export function smear(s: string): string {
  const i = Math.floor(s.length * 0.7);
  for (let j = i; j < s.length; j++) if (/\w/.test(s[j]!)) return s.slice(0, j) + '▓' + s.slice(j + 1);
  return s;
}

export function useSlip(active: boolean): Slip | null {
  const [slip, setSlip] = useState<Slip | null>(null);
  useEffect(() => {
    if (!active) return;
    let k = 0;
    let t: ReturnType<typeof setTimeout>;
    const next = (ms: number) => {
      t = setTimeout(() => {
        const kind = SLIP.order[k++ % SLIP.order.length]!;
        setSlip({ kind, n: Math.floor(Math.random() * 1e6) });
        t = setTimeout(() => {
          setSlip(null);
          next(SLIP.gapMs[0] + Math.random() * (SLIP.gapMs[1] - SLIP.gapMs[0]));
        }, SLIP.holdMs[kind]);
      }, ms);
    };
    next(SLIP.firstMs);
    return () => { clearTimeout(t); setSlip(null); };
  }, [active]);
  return active ? slip : null;
}
