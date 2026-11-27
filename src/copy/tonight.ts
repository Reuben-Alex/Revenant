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
  /** Board: "…Thirteen of them were still warm when the first snow came.\nI will be watching them in April."
   *  Revised 2026-11 (design feedback). "Still warm" is only what `late_hits_14d` measures: heat in the 14 days up to
   *  the latest data, which may be slash-pile burning, so the line says crews confirm. It makes no claim about snow
   *  on the scars or about heat right now. */
  line: (year: number, warm: number, month: string | null) =>
    warm === 0
      ? `Tonight I bury the fires of ${year}. None of them was warm in the last two weeks.\nI will watch in ${month ?? 'spring'} all the same.`
      : `Tonight I bury the fires of ${year}. ${word(warm)} of them ${warm === 1 ? 'was' : 'were'} still warm in the last two weeks.\n` +
        `${warm === 1 ? 'It may be a slash pile' : 'Some may be slash piles'}; crews confirm. I will watch in ${month ?? 'spring'}.`,
  /** The published file is `days` old; what is shown is from `through` (the latest heat data). */
  stale: (days: number, through: string) =>
    `I have heard nothing new for ${w(days)} ${days === 1 ? 'day' : 'days'}.\nWhat you see is from ${through}.`,
};

/** Keep watch, puzzle 4 (spec 07 Requirement 4). Lantern marks go only on still-warm scars, as the brief says. Every
 *  sealed line carries the slash-pile caveat and none says a fire will return (honesty.md). */
export const keep = {
  title: 'Keep watch',
  aria: 'Keep watch',
  prompt: (year: number, need: number, marked: number) =>
    marked === 0 ? `Set ${w(need)} lanterns on the scars you would watch in spring ${year}.`
      : marked < need ? `${w(need - marked)} more.` : 'Your lanterns are set. Seal the watch.',
  hint: 'Only still-warm scars can take a lantern. Hover or focus one to read it.',
  empty: '·  ·  ·',
  seal: 'Seal the watch',
  again: 'Watch again',
  save: 'Save the epitaph card',
  saving: 'Drawing the card…',
  result: (k: number, ids: string[]) =>
    `${word(k)} of your ${ids.length === 1 ? 'lantern matches' : 'lanterns match'} the ranking's top ${w(ids.length)} still-warm scars (${ids.join(', ')}).`,
  caveat: 'Late heat can be slash-pile burning; crews confirm.',
  /** The Gravekeeper's line on sealing, by the number of matches. */
  sealed: (k: number) =>
    [
      'Your lanterns stand apart from mine. Spring will show us which ground was only cooling.',
      'One of your lanterns hangs where mine does.',
      'Two of your lanterns hang where mine do.',
      'We keep the same watch, you and I.',
    ][Math.max(0, Math.min(3, k))]! + '\nLate heat can be slash-pile burning; crews confirm.',
  markAria: (id: string, on: boolean) => (on ? `Take the lantern from ${id}` : `Set a lantern on ${id}`),
};

export const clue = {
  late: (n: number) => (n > 0 ? `${n} late ${n === 1 ? 'hotspot' : 'hotspots'} in the last 14 days` : 'Cold for two weeks: nothing to watch here'),
  last: (date: string) => `Last heat ${date}`,
  snow: (pct: number) => (pct < 0 ? 'Snow now: unseen (cloud)' : `Snow now ${pct}%`),
  action: (warm: boolean, on: boolean, sealed: boolean) =>
    sealed ? 'Press to exhume' : !warm ? 'Press to exhume' : on ? 'Your lantern · press to take it down' : 'Press to set a lantern',
};

export const card = {
  kicker: (year: number) => `Keep watch · spring ${year}`,
  title: 'My lanterns',
  row: (late: number, where: string) => `${late} late ${late === 1 ? 'hotspot' : 'hotspots'} · ${where}`,
  sealedOn: (date: string) => `Sealed ${date}, from data as of that day`,
  /** Filled in when the site is hosted (spec 07 task 8). */
  site: '',
  file: (year: number) => `revenant-keep-watch-${year}.png`,
};
