// Typed views of the published files (docs/method.md, "Published schema").

export type SeasonKey = 's2024' | 's2025' | 's2026';
export type SceneKey = SeasonKey | 'tonight';
export const SEASON_KEYS: readonly SeasonKey[] = ['s2024', 's2025', 's2026'];

export interface Rise {
  day: number;
  x: number;
  y: number;
}

export interface Grave {
  id: string; // G-01 … in published (size) order
  size: number; // size_px
  cx: number;
  cy: number;
  melt: number; // -1 = never melted
  rise: Rise | null;
  early: number;
  snow: number[]; // 103 whole percents, -1 = missing
}

export interface NewFire {
  id: string; // F-01 …
  x: number;
  y: number;
  day: number;
}

export interface SeasonData {
  key: SeasonKey;
  year: number;
  graves: Grave[];
  fires: NewFire[];
  chance: number;
  zombie: boolean;
  risen: number; // count of published rows with a rise
}

export interface Meta {
  generated_at: string;
  method: string;
  proximity_km: number;
  sources: string[];
  credit: string;
}

export interface SeasonsFile {
  seasons: Record<SeasonKey, SeasonData>;
  static: number;
  meta: Meta;
}

export interface TonightScar {
  id: string;
  size: number;
  cx: number;
  cy: number;
  lastBurn: string; // YYYY-MM-DD
  late: number; // detections in the last 14 days
  lateXY: [number, number] | null;
  snowNow: number; // -1 = unknown
}

export interface TonightFile {
  scars: TonightScar[];
  clusters: [number, number, number][]; // x, y, point count
  static: number;
  asOf: string;
  frameDate: string;
  pointsThrough: string;
  sources: string[];
  credit: string;
}
