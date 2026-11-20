// The Gravekeeper's gaze: his eyes turn toward the pointer, at most `max` SVG units inside the hood. Under reduced
// motion they stay still. The last pointer position is kept between panels, so a new line opens already looking.
import { useEffect, useState, type RefObject } from 'react';

let last: { x: number; y: number } | null = null;

/** Offset toward (px, py) from the eye centre (cx, cy), in screen px; full turn at `reach` px away. */
export function gazeOffset(cx: number, cy: number, px: number, py: number, max: { x: number; y: number }, reach = 320) {
  const dx = px - cx, dy = py - cy;
  const d = Math.hypot(dx, dy);
  if (d < 1) return { x: 0, y: 0 };
  const k = Math.min(1, d / reach) / d;
  return { x: +(dx * k * max.x).toFixed(2), y: +(dy * k * max.y).toFixed(2) };
}

export function useGaze(ref: RefObject<SVGSVGElement | null>, eye: { x: number; y: number; w: number; h: number }, max: { x: number; y: number }, off: boolean) {
  const [g, setG] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (off) return;
    let raf = 0;
    const aim = () => {
      raf = 0;
      const el = ref.current;
      if (!el || !last) return;
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      const next = gazeOffset(r.left + (eye.x / eye.w) * r.width, r.top + (eye.y / eye.h) * r.height, last.x, last.y, max);
      setG((p) => (p.x === next.x && p.y === next.y ? p : next));
    };
    const move = (e: PointerEvent) => {
      last = { x: e.clientX, y: e.clientY };
      if (!raf) raf = requestAnimationFrame(aim);
    };
    raf = requestAnimationFrame(aim);
    window.addEventListener('pointermove', move, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      if (raf) cancelAnimationFrame(raf);
    };
  // `eye` and `max` are module constants at the call site, so they are stable.
  }, [ref, eye, max, off]);
  return off ? { x: 0, y: 0 } : g;
}
