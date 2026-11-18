// A small fake AudioContext for tests: it records the nodes each sound creates and every value it schedules.
// Test-only; nothing in the app imports it.

export type Call = [string, ...unknown[]];

export class FakeParam {
  value = 0;
  calls: Call[] = [];
  setValueAtTime(v: number, t: number) { this.calls.push(['set', v, t]); this.value = v; }
  linearRampToValueAtTime(v: number, t: number) { this.calls.push(['linear', v, t]); }
  exponentialRampToValueAtTime(v: number, t: number) { this.calls.push(['exp', v, t]); }
}
export class FakeNode {
  connections: unknown[] = [];
  connect(n: unknown) { this.connections.push(n); return n; }
}
export class FakeOsc extends FakeNode {
  type = 'sine';
  frequency = new FakeParam();
  started: number[] = [];
  stopped: number[] = [];
  start(t = 0) { this.started.push(t); }
  stop(t = 0) { this.stopped.push(t); }
}
export class FakeGain extends FakeNode { gain = new FakeParam(); }
export class FakeFilter extends FakeNode { type = ''; frequency = new FakeParam(); Q = new FakeParam(); }
export class FakeSource extends FakeOsc { buffer: { length: number; data: Float32Array } | null = null; loop = false; }

export class FakeContext {
  static made = 0;
  state: AudioContextState = 'suspended';
  sampleRate = 100;
  currentTime = 5;
  destination = { name: 'destination' };
  oscs: FakeOsc[] = [];
  gains: FakeGain[] = [];
  filters: FakeFilter[] = [];
  sources: FakeSource[] = [];
  resumed = 0;
  constructor() { FakeContext.made++; }
  resume() { this.resumed++; this.state = 'running'; return Promise.resolve(); }
  createBuffer(_channels: number, len: number) {
    const data = new Float32Array(len);
    return { getChannelData: () => data, length: len, data };
  }
  createBufferSource() { const s = new FakeSource(); this.sources.push(s); return s; }
  createBiquadFilter() { const f = new FakeFilter(); this.filters.push(f); return f; }
  createGain() { const g = new FakeGain(); this.gains.push(g); return g; }
  createOscillator() { const o = new FakeOsc(); this.oscs.push(o); return o; }
}

/** A fake that throws on the first node it is asked for, to test that sounds fail silently. */
export class ThrowingContext extends FakeContext {
  override createOscillator(): FakeOsc { throw new Error('audio unavailable'); }
  override createBuffer(): never { throw new Error('audio unavailable'); }
}

export const asAudio = (c: FakeContext) => c as unknown as AudioContext;
