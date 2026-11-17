// Wind bed (design-reference.md "Sound": looped brown noise → low-pass 420 Hz with a 0.08 Hz LFO).
// Values from the board's startAudio() (Main.dc.html L798–820): 2 s noise buffer, LFO depth 180 Hz,
// gain ramping 0 → 0.25 over 2 s. Sound is always on (spec 04 immersion decision), so the UI never stops it.

export const WIND = { lowpassHz: 420, lfoHz: 0.08, lfoDepthHz: 180, gain: 0.25, rampS: 2, bufferS: 2 } as const;

interface Wind { src: AudioBufferSourceNode; lfo: OscillatorNode; gain: GainNode }
let wind: Wind | null = null;

export const windRunning = () => wind !== null;

/** Brown noise as the board makes it: a leaky random walk, scaled by 3.5. */
export function brownNoise(length: number, random: () => number = Math.random): Float32Array {
  const data = new Float32Array(length);
  let last = 0;
  for (let i = 0; i < length; i++) {
    last = (last + 0.02 * (random() * 2 - 1)) / 1.02;
    data[i] = last * 3.5;
  }
  return data;
}

/** Starts the wind once. A second call while it is running does nothing. Silent on any audio failure. */
export function startWind(ac: AudioContext | null): void {
  if (!ac || wind) return;
  try {
    const len = Math.floor(ac.sampleRate * WIND.bufferS);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    buf.getChannelData(0).set(brownNoise(len));
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = WIND.lowpassHz;

    const gain = ac.createGain();
    gain.gain.setValueAtTime(0, ac.currentTime);
    gain.gain.linearRampToValueAtTime(WIND.gain, ac.currentTime + WIND.rampS);

    const lfo = ac.createOscillator();
    lfo.frequency.value = WIND.lfoHz;
    const lfoGain = ac.createGain();
    lfoGain.gain.value = WIND.lfoDepthHz;
    lfo.connect(lfoGain);
    lfoGain.connect(lp.frequency);

    src.connect(lp);
    lp.connect(gain);
    gain.connect(ac.destination);
    src.start();
    lfo.start();
    wind = { src, lfo, gain };
  } catch {
    wind = null;
  }
}

/** Cleanup for tests and hot reload only; no control in the UI calls this. */
export function stopWind(): void {
  try {
    wind?.src.stop();
    wind?.lfo.stop();
  } catch {
    /* already stopped */
  }
  wind = null;
}
