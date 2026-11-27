// The haunted tab: what the browser tab says while the viewer looks away from the graveyard. Each line is built
// from the graves on screen at that moment (ids and counts from the published data).

export const icon = { day: '/icon-day.svg', night: '/icon-night.svg', haunted: '/icon-haunted.svg', risen: '/icon-risen.svg' };

export const away = {
  /** Risen graves on screen: the count is the replay's own. */
  awake: (n: number) => `They are awake (${n})`,
  waking: (id: string) => `${id} is waking. Come back.`,
  buried: 'The snow still holds them. Come back.',
  rest: 'They are at rest. For now.',
  /** Tonight: nothing has risen, so the count is of scars with heat in the last 14 days. */
  warm: (n: number) => `Still warm (${n})`,
  sleeping: 'They are going to sleep. I am watching.',
};
