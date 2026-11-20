// Every visible string of the night graveyard scene (spec 03, Requirement 19).
// Board text from reference/design/Main.dc.html, with research-only claims replaced by templates
// over published values (spec 03 design.md, "Board-to-app decisions"). Templates take only values
// read from public/data/*.json.
import { fmtDay, fmtIso, km2, lat, region, word } from '../data/format';

export const brand = {
  name: 'Revenant',
  tagline: 'What burned last summer is not always dead.',
};

export const buttons = {
  lantern: 'Lantern',
  compare: 'Before / after',
  night: (on: boolean) => (on ? 'Night view' : 'True colour'),
};

export const tabs = {
  replay: (year: number) => `Spring ${year}`,
  replaySub: (risen: number, graves: number) => `${risen} OF ${graves} ROSE`,
  tonight: 'Tonight',
  tonightMissing: 'NO LIVE DATA YET',
};

export const stateLabel = {
  buried: 'BURIED',
  waking: 'WAKING',
  restless: 'RESTLESS',
  risen: 'RISEN',
  rest: 'LAID TO REST',
  tonightBuried: 'BURIED',
  settling: 'SNOW SETTLING',
  warm: 'STILL WARM',
  open: 'UNBURIED',
  unseen: 'SNOW UNSEEN',
};

export const headline = {
  risen: (n: number) => `${word(n)} ${n === 1 ? 'has' : 'have'} risen.`,
  risenSub: (waking: number, buried: number, rest: number) =>
    `${word(waking)} waking · ${word(buried)} still under snow · ${word(rest)} at rest`,
  waking: 'They are waking.',
  wakingSub: (n: number) => `${word(n)} ${n === 1 ? 'scar has lost its' : 'scars have lost their'} snow.`,
  asleep: 'They are asleep.',
  asleepSub: (year: number, bare: number, graves: number) =>
    `Spring ${year} · ` + (bare > 0 ? `${word(bare)} ${bare === 1 ? 'scar' : 'scars'} already bare` : `all ${graves} scars of ${year - 1} lie under snow`),
  tonight: 'They are going to sleep.',
  tonightSub: (warm: number, scars: number, year: number, buried: number) =>
    `${word(warm)} of ${scars} scars of ${year} showed heat in the last two weeks. ${word(buried)} already lie under snow.`,
};

export const counts = {
  buried: 'Buried',
  waking: 'Waking',
  risen: 'Risen',
  rest: 'Laid to rest',
  settling: 'Snow settling',
  warm: 'Still warm',
  clusters: 'Heat clusters, 7 days',
};

export const callout = {
  graveTitle: (id: string) => `Grave ${id}`,
  risen1: (year: number, riseDay: number) => `Hotspot on its ${year - 1} scar, ${fmtDay(riseDay, year)}`,
  risen2: (days: number) => (days === 0 ? 'Rose the same day the snow left' : `Rose ${days} ${days === 1 ? 'day' : 'days'} after the snow left`),
  waking1: (year: number, melt: number, since: number) => `Snow left ${fmtDay(melt, year)} · day ${since} of 50`,
  waking2: 'No heat on the scar yet',
  rest1: (year: number, melt: number) => `Window closed ${fmtDay(melt + 50, year)}`,
  rest2: 'No heat on the scar in time',
  buried1: 'Snow still covers the scar',
  buried2: (year: number, melt: number) => (melt >= 0 ? `Satellite sees it clear ${fmtDay(melt, year)}` : 'The satellite never saw it clear this spring'),
  fireStatus: 'NOT A REVENANT',
  fireTitle: (id: string) => `New fire ${id}`,
  fire1: (year: number, day: number) => `First heat ${fmtDay(day, year)}, ${year}`,
  fire2: (year: number) => `More than ~15 km from any ${year - 1} scar`,
  tonight1: (year: number, lastBurn: string) => `Burned ${year} · last heat ${fmtIso(lastBurn)}`,
  // Late heat comes first and always carries the caveat (honesty.md: slash piles; crews confirm).
  tonight2: (snow: number, late: number) =>
    late > 0 ? `${late} late hotspots · crews confirm` : snow < 0 ? 'Snow on the scar: unseen (cloud)' : snow >= 15 ? `Snow on the scar: ${snow}%` : 'No snow on the scar yet',
};

