// The Keep watch epitaph card (spec 07 Requirement 4.5): a 1200 × 630 PNG drawn in the browser from `cardLines`,
// then downloaded. Nothing is uploaded. The card draws only the strings it is given.
import type { CardLines } from '../data/tonight';

export const CARD_W = 1200;
export const CARD_H = 630;

const SC = "'IM Fell English SC', Georgia, serif";
const FELL = "'IM Fell English', Georgia, serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number): number {
  const words = text.split(' ');
  let lineText = '';
  for (const w of words) {
    const test = lineText ? `${lineText} ${w}` : w;
    if (ctx.measureText(test).width > maxW && lineText) {
      ctx.fillText(lineText, x, y);
      lineText = w;
      y += lineH;
    } else lineText = test;
  }
  if (lineText) ctx.fillText(lineText, x, y);
  return y + lineH;
}

function flame(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#FFB86B';
  ctx.beginPath();
  ctx.moveTo(x, y + 10);
  ctx.bezierCurveTo(x + 6, y + 3, x + 5, y - 4, x, y - 9);
  ctx.bezierCurveTo(x - 5, y - 4, x - 6, y + 3, x, y + 10);
  ctx.fill();
}

/** Draws the card and returns it as a PNG Blob. Waits for the night fonts so the card is not drawn in Georgia. */
export async function drawEpitaphCard(lines: CardLines): Promise<Blob> {
  await Promise.all([`56px ${SC}`, `italic 20px ${FELL}`, `16px ${MONO}`].map((f) => document.fonts.load(f).catch(() => [])));
  const c = document.createElement('canvas');
  c.width = CARD_W;
  c.height = CARD_H;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');

  ctx.fillStyle = '#050807';
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  const glow = ctx.createRadialGradient(600, 600, 20, 600, 600, 520);
  glow.addColorStop(0, 'rgba(255,107,44,0.30)');
  glow.addColorStop(1, 'rgba(255,107,44,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // The stone: the grave cards' arch (border-radius 70 70 4 4), scaled up.
  const x0 = 270, x1 = 930, y0 = 34, y1 = 580, r = 200;
  ctx.beginPath();
  ctx.moveTo(x0, y1);
  ctx.lineTo(x0, y0 + r);
  ctx.arcTo(x0, y0, x0 + r, y0, r);
  ctx.lineTo(x1 - r, y0);
  ctx.arcTo(x1, y0, x1, y0 + r, r);
  ctx.lineTo(x1, y1);
  ctx.closePath();
  const stone = ctx.createLinearGradient(0, y0, 0, y1);
  stone.addColorStop(0, '#1A201E');
  stone.addColorStop(0.65, '#111614');
  stone.addColorStop(1, '#0B0F0E');
  ctx.fillStyle = stone;
  ctx.fill();
  ctx.strokeStyle = '#7A4A34';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#FF6B2C';
  ctx.fillRect(220, y1, 760, 3);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#D8C8A0';
  ctx.font = `20px ${SC}`;
  ctx.fillText(lines.kicker.split('').join(String.fromCharCode(8202)), 600, 112);
  ctx.fillStyle = '#F4EEE2';
  ctx.font = `52px ${SC}`;
  ctx.fillText(lines.title, 600, 172);

  let y = 236;
  for (const row of lines.rows) {
    ctx.font = `30px ${SC}`;
    flame(ctx, 600 - ctx.measureText(row.id).width / 2 - 26, y - 10);
    ctx.fillStyle = '#F4E6C8';
    ctx.fillText(row.id, 600, y);
    ctx.fillStyle = '#A3ADA8';
    ctx.font = `15px ${MONO}`;
    ctx.fillText(row.line, 600, y + 24);
    y += 70;
  }

  ctx.fillStyle = '#E6D6AE';
  ctx.font = `italic 20px ${FELL}`;
  y = wrap(ctx, lines.result, 600, y + 6, 560, 26);
  ctx.fillStyle = '#E8A07A';
  ctx.font = `italic 18px ${FELL}`;
  y = wrap(ctx, lines.caveat, 600, y + 2, 560, 24);
  ctx.fillStyle = '#8E9994';
  ctx.font = `13px ${MONO}`;
  ctx.fillText(lines.sealed, 600, Math.max(y + 8, 548));

  ctx.fillStyle = '#7C8884';
  ctx.font = `12px ${MONO}`;
  ctx.fillText([lines.credit, lines.site].filter(Boolean).join(' · '), 600, 614);

  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encoding failed'))), 'image/png'));
}

/** Saves a Blob as a file through a temporary object URL. */
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
