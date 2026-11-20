// The grave dossier (spec 07 Requirement 5). Board: reference/design/Dossier.dc.html. The board's values are the
// research G-03 (Apr 8 / Apr 19 / 11 days, northeast BC, ~10,000 km², a late snowfall, ~3 km, 320 points); here every
// line is a template filled from the selected grave's published row.
import { fmtDay, km2 } from '../data/format';

const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;
const ORD = ['', 'largest', 'second-largest', 'third-largest', 'fourth-largest', 'fifth-largest'];
const ordinal = (n: number) => ORD[n] ?? `${n}th-largest`;

export const page = {
  title: (id: string, year: number) => `Revenant · ${id} · spring ${year}`,
  back: 'Back to the graveyard',
  brand: 'Revenant',
  badge: (year: number) => `Real data · NASA FIRMS · VIIRS · NBAC · spring ${year}`,
  unknown: (hash: string) => `No grave "${hash}" in the published data; showing Spring 2024 G-03.`,
  loading: 'Digging…',
};

export const hero = {
  state: { risen: 'RISEN', rest: 'LAID TO REST', buried: 'NEVER THAWED' } as const,
  title: (id: string) => `Grave ${id}`,
  lede: (km: string, scarYear: number, place: string, state: 'risen' | 'rest' | 'buried') =>
    `Here lies some ${km} km² burned in the summer of ${scarYear}, in ${place}. ` +
    (state === 'risen' ? 'It did not stay down.' : state === 'rest' ? 'Fifty days passed and it did not stir.' : 'The snow never let it go this spring.'),
  send: 'Send to field crew',
  kml: 'Export KML',
  kmlNote: 'points only, not the scar outline',
};

export const sat = {
  title: 'What the satellite saw',
  phase: { buried: 'buried', waking: 'waking', risen: 'risen', rest: 'at rest' } as const,
  snow: (pct: number) => (pct < 0 ? 'Cloud hid the scar from the snow sensor that day.' : `Snow covered ${pct}% of the scar that day.`),
  rel: (d: number, melt: number, rise: number | null) =>
    melt < 0 ? 'The snow never left it this spring.'
      : d < melt ? `The snow left ${days(melt - d)} later.`
        : rise !== null && d >= rise ? (d === rise ? 'Heat was on the scar that day.' : `Heat had returned ${days(d - rise)} before.`)
          : d === melt ? 'The snow left that day.' : `${days(d - melt)} after the snow left.`,
  alt: (id: string, label: string, year: number) => `Satellite view of grave ${id}, ${label} ${year}`,
  credit: (satName: string, ring: string) => `NASA GIBS · VIIRS ${satName} corrected reflectance, true colour · heat: NASA FIRMS · ring marks ${ring}`,
  ringRise: (date: string, where: string) => `the ${date} hotspot at ${where}`,
  ringCentre: 'the scar\u2019s centre',
};

export const rule = {
  title: 'Why we say it rose',
  titleNot: 'Why it did not rise',
  intro: 'The holdover test from Scholten et al., Nature 2021, run on VIIRS 375 m detections (NASA FIRMS) and daily VIIRS snow cover.',
  scar: (scarYear: number, km: number, ok: boolean) => ({
    title: `On its ${scarYear} scar.`,
    detail: ok ? `A FIRMS hotspot within ≈ ${km} km of the NBAC scar.` : `No FIRMS hotspot within ≈ ${km} km of the NBAC scar inside the window.`,
  }),
  window: (year: number, melt: number, rise: number | null) =>
    melt < 0 ? { title: 'The snow never left.', detail: 'The satellite never saw the scar clear this spring, so the 50-day watch never opened.' }
      : rise !== null ? { title: 'Within 50 days of snowmelt.', detail: `Snow left the scar ${fmtDay(melt, year)}; heat returned ${days(rise - melt)} later.` }
        : { title: 'Fifty days passed.', detail: `Snow left the scar ${fmtDay(melt, year)}; the watch closed ${fmtDay(melt + 50, year)} with no heat.` },
  flare: (n: number, risen: boolean) => ({
    title: risen ? 'Not a gas flare.' : 'Static heat filtered.',
    detail: `FIRMS marks static heat sources; ${n.toLocaleString('en-US')} such cells across the three springs were dropped.`,
  }),
  lightning: { title: 'Lightning not checked.', detail: 'Canadian lightning data isn\u2019t open, so this filter is off.' },
};

