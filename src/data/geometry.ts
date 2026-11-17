// SVG path geometry in grid coordinates (viewBox 0 0 1060 716), ported from Main.dc.html renderVals().

const f = (n: number) => +n.toFixed(1);

export const tombPath = (cx: number, cy: number) => `M${cx - 8} ${cy + 10} V${cy - 3} A8 8 0 0 1 ${cx + 8} ${cy - 3} V${cy + 10} Z`;
export const crossPath = (cx: number, cy: number) => `M${cx} ${cy - 5} V${cy + 5} M${cx - 3} ${cy - 1} H${cx + 3}`;
export const capPath = (cx: number, cy: number) => `M${cx - 8} ${cy - 3} A8 8 0 0 1 ${cx + 8} ${cy - 3}`;
export const steamPath = (cx: number, cy: number) =>
  `M${cx - 3} ${cy - 12} C${cx - 7} ${cy - 18} ${cx + 2} ${cy - 21} ${cx - 1} ${cy - 27}`;
export const cracksPath = (rx: number, ry: number) =>
  `M${rx - 18} ${ry + 12} L${rx - 10} ${ry + 8} L${rx - 5} ${ry + 14} M${rx + 18} ${ry + 11} L${rx + 10} ${ry + 7} L${rx + 6} ${ry + 13}`;
export const smokePath = (rx: number, ry: number) =>
  `M${rx + 3} ${ry - 14} C${rx - 7} ${ry - 24} ${rx + 10} ${ry - 32} ${rx} ${ry - 44}`;

/** Burning hand (board rvHand). */
export function handPath(rx: number, ry: number, k = 1): string {
  const p = (dx: number, dy: number) => `${f(rx + dx * k)} ${f(ry + dy * k)}`;
  return `M${p(-13, 10)} H${f(rx + 13 * k)} M${p(-7, 10)} V${f(ry + 2 * k)} H${f(rx + 7 * k)} V${f(ry + 10 * k)} ` +
    `M${p(-6, 2)} V${f(ry - 8 * k)} M${p(-2, 2)} V${f(ry - 12 * k)} M${p(2, 2)} V${f(ry - 11 * k)} M${p(6, 2)} V${f(ry - 6 * k)} M${p(-7, 4)} L${p(-12, -2)}`;
}

export const fireTriangle = (x: number, y: number) => `M${x} ${y - 8} L${x + 7} ${y + 5} L${x - 7} ${y + 5} Z`;
export const fireFlame = (x: number, y: number) =>
  `M${x} ${y - 15} C${x + 4} ${y - 11} ${x + 3} ${y - 8} ${x} ${y - 7} C${x - 3} ${y - 8} ${x - 4} ${y - 11} ${x} ${y - 15} Z`;

export const lanternIcon = (x: number, y: number) =>
  `M${x - 5} ${y - 9} H${x + 5} M${x} ${y - 13} V${y - 9} M${x - 6} ${y - 7} H${x + 6} L${x + 5} ${y + 7} H${x - 5} Z`;
export const lanternFlame = (x: number, y: number) =>
  `M${x} ${y + 4} C${x + 2.5} ${y + 1} ${x + 2} ${y - 2} ${x} ${y - 4} C${x - 2} ${y - 2} ${x - 2.5} ${y + 1} ${x} ${y + 4} Z`;
