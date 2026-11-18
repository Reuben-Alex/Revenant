// Spec 04 Requirement 7: the shared context, wind and drone use the board's values, start once, and stay silent
// when Web Audio is missing or throws. The shared fake AudioContext (fakeAudio.ts) records what each sound sets.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAudio, currentAudio, resetAudioForTests } from './context';
import { DRONE, playDrone } from './drone';
import { FakeContext } from './fakeAudio';
import { WIND, brownNoise, startWind, stopWind, windRunning } from './wind';


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
