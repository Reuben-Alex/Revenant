// One shared AudioContext for every sound (spec 04 Requirement 7). Created lazily, and only ever from a user
// gesture: the Night shift click. Returns null when the browser has no Web Audio or creation fails, so callers stay
// silent and the app keeps working (Requirement 7.3).

type AudioCtor = typeof AudioContext;

let ctx: AudioContext | null = null;

export function getAudio(): AudioContext | null {
  try {
    const w = globalThis as typeof globalThis & { webkitAudioContext?: AudioCtor };
    const Ctor: AudioCtor | undefined = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return null;
    if (!ctx) ctx = new Ctor();
    if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
    return ctx;
  } catch {
    return null;
  }
}

/** The context if one exists, without creating it. Lets later sounds stay silent before the first gesture. */
export function currentAudio(): AudioContext | null {
  return ctx;
}

/** Tests only: forget the shared context. */
export function resetAudioForTests(): void {
  ctx = null;
}