export const snow = {
  title: (year: number) => `Snow on the scar, spring ${year}`,
  melt: (date: string) => `${date} · snow gone`,
  late: 'late snow',
  rise: (date: string) => `${date} · heat`,
  aria: (year: number, melt: number, rise: number | null, bands: { from: number; to: number }[]) =>
    'Daily snow cover on the scar' +
    (melt < 0 ? ', never under 15 percent for a week' : `: under 15 percent from ${fmtDay(melt, year)}`) +
    bands.map((b) => `, snow again ${fmtDay(b.from, year)}${b.to > b.from ? ` to ${fmtDay(b.to, year)}` : ''}`).join('') +
    (rise !== null ? `, then heat on ${fmtDay(rise, year)}` : ''),
  caption: (year: number, melt: number, rise: number | null, bands: { from: number; to: number }[]) =>
    'The teal band is the 50-day watch.' +
    (bands.length ? ` Snow came back over the scar on ${bands.map((b) => fmtDay(b.from, year) + (b.to > b.from ? `–${fmtDay(b.to, year).replace(/^\w+ /, '')}` : '')).join(' and ')}.` : '') +
    (melt < 0 ? ' The snow never left the scar this spring.'
      : rise !== null ? ` Heat returned on ${fmtDay(rise, year)}, ${days(rise - melt)} after the snow left.` : ' No heat came in the window.'),
};

export const life = {
  title: 'Life and afterlife',
  burned: (scarYear: number, size: number, rank: number) => ({
    date: `SUMMER ${scarYear}`, state: 'Burned', text: `The ${ordinal(rank)} scar of ${scarYear} on this map; NBAC mapped about ${km2(size)} km².`,
  }),
  buried: (scarYear: number, year: number, first: { day: number; pct: number } | null) => ({
    date: `WINTER ${scarYear}–${String(year).slice(2)}`, state: 'Buried',
    text: first ? `Snow covered ${first.pct}% of the scar on ${fmtDay(first.day, year)}.` : 'The snow sensor never saw the scar clearly.',
  }),
  stirred: (year: number, melt: number) =>
    melt >= 0
      ? { date: `${fmtDay(melt, year).toUpperCase()}, ${year}`, state: 'Stirred', text: 'Snow under 15% for a week; the 50-day watch began.' }
      : { date: `JUL 1, ${year}`, state: 'Never stirred', text: 'The season ended with the scar under snow.' },
  end: (year: number, melt: number, rise: number | null) =>
    rise !== null
      ? { date: `${fmtDay(rise, year).toUpperCase()}, ${year}`, state: 'Rose', text: `VIIRS heat on the scar, ${days(rise - melt)} after the snow left.` }
      : melt >= 0
        ? { date: `${fmtDay(Math.min(102, melt + 50), year).toUpperCase()}, ${year}`, state: 'Laid to rest', text: melt + 50 > 102 ? 'The season ended inside the window, with no heat.' : 'Fifty days passed with no heat.' }
        : null,
};

export const sightings = {
  title: 'Sightings',
  head: ['DATE', 'WHERE', 'DAYS AFTER MELT'] as const,
  none: 'No hotspot on the scar inside the window.',
  crew: 'Revenant has no crew reports; crews confirm on the ground.',
};

export const footer = {
  credit: 'NASA FIRMS · NASA GIBS/VIIRS · NBAC (NRCan) · Scholten et al. 2021',
  method: 'Method and caveats',
  methodHref: 'https://github.com/Reuben-Alex/Revenant/blob/main/docs/method.md',
};

export const kml = {
  doc: (id: string, year: number) => `Revenant ${id}, spring ${year}`,
  centre: (id: string) => `${id} scar centre (a point, not the scar outline)`,
  rise: (id: string, date: string) => `${id} hotspot, ${date}`,
  file: (season: string, id: string) => `revenant-${season}-${id}.kml`,
  desc: (scarYear: number) => `Scar: NBAC ${scarYear}. Heat: NASA FIRMS VIIRS 375 m. Method: Scholten et al. 2021; Revenant docs/method.md.`,
};