export const tooltip = {
  title: (id: string, label: string) => `${id} · ${label.toLowerCase()}`,
  line: (size: number, cy: number, burned: number) => `Footprint ~${km2(size)} km² · ${lat(cy).toFixed(1)}°N · burned ${burned}`,
  action: 'Click to exhume',
};

export const list = {
  title: 'Graves to visit',
  sub: (year: number) => `scars of summer ${year - 1}`,
  tonightTitle: '2027 watch list',
  tonightSub: 'ranked by size and late heat · a guide, not a forecast',
  here: 'Here lies',
  epBuried: (year: number) => `Burned summer ${year - 1} · sleeping`,
  epRest: (year: number) => `Burned summer ${year - 1} · at rest`,
  epStirred: (year: number, melt: number) => `Burned summer ${year - 1} · stirred ${fmtDay(melt, year)}`,
  dayRisen: (year: number, day: number) => `rose ${fmtDay(day, year)}`,
  dayWaking: (since: number) => `day ${since} / 50`,
  dayRest: 'closed',
  dayBuried: 'under snow',
  epTonight: (rank: number, year: number, lastBurn: string) => `#${rank} · burned ${year} · last heat ${fmtIso(lastBurn)}`,
  dayTonight: (snow: number, late: number) => (snow >= 15 ? `snow ${snow}%` : late > 0 ? `${late} late hotspots` : 'cold'),
};

export const register = {
  title: 'The Parish Register',
  sub: 'of how often the dead walk',
  row: (risen: number, chance: number, graves: number) => `${risen} rose · ${Math.round(chance * graves)} by chance`,
  aria: 'The parish register: how often the dead walk',
  /** Built from the published zombie flags, never a fixed claim. */
  note: (zombieYears: number[]) => {
    const head = 'Red ink: graves that rose. Faint ink: what chance alone would raise, the same shapes laid on unburned ground. ';
    if (zombieYears.length === 0) return head + 'No spring beats chance, and Revenant says so.';
    if (zombieYears.length === 1) return head + `Only spring ${zombieYears[0]} beats chance.`;
    const last = zombieYears[zombieYears.length - 1];
    return head + `Springs ${zombieYears.slice(0, -1).join(', ')} and ${last} beat chance.`;
  },
};

export const legend = {
  title: 'Every symbol is a rule',
  scar: (year: number) => ['Scar', `burned area mapped by NBAC (NRCan), ${year - 1}`] as const,
  buried: ['Buried', 'snow has not yet left the scar for a week'] as const,
  waking: ['Waking', 'snow gone, inside the 50-day window'] as const,
  risen: (km: number) => ['Risen', `hotspot within ≈ ${km} km of the scar, in the window`] as const,
  fire: ['New fire', 'hotspot more than ~15 km from every scar'] as const,
  rest: ['Laid to rest', '50 days passed with no heat'] as const,
  tonightScar: (year: number) => ['Scar', `where VIIRS saw fire, May–Oct ${year}`] as const,
  tonightBuried: ['Buried', 'snow cover on the scar ≥ 50%'] as const,
  tonightWarm: ['Still warm', 'heat on the scar in the last 14 days'] as const,
  tonightHotspot: (from: string, to: string) => ['Hotspot', `VIIRS heat, ${fmtIso(from)}–${fmtIso(to)}, flares removed`] as const,
  staticNote: (n: number) =>
    `${n} places FIRMS flags as static heat (gas flares, plants) are ignored. White cloud is a blind spot: the satellite cannot see heat beneath it.`,
  tonightStaticNote: (n: number) =>
    `${n} recurring heat spots (gas flares, plants) seen in 3 of the last 4 years are ignored. White cloud is a blind spot: the satellite cannot see heat beneath it.`,
};

