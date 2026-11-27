// The idle hand (pure). When the lantern has been still for a while, the nearest grave that has really risen reaches
// toward it: the hand is drawn at that grave's published hotspot, turned toward the light. No risen grave, no hand.
import type { GraveView } from './derive';

export const IDLE_MS = 20000;

export interface Reach { id: string; x: number; y: number; angle: number }

export function reachFor(views: GraveView[], lx: number, ly: number): Reach | null {
  let best: GraveView | null = null;
  let bestD = Infinity;
  for (const v of views) {
    if (!v.risen) continue;
    const d = Math.hypot(v.rx - lx, v.ry - ly);
    if (d < bestD || (d === bestD && best !== null && v.id < best.id)) { best = v; bestD = d; }
  }
  if (!best) return null;
  // The hand points up (−y) when drawn; turn it toward the lantern.
  const angle = bestD < 1 ? 0 : (Math.atan2(lx - best.rx, best.ry - ly) * 180) / Math.PI;
  return { id: best.id, x: best.rx, y: best.ry, angle: +angle.toFixed(1) };
}
