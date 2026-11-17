// Display state from a grave's published melt day and rise (Requirement 2.4). This is the display
// mapping of the rule in pipeline/rules/ (spec 01, Requirement 4); it computes nothing else.
import type { Rise } from './types';

export type DisplayState = 'buried' | 'waking' | 'risen' | 'rest';

export const RISE_WINDOW = 50;

export function displayState(day: number, melt: number, rise: Rise | null): DisplayState {
  if (melt < 0 || day < melt) return 'buried';
  if (rise && day >= rise.day) return 'risen';
  if (day - melt > RISE_WINDOW) return 'rest';
  return 'waking';
}

/** Days since the snow left (0 before melt or when the grave never melted). */
export function since(day: number, melt: number): number {
  return melt < 0 ? 0 : Math.max(0, day - melt);
}
