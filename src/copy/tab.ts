// The haunted tab: what the browser tab says while the viewer looks away from the graveyard. Each line is built
// from the graves on screen at that moment (ids and counts from the published data), in the Gravekeeper's voice.
import { word } from '../data/format';

export const icon = { day: '/icon-day.svg', night: '/icon-night.svg', haunted: '/icon-haunted.svg' };

export const away = {
  waking: (id: string) => `${id} is waking. Come back.`,
  risen: (n: number) => `${word(n)} ${n === 1 ? 'has' : 'have'} risen. Come back.`,
  buried: 'The snow still holds them. Come back.',
  rest: 'They are at rest. For now.',
  warm: (n: number) => `${word(n)} ${n === 1 ? 'scar is' : 'scars are'} still warm. I am watching.`,
  sleeping: 'They are going to sleep. I am watching.',
};
