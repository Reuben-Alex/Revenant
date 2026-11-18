// The Gravekeeper's lines, the wager, the riddle, the lantern hunt and the verdict (spec 06). Board: Main.dc.html
// RV_INTRO_LINES L631, RV_WHISPERS L636, RV_WAGER_VERDICT L637, RV_RISE_LINES L644, checkRise lines L758–770, wager
// L1365–1371, verdict L1388–1399. Voice: .kiro/steering/gravekeeper-voice.md. Every template takes only published
// fields; lines the data can't back are replaced (spec 06 design.md, "Board-to-app decisions").
import { word } from '../data/format';

const w = (n: number) => word(n).toLowerCase();
const days = (d: number) => `${d} ${d === 1 ? 'day' : 'days'}`;
const names = (ids: string[]) => ids.join(' and ');

export const who = { keeper: 'The Gravekeeper', whisper: 'A voice under the snow' };

/** Spec 04 onNight. `n` graves of Spring 2024, scars of `scarYear`. */
export const night = (n: number, scarYear: number) =>
  `You were looking at fire scars. Look again.\nThese are graves, ${w(n)} of them, from the summer of ${scarYear}. Wager with me: mark three you think will rise.`;

export const intro = {
  /** Spring 2024 only. The record is cited: Natural Resources Canada, "Canada's record-breaking wildfires in 2023"
   *  (about 15 Mha, more than double the 1989 record); Jain et al. 2024, Nature Communications 15, "Drivers and impacts
   *  of the record-breaking 2023 wildfire season in Canada". The board's "Press play" is gone (no play button). */
  record: (n: number, scarYear: number) =>
    `Last autumn I buried ${w(n)} of them. The summer of ${scarYear} burned more of this country than any I remember.\nMark three, or just watch the snow.`,
  /** Later springs: the area comparison is of the graves shown (the largest scars in the region), from published sizes. */
  compared: (n: number, scarYear: number, gentler: boolean, km: string, kmBefore: string) =>
    `${word(n)} more, from the fires of ${scarYear}. ${gentler ? 'A gentler summer' : 'A harder summer'}: these ${w(n)} cover about ${km} km², where ${scarYear - 1}'s covered ${kmBefore}.\nLet us see whether they stay down.`,
};

export const firstThaw = (id: string) => `The snow is leaving ${id}.\nFifty days, now. If it means to rise, it will rise soon.`;

/** Beats 1–3 (board checkRise L758–762). Beat 1 names the lead only, because the day count is the lead's. */
export const beat = {
  1: (lead: string, scarYear: number, d: number) =>
    `${lead}. I buried it last autumn, under the fires of ${scarYear}. ${d === 0 ? 'The snow let go of it this very day.' : `The snow let go of it ${days(d)} ago.`}\nIt was not ready to stay down.`,
  2: (ids: string[]) => `${names(ids)} too. Each stone wakes when its own snow goes.\nMark where the hand broke through: that is where the heat came back.`,
  3: (ids: string[]) => `${names(ids)}. From here I will let them rise on their own.\nTouch any stone and I will dig it up for you.`,
};

/** Later risings, in rotation (board RV_RISE_LINES). The day count is always the named grave's own. */
export const later = [
  (ids: string[]) => `The ground gives way at ${names(ids)}.`,
  (_ids: string[], lead: string, d: number) => `Another. ${lead}, ${days(d)} after the thaw.`,
  (ids: string[]) => `${names(ids)} ${ids.length > 1 ? 'have' : 'has'} risen.`,
  (ids: string[]) => `I hear ${names(ids)} stirring. There.`,
  (ids: string[]) => `${names(ids)}. They are restless this spring.`,
] as const;

export const mine = {
  prefix: 'Your mark. ',
  line: (ids: string[]) => `Your mark, ${names(ids)}. ${ids.length > 1 ? 'They walk' : 'It walks'}. My lantern burns brighter for you.`,
};

export const lanternLit = 'Hold the lantern low. The names are still on the stones.';

/** Quiet years only (published zombie flag false). Lower case, terse. */
export const whispers = ['the dead are lying to you', 'these are only spring fires', 'nothing is buried here. nothing.', 'chance. it is only chance.'] as const;

