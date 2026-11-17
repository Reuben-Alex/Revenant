// Daylight ("Boreal Fire Watch") and title-card copy (spec 04, Requirement 3.9). Board: Main.dc.html `dayOn`
// L492–573 and `intro` L574–583. Board claims the published data can't back are replaced
// (spec 04 design.md, "Board-to-app decisions"). Templates take only published fields.

export const page = {
  main: 'Boreal Fire Watch, daylight view',
  aside: 'Status',
};

export const brand = {
  name: 'Boreal Fire Watch',
  sub: 'Northeast BC & Northern Alberta',
  avatar: 'FC',
};

export const header = {
  search: 'Search a place, burn area or coordinates',
  /** Board: "Live · updated 12 min ago". This view shows day 0 of a past spring, so it is an archive. */
  chip: (year: number) => `Spring ${year} archive`,
  nightShift: 'Night shift',
  nightShiftAria: 'Switch to the night shift view',
};

export const map = {
  alt: 'True-colour satellite image of the region',
  bc: 'BRITISH COLUMBIA',
  ab: 'ALBERTA',
  layersTitle: 'Layers',
  layerAreas: 'Monitored burn areas',
  /** Board: "2023 fire footprints". The replay scars are NBAC polygons. */
  layerScars: (scarYear: number) => `${scarYear} burned areas (NBAC)`,
  /** Board: "Hotspots, last 24 h", which implies a live feed. */
  layerHotspots: 'Hotspots (VIIRS)',
  layerSnow: 'Snow cover',
  zoomIn: '+',
  zoomOut: '−',
  scale: '60 km',
  imageCredit: (satellite: string, label: string, year: number) => `Imagery NASA GIBS · VIIRS ${satellite} · ${label}, ${year}`,
};

export const status = {
  title: 'Regional status',
  clear: 'All clear',
  /** Not clear: some burn area has a published rise on or before day 0. */
  notClear: (n: number) => (n === 1 ? '1 burn area re-ignited' : `${n} burn areas re-ignited`),
  /** Board: "Fire season has not begun. Snow still covers most … No active hotspots in the region." */
  text: (reignited: number, covered: number, total: number) =>
    `${reignited === 0 ? 'No burn area has re-ignited.' : `${reignited} of ${total} burn areas have re-ignited.`} ` +
    `Snow still covers ${covered} of last year's ${total} burn areas.`,
};

export const stats = {
  /** Board: "Active hotspots 0". No dated region-wide hotspot count for day 0 is published. */
  reignited: 'Re-ignited burn areas',
  areas: 'Burn areas',
  allInactive: 'all inactive',
  active: (n: number) => `${n} active`,
  snow: 'Snow on scars',
  snowValue: (avg: number | null) => (avg === null ? 'no data' : `${avg}%`),
  /** Board: "avg this week". The app states the dates the mean covers. */
  snowSub: (range: string) => `avg, ${range}`,
};

export const rows = {
  title: 'Monitored burn areas',
  viewAll: (n: number) => `View all ${n}`,
  line: (km: string, snow: number | null) => `${km} km² · snow ${snow === null ? 'no data' : `${snow}%`}`,
  inactive: 'Inactive',
  reignited: 'Re-ignited',
};

export const nightCard = {
  title: 'Night shift starts at 19:00',
  sub: 'Some crews keep watch after dark.',
  button: 'Stay until dark',
};

/** Board: "Data: NASA FIRMS / VIIRS 375 m, NASA GIBS. Hotspots refresh hourly." (no NBAC, and not hourly). */
export const credit = 'Data: NASA FIRMS (VIIRS 375 m), NASA GIBS, NBAC (NRCan). Method after Scholten et al. 2021.';

export const title = {
  aria: 'Revenant title',
  line1: '> same satellites · same data · after dark',
  /** Board: "ignoring {320} gas flares". `static` counts FIRMS type 2/3 cells, which are wider than gas flares. */
  line2: (staticCount: number) => `> ignoring ${staticCount} static heat sources ........... listening for heat`,
  line3: 'Not every fire goes out in the fall.',
  line4: 'Some wait under the snow.',
};