export const credit = {
  replay: (sat: string, label: string, year: number) => `NASA GIBS · VIIRS ${sat} true colour, ${label} ${year} · heat: NASA FIRMS · scars: NBAC`,
  tonight: (frameDate: string) => `NASA GIBS · VIIRS NOAA-20 true colour, ${fmtIso(frameDate)} · heat: NASA FIRMS`,
};

export const map = {
  border: '120°W',
  bc: 'British Columbia',
  ab: 'Alberta',
  graveAria: (id: string, label: string) => `Grave ${id}, ${label.toLowerCase()}. Open exhumation.`,
  fireAria: (id: string) => `New fire ${id}, not a revenant`,
};

export const footer = {
  speedGroup: 'Replay speed',
  speed: { '0.5': '½×', '1': '1×', '2': '2×' } as const,
  date: (year: number, day: number) => `${fmtDay(day, year)}, ${year}`,
  // The replay runs by itself (spec 05 Requirement 9.5): the sub-label says what time is doing.
  playing: (speed: '0.5' | '1' | '2') => `The candle burns · ${{ '0.5': '0.75', '1': '1.5', '2': '3' }[speed]} days a second`,
  rising: 'The candle waits while the dead rise',
  waiting: 'The candle waits while you look',
  wager: 'The candle waits for your wager',
  over: 'The candle is out · drag it back, or choose the spring again',
  tonightDate: (asOf: string) => `${fmtIso(asOf.slice(0, 10))}, ${asOf.slice(0, 4)}`,
  tonightSub: (year: number) => `The scars of ${year}, going under`,
  scrub: 'Replay day',
  stirs: (id: string, year: number, melt: number) => `${id} stirs ${fmtDay(melt, year)}`,
  windowEnds: (year: number, melt: number) => `window ends ${fmtDay(melt + 50, year)}`,
  rises: (id: string, year: number, day: number) => `${id} rises ${fmtDay(day, year)}`,
  months: [['Mar 21', 0], ['Apr 1', 10.8], ['May 1', 40.2], ['Jun 1', 70.6], ['Jul 1', 100]] as const,
};

export const lanternCopy = {
  name: (id: string, label: string) => `${id} · ${label.toLowerCase()}`,
};

export const compare = {
  label: 'Before and after divider',
  left: (label: string, year: number) => `◀ ${label} ${year}`,
  right: (label: string, year: number) => `${label} ${year} ▶`,
};