export const wager = {
  title: "The Gravekeeper's wager",
  aria: "The Gravekeeper's wager",
  prompt: (marked: number) =>
    marked === 0 ? 'Mark three graves you think will rise this spring.'
      : marked < 3 ? `${3 - marked}${3 - marked === 1 ? ' more.' : ' more to mark.'}`
        : 'Three marked. Seal it, and we watch.',
  /** Board: "Clue: the biggest scars, where the snow leaves first." That steers with a claim the data doesn't make. */
  hint: 'Read the stones: size, latitude, thaw and early heat. Hover or focus one.',
  empty: '·  ·  ·',
  seal: 'Seal the wager',
  watch: 'Just watch',
  sealed: (ids: string[]) => `Sealed: ${ids.join(', ')}.\nNow we watch the snow.`,
  markAria: (id: string, marked: boolean) => (marked ? `Unmark grave ${id}` : `Mark grave ${id}`),
};

export const clue = {
  footprint: (km: string) => `Footprint ≈ ${km} km²`,
  latitude: (lat: string) => `${lat}°N`,
  thaw: (date: string | null) => (date ? `Snow left ${date}` : 'Snow never left'),
  early: (n: number) => (n > 0 ? `Heat on the scar before the thaw: ${n}` : 'No heat on the scar before the thaw'),
  action: (marked: boolean) => (marked ? 'Your mark · press to unmark' : 'Press to mark it'),
};

export const riddle = {
  aria: "The Gravekeeper's riddle",
  title: (id: string) => `Why did ${id} rise?`,
  sub: 'Choose the three that must all be true.',
  truths: (km: number) => [`On last year's scar, within ≈ ${km} km`, 'After the snow left the scar', 'Within 50 days of the thaw'] as const,
  decoys: [
    { text: 'Before the snow left', hint: 'Heat under the snow is not counted. The rule waits for the thaw.' },
    { text: 'The brightest heat in the region', hint: 'Brightness is not the test. Place and timing are.' },
    { text: 'Anywhere in the province', hint: "Only heat on last year's scar can be a revenant." },
  ] as const,
  dig: 'Dig',
  leave: 'Let it lie',
  chooseThree: 'Choose three.',
  solved: (id: string) => `Yes. All three, on ${id}.`,
};

export const hunt = {
  found: (id: string) => `That one is not mine. ${id} burned more than about 15 km from every scar.`,
  counter: (found: number, total: number) => `${found} of ${total} new fires found`,
  all: (total: number) => `All ${w(total)} found. Not one of them was mine.`,
  none: 'No new fires yet this spring.',
};

export const verdict = {
  kicker: (year: number) => `The verdict of spring ${year}`,
  title: (risen: number, n: number) => `${word(risen)} of ${n} rose.`,
  chance: (pct: number) => `The same shapes laid on unburned ground caught heat ${pct}% of the time.`,
  /** Board: "far more often than chance: a zombie year, after the great fires of 2023" (wrong for 2025). */
  zombie: (ratio: string, scarYear: number) => `These scars woke ${ratio} times as often as chance: a zombie year, after the fires of ${scarYear}.`,
  /** Board: "about as often as chance". Spring 2026 woke less often than chance, so: no more often. */
  quiet: 'These scars woke no more often than chance. Revenant says so, rather than cry wolf.',
  thin: (k: number) => `A thin margin: ${w(k)} fewer and I would have called it chance.`,
  wager: (k: number, ids: string[], blind: string, guess: number) =>
    `Your wager: ${w(k)} of your three walked (${ids.join(', ')}). Picking blind, you would expect ${blind}. The Gravekeeper, betting on the three largest, got ${w(guess)}.`,
  ranked: ['The dead keep their secrets from you.', 'Beginner\u2019s luck.', 'You have been here before.', 'You have the gift. Stay away from my graveyard.'] as const,
  again: 'Dig them up again',
  line: (risen: number, n: number, byChance: number, zombie: boolean) =>
    `${word(risen)} of ${w(n)} rose. Chance alone would have raised ${w(byChance)}.\n${zombie ? 'This was a zombie year.' : 'These were ordinary spring fires, not the dead walking. I do not cry wolf.'}`,
  againLine: 'Again, then. Mark three, or just watch.',
};
