// Spec 04 Requirement 7: the shared context, wind and drone use the board's values, start once, and stay silent
// when Web Audio is missing or throws. A small fake AudioContext records what each sound sets.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAudio, currentAudio, resetAudioForTests } from './context';
import { DRONE, playDrone } from './drone';
import { WIND, brownNoise, startWind, stopWind, windRunning } from './wind';

type Call = [string, ...unknown[]];

class FakeParam {
  value = 0;
  calls: Call[] = [];
  setValueAtTime(v: number, t: number) { this.calls.push(['set', v, t]); this.value = v; }
  linearRampToValueAtTime(v: number, t: number) { this.calls.push(['linear', v, t]); }
  exponentialRampToValueAtTime(v: number, t: number) { this.calls.push(['exp', v, t]); }
}
class FakeNode {
  connections: unknown[] = [];
  connect(n: unknown) { this.connections.push(n); return n; }
}
class FakeOsc extends FakeNode {
  type = 'sine'; frequency = new FakeParam(); started: number[] = []; stopped: number[] = [];
  start(t = 0) { this.started.push(t); }
  stop(t = 0) { this.stopped.push(t); }
}
class FakeGain extends FakeNode { gain = new FakeParam(); }
class FakeFilter extends FakeNode { type = ''; frequency = new FakeParam(); }
class FakeSource extends FakeOsc { buffer: unknown = null; loop = false; }

class FakeContext {
  static made = 0;
  state: AudioContextState = 'suspended';
  sampleRate = 100;
  currentTime = 5;
  destination = { name: 'destination' };
  oscs: FakeOsc[] = []; gains: FakeGain[] = []; filters: FakeFilter[] = []; sources: FakeSource[] = [];
  resumed = 0;
  constructor() { FakeContext.made++; }
  resume() { this.resumed++; this.state = 'running'; return Promise.resolve(); }
  createBuffer(_c: number, len: number) { const d = new Float32Array(len); return { getChannelData: () => d, length: len }; }
  createBufferSource() { const s = new FakeSource(); this.sources.push(s); return s; }
  createBiquadFilter() { const f = new FakeFilter(); this.filters.push(f); return f; }
  createGain() { const g = new FakeGain(); this.gains.push(g); return g; }
  createOscillator() { const o = new FakeOsc(); this.oscs.push(o); return o; }
}

function installFake() {
  FakeContext.made = 0;
  vi.stubGlobal('AudioContext', FakeContext);
  return () => getAudio() as unknown as FakeContext;
}

afterEach(() => {
  stopWind();
  resetAudioForTests();
  vi.unstubAllGlobals();
});

describe('shared AudioContext (Req 7.2, 7.3)', () => {
  it('returns null without Web Audio, and the sounds stay silent', () => {
    vi.stubGlobal('AudioContext', undefined);
    expect(getAudio()).toBeNull();
    expect(() => { startWind(getAudio()); playDrone(getAudio()); }).not.toThrow();
    expect(windRunning()).toBe(false);
  });

  it('returns null when creating the context throws', () => {
    vi.stubGlobal('AudioContext', class { constructor() { throw new Error('blocked'); } });
    expect(getAudio()).toBeNull();
  });

  it('creates one context lazily, resumes it, and reuses it', () => {
    const ctx = installFake();
    expect(currentAudio()).toBeNull();
    const a = ctx();
    const b = ctx();
    expect(a).toBe(b);
    expect(FakeContext.made).toBe(1);
    expect(a.resumed).toBe(1);
    expect(currentAudio()).toBe(a);
  });
});

describe('wind (Req 7.2)', () => {
  it('uses the board values: looped 2 s brown noise, low-pass 420 Hz, 0.08 Hz LFO of ±180 Hz, ramp to 0.25 over 2 s', () => {
    const ac = installFake()();
    startWind(ac as unknown as AudioContext);
    expect(windRunning()).toBe(true);
    const [src] = ac.sources;
    expect(src!.loop).toBe(true);
    expect((src!.buffer as { length: number }).length).toBe(ac.sampleRate * WIND.bufferS);
    const [lp] = ac.filters;
    expect([lp!.type, lp!.frequency.value]).toEqual(['lowpass', 420]);
    const [lfo] = ac.oscs;
    expect(lfo!.frequency.value).toBe(0.08);
    const [out, depth] = ac.gains;
    expect(depth!.gain.value).toBe(180);
    expect(depth!.connections).toContain(lp!.frequency);
    expect(out!.gain.calls).toEqual([['set', 0, 5], ['linear', 0.25, 7]]);
    expect(out!.connections).toContain(ac.destination);
    expect(src!.started).toHaveLength(1);
    expect(lfo!.started).toHaveLength(1);
  });

  it('starts only once: a second call while running adds no nodes', () => {
    const ac = installFake()();
    startWind(ac as unknown as AudioContext);
    startWind(ac as unknown as AudioContext);
    expect(ac.sources).toHaveLength(1);
  });

  it('makes bounded brown noise', () => {
    let s = 1;
    const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const d = brownNoise(10000, rand);
    expect(Math.max(...d.map(Math.abs))).toBeLessThan(3.5);
  });
});

describe('drone (Req 7.2)', () => {
  it('plays three voices at 55 / 82.4 / 110.5 Hz, gliding from 1.5× over 3 s, gain 0.18/(i+1), gone by 8.5 s, stopped at 9 s', () => {
    const ac = installFake()();
    playDrone(ac as unknown as AudioContext);
    expect(ac.oscs.map((o) => o.type)).toEqual(['sine', 'sine', 'triangle']);
    ac.oscs.forEach((o, i) => {
      const f = DRONE.hz[i]!;
      expect(o.frequency.calls).toEqual([['set', f * 1.5, 5], ['exp', f, 8]]);
      expect(o.started).toEqual([5]);
      expect(o.stopped).toEqual([14]);
    });
    ac.gains.forEach((g, i) => {
      expect(g.gain.calls).toEqual([['set', 0.0001, 5], ['exp', 0.18 / (i + 1), 6.4], ['exp', 0.0001, 13.5]]);
      expect(g.connections).toContain(ac.destination);
    });
  });
});