export const exhume = {
  aria: (id: string) => `Exhumation of grave ${id}`,
  close: 'Close exhumation',
  dossier: 'Open the dossier',
  newTab: '(opens in a new tab)',
  here: 'Here lies',
  cropAlt: (id: string, label: string, year: number) => `Satellite crop of ${id}, ${label} ${year}`,
  checksAria: 'Rule checks',
  chartTitle: (year: number) => `SNOW ON THE SCAR · SPRING ${year}`,
  chartAria: (year: number, melt: number, riseDay: number | null) =>
    melt < 0
      ? 'Snow cover on the scar never stayed under 15 percent this spring'
      : `Snow cover on the scar fell below 15 percent on ${fmtDay(melt, year)}` + (riseDay !== null ? `; heat returned on ${fmtDay(riseDay, year)}` : ''),
  axis: ['Mar 21', 'May 10', 'Jul 1'] as const,
  epitaph: (o: { size: number; cx: number; year: number; state: string; melt: number; riseDay: number | null }) => {
    const base = `Here lies some ${km2(o.size)} km² of ${region(o.cx)}, burned in the summer of ${o.year - 1}. Buried by winter. `;
    const melt = fmtDay(o.melt, o.year);
    if (o.state === 'risen' && o.riseDay !== null) {
      const n = o.riseDay - o.melt;
      return base + `The snow let go on ${melt}; ` + (n === 0 ? 'that same day' : `${n} days later`) + ' it rose.';
    }
    if (o.state === 'rest') return base + `The snow let go on ${melt}. Fifty days passed and it did not stir. Rest now.`;
    if (o.state === 'waking') return base + `The snow let go on ${melt}. It is restless.`;
    return base + (o.melt >= 0 ? `It sleeps under the snow until about ${melt}.` : 'It slept under the snow all spring.');
  },
  check1: (year: number, size: number) => ({ title: `Burned in summer ${year - 1}`, detail: `NBAC mapped ~${km2(size)} km² burned here in ${year - 1}.` }),
  check2: (year: number, melt: number, reached: boolean) =>
    reached
      ? { title: `Snow left ${fmtDay(melt, year)}`, detail: 'Snow cover on the scar stayed under 15% through a week of satellite views.' }
      : melt >= 0
        ? { title: 'Still under snow', detail: `The satellite expects it clear around ${fmtDay(melt, year)}.` }
        : { title: 'Still under snow', detail: 'The satellite never saw it clear this spring, so the 50-day watch never opened.' },
  check3Rose: (year: number, riseDay: number, days: number) => ({
    title: days === 0 ? 'Heat returned the same day' : `Heat returned ${days} days later`,
    detail: `A hotspot on the scar, ${fmtDay(riseDay, year)}, inside the 50-day window. Gas flares are filtered out.`,
  }),
  check3Wait: (year: number, melt: number, km: number, closed: boolean) => ({
    title: closed ? 'No heat within 50 days' : 'Watching for heat',
    detail: melt >= 0 ? `Rule: a hotspot within ≈ ${km} km of the scar, ${fmtDay(melt, year)} to ${fmtDay(melt + 50, year)}.` : 'Rule: the window opens only when the snow leaves.',
  }),
  coords: (c: string, year: number) => `${c} · scars ${year - 1}`,
  // Tonight
  tonightChartTitle: (pointsThrough: string) => `TONIGHT · ${fmtIso(pointsThrough).toUpperCase()}, ${pointsThrough.slice(0, 4)}`,
  tonightChartAria: (snow: number, late: number) => `Snow cover ${snow < 0 ? 'unseen' : snow + ' percent'}; ${late} hotspots in the last two weeks`,
  tonightAxis: ['0%', 'snow on scar', '100%'] as const,
  tonightEpitaph: (o: { size: number; cx: number; lastBurn: string; late: number; snow: number }) =>
    `Here lies some ${km2(o.size)} km² of ${region(o.cx)}, burned this year until ${fmtIso(o.lastBurn)}. ` +
    (o.late > 0 ? 'It was still warm in the last two weeks; crews confirm whether that was fire or slash piles. ' : 'It went cold before the snow. ') +
    (o.snow < 0 ? 'Cloud hides whether the snow has it.' : o.snow >= 15 ? 'The snow has it now.' : 'The snow has not reached it yet.'),
  tonightCheck1: (year: number, lastBurn: string) => ({ title: `Burned in ${year}`, detail: `Fire seen here until ${fmtIso(lastBurn)}.` }),
  tonightCheck2: (late: number) =>
    late > 0
      ? { title: `${late} hotspots in the last two weeks`, detail: 'Late heat is how fires slip underground. Some of it is autumn slash-pile burning; crews confirm.' }
      : { title: 'Cold for two weeks', detail: 'Lower risk of carrying over.' },
  tonightCheck3: (snow: number) => ({
    title: snow < 0 ? 'Snow unseen (cloud)' : snow >= 50 ? `Buried · snow ${snow}%` : snow >= 15 ? `Snow settling · ${snow}%` : 'Not yet buried',
    detail: 'Revenant starts its 50-day watch the day this snow leaves in spring 2027.',
  }),
  tonightCoords: (c: string, year: number) => `${c} · scars ${year}`,
};

export const errors = {
  title: 'The register could not be read.',
  detail: (file: string) => `${file} is missing or damaged. Nothing is shown rather than guessed.`,
};

export const footerCredit = (credit: string) => `${credit} · method: docs/method.md`;
