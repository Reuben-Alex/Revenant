// Creak when a stone is opened (design-reference.md "Sound": band-passed saw 110→70 Hz). Values from the board's
// playCreak() (Main.dc.html L841–851). Silent without a context; never throws.

export const CREAK = { fromHz: 110, toHz: 70, glideS: 0.5, bandHz: 600, q: 6, peak: 0.18, attackS: 0.05, releaseS: 0.6, stopS: 0.65 } as const;

export function playCreak(ac: AudioContext | null): void {
  if (!ac) return;
  try {
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(CREAK.fromHz, t);
    osc.frequency.linearRampToValueAtTime(CREAK.toHz, t + CREAK.glideS);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = CREAK.bandHz;
    bp.Q.value = CREAK.q;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(CREAK.peak, t + CREAK.attackS);
    g.gain.exponentialRampToValueAtTime(0.0001, t + CREAK.releaseS);
    osc.connect(bp);
    bp.connect(g);
    g.connect(ac.destination);
    osc.start(t);
    osc.stop(t + CREAK.stopS);
  } catch {
    /* audio unavailable */
  }
}
