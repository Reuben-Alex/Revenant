// Formatting helpers (ports of the board's rvFmt, rvIso, rvLat/rvLon/rvCoords, rvKm, rvRegion, RV_WORDS).

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** "Mar 21" + n days, in UTC (season day 0 = Mar 21). */
export function fmtDay(n: number, year: number): string {
  const t = new Date(Date.UTC(year, 2, 21) + Math.round(n) * 86400000);
  return `${MONTHS[t.getUTCMonth()]} ${t.getUTCDate()}`;
}

/** "2026-11-16" → "Nov 16". */
export function fmtIso(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${MONTHS[Number(m) - 1]} ${Number(d)}`;
}

export const lat = (y: number) => 60 - (y / 716) * 6;
export const lon = (x: number) => -126 + (x / 1060) * 17;

export function coords(x: number, y: number): string {
  return `${lat(y).toFixed(2)}°N  ${Math.abs(lon(x)).toFixed(2)}°W`;
}

/** Approximate area of a scar in km² (1 grid px ≈ 0.97 × 0.93 km ≈ 0.9 km² at 57° N).
 *  The board rounded to hundreds; small NBAC and Tonight scars would show "0", so rounding is
 *  by size: hundreds from 1,000 km², tens from 100 km², else whole km². */
export function km2(sizePx: number): string {
  const a = sizePx * 0.9;
  const step = a >= 1000 ? 100 : a >= 100 ? 10 : 1;
  return (Math.max(step, Math.round(a / step) * step)).toLocaleString('en-US');
}

/** BC/AB border is 120° W (x = 374 on the grid). */
export function region(x: number): string {
  return x < 374 ? 'northeast British Columbia' : 'northern Alberta';
}

const WORDS = ['None', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty', 'Twenty-one',
  'Twenty-two', 'Twenty-three', 'Twenty-four'];

export function word(n: number): string {
  return WORDS[n] ?? String(n);
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
