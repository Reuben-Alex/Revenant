// Tonight's live lines (spec 07 Requirements 1–3). Board: Main.dc.html `isTonight` footer L484–490, `tonight` values
// L1403, setSeason's Tonight line L781. The board's fixed dates ("Oct 28", "about 160 nights") are built from the
// published file instead; "when the first snow came" is replaced by what `late_hits_14d` measures (the last 14 days).
import { word } from '../data/format';

const w = (n: number) => word(n).toLowerCase();

export const footer = {
  wake: 'They will wake',
  /** The middle half of the published melt days of the replay springs, laid on next spring. */
  window: (from: string, to: string, year: number) => `${from} – ${to}, ${year}`,
  pace: 'if the snow keeps the last three springs\u2019 pace',
  nights: (n: number, from: string, to: string) => `about ${n} nights from ${from} to ${to}`,
  tooFew: 'Not enough springs yet to say.',
  orbit: 'Seen from orbit',
  snapshot: (frame: string, through: string, credit: string) => `Image ${frame} · heat to ${through} · snow, last 3 days · ${credit}`,
  asOf: (date: string, time: string) => `Data as of ${date}, ${time} UTC`,
  stale: (days: number) => `Not updated for ${days} ${days === 1 ? 'day' : 'days'}`,
};

export const tab = {
  live: (through: string) => `LIVE · ${through.toUpperCase()}`,
  stale: (through: string) => `AS OF ${through.toUpperCase()}`,
};

export const keeper = {
  /** Board: "…Thirteen of them were still warm when the first snow came.\nI will be watching them in April." */
  line: (year: number, warm: number, month: string | null) =>
    `Tonight I am burying the fires of ${year}. ${word(warm)} of them ${warm === 1 ? 'was' : 'were'} still warm in the last two weeks.\n` +
    `I will be watching them in ${month ?? 'spring'}.`,
  stale: (days: number, through: string) =>
    `The satellites have not spoken to me for ${w(days)} ${days === 1 ? 'day' : 'days'}. What you see is from ${through}.`,
};
