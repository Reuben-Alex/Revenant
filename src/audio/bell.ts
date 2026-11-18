// Bell (design-reference.md "Sound": 164 Hz partials ×1, 2.4, 3.0, 4.5, 3.4 s decay). Values from the board's
// playBell() (Main.dc.html L784–797): n strikes 1.05 s apart after 0.8 s, each with four sine partials.

export const BELL = {
  hz: 164,
  partials: [[1, 0.32], [2.4, 0.16], [3.0, 0.11], [4.5, 0.05]] as const,
  firstS: 0.8,
  gapS: 1.05,
  attackS: 0.012,
  decayS: 3.4,
  stopS: 3.6,
} as const;

/** Tolls n times (n < 1 plays nothing). Silent without a context; never throws. */
export function playBell(ac: AudioContext | null, n: number): void {
  if (!ac || n < 1) return;
  try {
    for (let i = 0; i < n; i++) {
      const t0 = ac.currentTime + BELL.firstS + i * BELL.gapS;
      BELL.partials.forEach(([mul, gain], j) => {
        const o = ac.createOscillator();
        o.type = 'sine';
        o.frequency.value = BELL.hz * mul;
        const g = ac.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(gain, t0 + BELL.attackS);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + BELL.decayS / (1 + j * 0.6));
        o.connect(g);
        g.connect(ac.destination);
        o.start(t0);
        o.stop(t0 + BELL.stopS);
      });
    }
  } catch {
    /* audio unavailable */
  }
}
