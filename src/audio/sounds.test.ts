// Spec 05 Requirement 5.1: boom and crackle, bell and creak use the board's values, and stay silent without a
// context or when audio throws.
import { describe, expect, it } from 'vitest';
import { BELL, playBell } from './bell';
import { BOOM, CRACKLE, crackleNoise, playBoom } from './boom';
import { CREAK, playCreak } from './creak';
import { FakeContext, ThrowingContext, asAudio } from './fakeAudio';

const T = 5; // FakeContext.currentTime

describe('boom and crackle (board playSting)', () => {
  it('glides a sine 70 → 32 Hz over 1.6 s, peaking at 0.7, gone by 2.2 s, stopped at 2.3 s', () => {
    const ac = new FakeContext();
    playBoom(asAudio(ac), () => 0.5);
    const [osc] = ac.oscs;
    expect(osc!.type).toBe('sine');
    expect(osc!.frequency.calls).toEqual([['set', 70, T], ['exp', 32, T + 1.6]]);
    expect([osc!.started, osc!.stopped]).toEqual([[T], [T + 2.3]]);
    const boomGain = ac.gains[0]!;
    expect(boomGain.gain.calls).toEqual([['set', 0.0001, T], ['exp', 0.7, T + 0.04], ['exp', 0.0001, T + 2.2]]);
    expect(boomGain.connections).toContain(ac.destination);
    expect(BOOM.toHz).toBe(32);
  });

  it('adds 1.2 s of crackle, high-passed at 1800 Hz, gain 0.9, starting at +0.05 s', () => {
    const ac = new FakeContext();
    playBoom(asAudio(ac), () => 0.5);
    const [src] = ac.sources;
    expect(src!.buffer!.length).toBe(ac.sampleRate * 1.2);
    expect(src!.started).toEqual([T + 0.05]);
    const [hp] = ac.filters;
    expect([hp!.type, hp!.frequency.value]).toEqual(['highpass', 1800]);
    expect(ac.gains[1]!.gain.value).toBe(0.9);
    expect(ac.gains[1]!.connections).toContain(ac.destination);
    expect(CRACKLE.density).toBe(0.004);
  });

  it('makes sparse clicks that fade out', () => {
    let s = 7;
    const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const d = crackleNoise(100000, rand);
    const clicks = d.filter((v) => v !== 0).length;
    expect(clicks).toBeGreaterThan(100000 * 0.002);
    expect(clicks).toBeLessThan(100000 * 0.006);
    expect(Math.max(...d.map(Math.abs))).toBeLessThanOrEqual(1);
    expect(Math.abs(d[d.length - 1]!)).toBeLessThan(1e-4);
  });
});

describe('bell (board playBell)', () => {
  it('strikes n times, 1.05 s apart after 0.8 s, with 164 Hz partials ×1, 2.4, 3.0, 4.5', () => {
    const ac = new FakeContext();
    playBell(asAudio(ac), 3);
    expect(ac.oscs).toHaveLength(12);
    for (let i = 0; i < 3; i++) {
      const t0 = T + 0.8 + i * 1.05;
      BELL.partials.forEach(([mul, gain], j) => {
        const o = ac.oscs[i * 4 + j]!;
        const g = ac.gains[i * 4 + j]!;
        expect(o.frequency.value).toBeCloseTo(164 * mul, 9);
        expect(o.started[0]).toBeCloseTo(t0, 9);
        expect(o.stopped[0]).toBeCloseTo(t0 + 3.6, 9);
        const [set, attack, decay] = g.gain.calls as [string, number, number][];
        expect(set![1]).toBe(0.0001);
        expect(attack![1]).toBe(gain);
        expect(attack![2]).toBeCloseTo(t0 + 0.012, 9);
        expect(decay![2]).toBeCloseTo(t0 + 3.4 / (1 + j * 0.6), 9);
      });
    }
  });

  it('plays nothing for n < 1', () => {
    const ac = new FakeContext();
    playBell(asAudio(ac), 0);
    expect(ac.oscs).toHaveLength(0);
  });
});

describe('creak (board playCreak)', () => {
  it('saws 110 → 70 Hz over 0.5 s through a 600 Hz band-pass (Q 6), peaking at 0.18, gone by 0.6 s', () => {
    const ac = new FakeContext();
    playCreak(asAudio(ac));
    const [o] = ac.oscs;
    expect(o!.type).toBe('sawtooth');
    expect(o!.frequency.calls).toEqual([['set', 110, T], ['linear', 70, T + 0.5]]);
    const [bp] = ac.filters;
    expect([bp!.type, bp!.frequency.value, bp!.Q.value]).toEqual(['bandpass', 600, 6]);
    expect(ac.gains[0]!.gain.calls).toEqual([['set', 0.0001, T], ['exp', 0.18, T + 0.05], ['exp', 0.0001, T + 0.6]]);
    expect(o!.stopped).toEqual([T + 0.65]);
    expect(CREAK.q).toBe(6);
  });
});

describe('silence (Req 5.1)', () => {
  it('every sound is silent without a context and never throws', () => {
    expect(() => { playBoom(null); playBell(null, 3); playCreak(null); }).not.toThrow();
  });
  it('every sound swallows audio errors', () => {
    const ac = asAudio(new ThrowingContext());
    expect(() => { playBoom(ac); playBell(ac, 2); playCreak(ac); }).not.toThrow();
  });
});
