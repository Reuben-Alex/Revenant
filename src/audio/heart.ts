// Heartbeat under the camera push of a rising: lub-dub pairs that quicken until the hand breaks through at
// 1.45 s (design-reference.md "Rising (beat)"), then stop. Each thump is a short low sine with a falling pitch.
// Scheduled on the audio clock from the rising's start, so no timers are involved. Silent without a context;
// never throws, like the other sounds.
export const HEART = {
  /** Start of each "lub", in seconds after the rising starts; the gaps shrink 0.5 → 0.2 s. */
  beats: [0.12, 0.62, 0.98, 1.22] as readonly number[],
  /** The "dub" follows each "lub" this much later, a little softer. */
  dubS: 0.14,
  dubGain: 0.6,
  fromHz: 62,
  toHz: 38,
  glideS: 0.12,
  peak: 0.55,
  attackS: 0.012,
  releaseS: 0.2,
} as const;

/** The thump times and gains, in seconds after `t0`. */
export function heartbeatSchedule(t0: number): { t: number; gain: number }[] {
  return HEART.beats.flatMap((b, i) => {
    const swell = HEART.peak * (0.75 + 0.25 * (i / (HEART.beats.length - 1)));
    return [{ t: t0 + b, gain: swell }, { t: t0 + b + HEART.dubS, gain: swell * HEART.dubGain }];
  });
}

export function playHeartbeat(ac: AudioContext | null): void {
  if (!ac) return;
  try {
    for (const { t, gain } of heartbeatSchedule(ac.currentTime)) {
      const osc = ac.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(HEART.fromHz, t);
      osc.frequency.exponentialRampToValueAtTime(HEART.toHz, t + HEART.glideS);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + HEART.attackS);
      g.gain.exponentialRampToValueAtTime(0.0001, t + HEART.releaseS);
      osc.connect(g);
      g.connect(ac.destination);
      osc.start(t);
      osc.stop(t + HEART.releaseS + 0.02);
    }
  } catch { /* audio unavailable */ }
}
