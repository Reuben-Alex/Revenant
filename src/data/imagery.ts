// Image manifest. public/data has no image list, so this module states it, with sources:
// file names from reference/design/blob-map.json, replay days from public/img/README.md.
import type { SceneKey, SeasonKey } from './types';

export interface Keyframe {
  src: string;
  day: number; // replay day (from Mar 21)
  label: string; // "Mar 25"
}

export const KEYFRAMES: Record<SeasonKey, Keyframe[]> = {
  s2024: [
    { src: '/img/viirs-mar25-2024.webp', day: 4, label: 'Mar 25' },
    { src: '/img/viirs-apr18-2024.webp', day: 28, label: 'Apr 18' },
    { src: '/img/viirs-jun18-2024.webp', day: 89, label: 'Jun 18' },
  ],
  s2025: [
    { src: '/img/viirs-mar30-2025.webp', day: 9, label: 'Mar 30' },
    { src: '/img/viirs-apr24-2025.webp', day: 34, label: 'Apr 24' },
    { src: '/img/viirs-jun21-2025.webp', day: 92, label: 'Jun 21' },
  ],
  s2026: [
    { src: '/img/viirs-mar26-2026.webp', day: 5, label: 'Mar 26' },
    { src: '/img/viirs-apr15-2026.webp', day: 25, label: 'Apr 15' },
    { src: '/img/viirs-jun13-2026.webp', day: 84, label: 'Jun 13' },
  ],
};

/** Tonight's frame is written nightly by the pipeline; its date is tonight.json `frame_date`. */
export const TONIGHT_FRAME = '/img/viirs-latest.webp';

/** Scar mask class per scene: season Y shows the scars of Y−1 (public/img/README.md). */
export const MASK_CLASS: Record<SceneKey, string> = {
  s2024: 'rv-m2023',
  s2025: 'rv-m2024',
  s2026: 'rv-m2025',
  tonight: 'rv-m2026',
};

/** Satellite that took each scene's true-colour frames (for the credit chip). */
export const FRAME_SATELLITE: Record<SceneKey, string> = {
  s2024: 'S-NPP',
  s2025: 'S-NPP',
  s2026: 'S-NPP',
  tonight: 'NOAA-20',
};
