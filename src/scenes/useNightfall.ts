// The opening's phase machine (spec 04 design.md, "Phase machine"): day → dusk (3.2 s) → title (6 s) → night.
// Board: Main.dc.html nightfall() L676, with timers _duskA (3200 ms) and _duskB (3200 + 6000 ms).
// There is no skip event: once nightfall starts it always runs to night (immersion decision, Requirement 6).
import { useCallback, useEffect, useReducer, useRef } from 'react';

export type Phase = 'day' | 'dusk' | 'title' | 'night';
export type NightfallEvent = 'nightfall' | 'duskDone' | 'titleDone';

export const PHASES: readonly Phase[] = ['day', 'dusk', 'title', 'night'];
export const DUSK_MS = 3200;
export const TITLE_MS = 6000;

const NEXT: Record<NightfallEvent, [from: Phase, to: Phase]> = {
  nightfall: ['day', 'dusk'],
  duskDone: ['dusk', 'title'],
  titleDone: ['title', 'night'],
};

/** Each event moves exactly one step, and only from its own phase. Anything else is ignored. */
export function nightfallReducer(phase: Phase, event: NightfallEvent): Phase {
  const [from, to] = NEXT[event];
  return phase === from ? to : phase;
}

/** Dev server only: `?intro=0` starts at night for screenshot checks (Requirement 1.2). */
export function initialPhase(search: string, dev: boolean): Phase {
  return dev && new URLSearchParams(search).get('intro') === '0' ? 'night' : 'day';
}

interface Options {
  /** Seam for specs 05 and 06 (sting, bell, the Gravekeeper's nightfall line). Fires once, when the timers reach night. */
  onNight?: () => void;
}

export function useNightfall({ onNight }: Options = {}) {
  // In production `import.meta.env.DEV` is the literal `false`, so this folds to 'day' and the URL is never read.
  const [phase, dispatch] = useReducer(nightfallReducer, undefined,
    (): Phase => (import.meta.env.DEV ? initialPhase(window.location.search, true) : 'day'));

  const cb = useRef(onNight);
  useEffect(() => { cb.current = onNight; });
  const startedAtNight = useRef(phase === 'night');
  const fired = useRef(false);

  useEffect(() => {
    if (phase === 'dusk') {
      const t = setTimeout(() => dispatch('duskDone'), DUSK_MS);
      return () => clearTimeout(t);
    }
    if (phase === 'title') {
      const t = setTimeout(() => dispatch('titleDone'), TITLE_MS);
      return () => clearTimeout(t);
    }
    if (phase === 'night' && !startedAtNight.current && !fired.current) {
      fired.current = true;
      cb.current?.();
    }
    return undefined;
  }, [phase]);

  const nightfall = useCallback(() => dispatch('nightfall'), []);
  return { phase, nightfall };
}
