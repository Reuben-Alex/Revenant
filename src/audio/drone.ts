// Nightfall drone (design-reference.md "Sound": 55/82/110 Hz glide, 8 s). Values from the board's playDrone()
// (Main.dc.html L687–697): three voices start at 1.5× their pitch and glide down over 3 s, gain 0.18/(i+1)
// rising over 1.4 s and decaying by 8.5 s, stopped at 9 s. The third voice is a triangle.

export const DRONE = { hz: [55, 82.4, 110.5], glideFrom: 1.5, glideS: 3, peak: 0.18, attackS: 1.4, releaseS: 8.5, stopS: 9 } as const;

/** Plays once. Silent when there is no context or audio throws (Requirement 7.3). */
export function playDrone(ac: AudioContext | null): void {
  if (!ac) return;
  try {
    const t0 = ac.currentTime;
    DRONE.hz.forEach((f, i) => {
      const o = ac.createOscillator();
      o.type = i === 2 ? 'triangle' : 'sine';
      o.frequency.setValueAtTime(f * DRONE.glideFrom, t0);
      o.frequency.exponentialRampToValueAtTime(f, t0 + DRONE.glideS);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(DRONE.peak / (i + 1), t0 + DRONE.attackS);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + DRONE.releaseS);
      o.connect(g);
      g.connect(ac.destination);
      o.start(t0);
      o.stop(t0 + DRONE.stopS);
    });
  } catch {
    /* audio unavailable */
  }
}
