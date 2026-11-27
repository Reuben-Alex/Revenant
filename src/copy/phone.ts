// The field-crew phone (spec 07 Requirement 6). Board: reference/design/Phone.dc.html. The board's patrol route, "YOU",
// "NE BC PATROL", "nearest" and the research G-03 text have no data behind them; here the position appears only after
// the viewer shares it (it stays on the phone), there is no route, and every line comes from the published files.
import { word } from '../data/format';

export const header = {
  brand: 'Revenant',
  badge: (year: number) => `FIRMS · VIIRS · ${year}`,
  region: 'NE BC & N ALBERTA',
};

export const seasons = { group: 'Season', tonight: 'Tonight', spring: (y: number) => `Spring ${y}`, short: (y: number) => String(y) };

export const title = {
  tonight: (n: number) => `${word(n)} ${n === 1 ? 'scar was' : 'scars were'} still warm in the last two weeks.`,
  spring: (n: number, year: number) => `${word(n)} ${n === 1 ? 'grave' : 'graves'} rose in spring ${year}.`,
  kickerTonight: (through: string, region: string) => `${through} · ${region}`,
  kickerSpring: (year: number, region: string) => `JUL 1, ${year} · ${region}`,
};

export const map = {
  aria: (ids: string[], you: boolean) => `Map of ${ids.length ? ids.join(', ') : 'the scars'}${you ? ', and your position' : ''}`,
  you: 'YOU',
  outside: 'You are outside the map (54–60°N, 109–126°W).',
};

export const locate = {
  button: 'Use my location',
  again: 'Update my location',
  note: 'Your position stays on this phone. Revenant does not send, store or log it.',
  busy: 'Finding you…',
  denied: 'Location unavailable. The list stays in rank order.',
};

export const card = {
  nearest: (km: string) => `NEAREST · ${km} km`,
  top: 'TOP OF THE LIST',
  sent: 'SENT FROM THE DOSSIER',
  title: (id: string) => `Grave ${id}`,
  navigate: 'Navigate',
  report: 'Report what you find',
  none: 'Nothing to show for this season.',
};

export const report = {
  aria: 'Quick report',
  prompt: 'At the grave, what did you see?',
  options: ['Smoke', 'Ground heat', 'Nothing'] as const,
  share: 'Share report',
  copied: 'Copied. Paste it into your message to the agency.',
  shared: 'Shared.',
  pick: 'Choose what you saw first.',
  text: (id: string, season: string, where: string, when: string, seen: string) =>
    `Revenant · ${id} (${season}) at ${where}, ${when} UTC. Seen: ${seen}. Not an official report. Send it to your agency.`,
};

export const nav = { aria: 'Main', map: 'Map', graves: 'Graves' };

export const list = {
  title: (scene: string) => `Graves · ${scene}`,
  km: (km: string) => `${km} km`,
};

export const footer = 'NASA FIRMS · NASA GIBS/VIIRS · NBAC (NRCan) · Scholten et al. 2021';
export const method = 'Method and caveats';
export const methodHref = 'https://github.com/Reuben-Alex/Revenant/blob/main/docs/method.md';
