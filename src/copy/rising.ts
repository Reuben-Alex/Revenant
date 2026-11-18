// Sting copy for a rising (spec 05 Requirement 2). Board: Main.dc.html `sting` in renderVals() L1381–1383.
// Templates take only published fields: grave ids, the rise date and each grave's rise.day − melt.
//
// Board-to-app: the board's detail gave the lead's day count for every grave on a shared step
// ("G-13 · G-24 · APR 20 · DAY 0 AFTER SNOWMELT", though G-24 rose 26 days after its melt). Here each grave
// carries its own count.

export interface StingGrave { id: string; days: number }

const dayWord = (d: number) => `DAY ${d}`;

export const sting = {
  title: (graves: StingGrave[]) => (graves.length > 1 ? `${graves.length} graves have risen` : `${graves[0]!.id} has risen`),
  /** "APR 7 · DAY 16 AFTER SNOWMELT", or "APR 20 · G-13 DAY 0 · G-24 DAY 26 AFTER SNOWMELT". */
  detail: (graves: StingGrave[], date: string) =>
    graves.length > 1
      ? `${date.toUpperCase()} · ${graves.map((g) => `${g.id} ${dayWord(g.days)}`).join(' · ')} AFTER SNOWMELT`
      : `${date.toUpperCase()} · ${dayWord(graves[0]!.days)} AFTER SNOWMELT`,
  /** One sentence for the polite live region. */
  live: (graves: StingGrave[], date: string) =>
    graves.length > 1
      ? `${graves.length} graves have risen on ${date}: ${graves.map((g) => `${g.id}, ${g.days} ${g.days === 1 ? 'day' : 'days'} after its snow left`).join('; ')}.`
      : `${graves[0]!.id} has risen on ${date}, ${graves[0]!.days} ${graves[0]!.days === 1 ? 'day' : 'days'} after its snow left.`,
};
