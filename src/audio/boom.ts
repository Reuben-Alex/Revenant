// Rising boom and crackle (design-reference.md "Sound": 70→32 Hz sine boom + high-pass crackle). Values from the
// board's playSting() (Main.dc.html L825–839). Silent without a context; never throws (spec 05 Requirement 5.1).

export const BOOM = { fromHz: 70, toHz: 32, glideS: 1.6, peak: 0.7, attackS: 0.04, releaseS: 2.2, stopS: 2.3 } as const;
export const CRACKLE = { lengthS: 1.2, density: 0.004, highpassHz: 1800, gain: 0.9, delayS: 0.05 } as const;

/** Sparse clicks fading out linearly, as the board fills its crackle buffer. */
export function crackleNoise(length: number, random: () => number = Math.random): Float32Array {
  const d = new Float32Array(length);
  for (let i = 0; i < length; i++) d[i] = (random() < CRACKLE.density ? random() * 2 - 1 : 0) * (1 - i / length);
  return d;
}

/** Stereo position for a grid x (0..1060): −0.8 at the west edge to 0.8 at the east, so the sound comes from the
 *  grave's side of the map without leaving one ear silent. */
export function panFor(x: number): number {
  return +Math.max(-0.8, Math.min(0.8, (x / 1060) * 1.6 - 0.8)).toFixed(3);
}

/** The node to connect sounds to: a stereo panner at `pan` when one is given and supported, else the speakers. */
function outFor(ac: AudioContext, pan: number | undefined): AudioNode {
  if (pan === undefined || typeof ac.createStereoPanner !== 'function') return ac.destination;
  const p = ac.createStereoPanner();
  p.pan.value = pan;
  p.connect(ac.destination);
  return p;
}

/** `pan` (−1 west … 1 east, from `panFor`) places the boom and crackle where the grave is. */
export function playBoom(ac: AudioContext | null, random: () => number = Math.random, pan?: number): void {
  if (!ac) return;
  try {
    const t = ac.currentTime;
    const out = outFor(ac, pan);
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(BOOM.fromHz, t);
    osc.frequency.exponentialRampToValueAtTime(BOOM.toHz, t + BOOM.glideS);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(BOOM.peak, t + BOOM.attackS);
    g.gain.exponentialRampToValueAtTime(0.0001, t + BOOM.releaseS);
    osc.connect(g);
    g.connect(out);
    osc.start(t);
    osc.stop(t + BOOM.stopS);

    const len = Math.floor(ac.sampleRate * CRACKLE.lengthS);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    buf.getChannelData(0).set(crackleNoise(len, random));
    const crackle = ac.createBufferSource();
    crackle.buffer = buf;
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = CRACKLE.highpassHz;
    const cg = ac.createGain();
    cg.gain.value = CRACKLE.gain;
    crackle.connect(hp);
    hp.connect(cg);
    cg.connect(out);
    crackle.start(t + CRACKLE.delayS);
  } catch {
    /* audio unavailable */
  }
}
