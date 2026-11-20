// The quiet-year glitch clock (spec 06 Requirement 3.3, 3.4; board tick() `glitchy` and `glitchOn`). While `active`,
// it ticks every 110 ms and reports whether this tick is one of the 3 in 46 that glitch (0.33 s every ~5 s), with a
// seed for the character substitution. It never runs under reduced motion, and it is visual only: callers keep the
// true text in their live regions and labels.
import { useEffect, useState } from 'react';
import { glitchOn } from '../data/gravekeeper';
import { useReducedMotion } from './useReducedMotion';

export interface Glitch { on: boolean; seed: number }

const OFF: Glitch = { on: false, seed: 0 };

export function useGlitch(active: boolean): Glitch {
  const reduced = useReducedMotion();
  const run = active && !reduced;
  const [g, setG] = useState<Glitch>(OFF);
  useEffect(() => {
    if (!run) return;
    const id = setInterval(() => {
      const now = Date.now();
      const on = glitchOn(now);
      setG((p) => (on || p.on ? { on, seed: Math.floor(now / 110) } : p));
    }, 110);
    return () => { clearInterval(id); setG(OFF); };
  }, [run]);
  return run ? g : OFF;
}
