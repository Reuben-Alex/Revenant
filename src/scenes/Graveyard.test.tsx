// Spec 05 Requirements 1.1, 2.1, 4.1, 4.2, 6.1, 9.1–9.3: the graveyard replay runs with no play button, the first
// Spring 2024 rising (G-10, Apr 7) stings, zooms and holds, and opening a grave ends the hold and stops the clock.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import seasonsRaw from '../../public/data/seasons.json';
import tonightRaw from '../../public/data/tonight.json';
import { PERIOD_MS } from '../data/derive';
import { parseSeasons, parseTonight } from '../data/load';
import { NIGHT_MS, firstThaw } from '../data/gravekeeper';
import { HOLD_BEAT_MS } from '../data/rising';
import { Graveyard } from './Graveyard';

const DATA = parseSeasons(seasonsRaw);
const TONIGHT = parseTonight(tonightRaw);
const DAY_MS = Math.ceil(PERIOD_MS['1'] / 100) * 100;
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const day = () => Number((screen.getByLabelText(/Replay day/i) as HTMLInputElement).value);
const camLayer = () => document.querySelector('.rv-cam') as HTMLElement;

beforeEach(() => { vi.useFakeTimers(); window.history.replaceState(null, '', '/'); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('Graveyard rising', () => {
  it('runs by itself; G-10 rises on day 17 with the sting, zoom and letterbox; the day holds for 6 s', () => {
    const onRising = vi.fn();
    render(<Graveyard data={DATA} tonight={TONIGHT} onRising={onRising} />);
    expect(screen.queryAllByRole('button', { name: /play|pause/i })).toHaveLength(0);
    expect(camLayer().style.transform).toBe('translate(0%, 0%) scale(1)');

    tick(17 * DAY_MS);
    expect(day()).toBe(17);
    expect(screen.getByText('G-10 has risen')).toBeTruthy();
    expect(screen.getByText('APR 7 · DAY 16 AFTER SNOWMELT')).toBeTruthy();
    const live = screen.getAllByRole('status').map((e) => e.textContent);
    expect(live).toContain('G-10 has risen on Apr 7, 16 days after its snow left.');
    expect(camLayer().style.transform).toMatch(/scale\(2\.4\)/);
    expect(document.querySelectorAll('.rv-lbt, .rv-lbb')).toHaveLength(2);
    expect(document.querySelector('.rv-burst')).not.toBeNull();
    expect(onRising).toHaveBeenCalledWith(expect.objectContaining({ lead: 'G-10', beat: 1, camera: true }));

    tick(HOLD_BEAT_MS - 200);
    expect(day()).toBe(17);
    tick(200 + DAY_MS);
    expect(day()).toBe(18);
    expect(camLayer().style.transform).toBe('translate(0%, 0%) scale(1)');
    expect(document.querySelector('.rv-lbt')).toBeNull();
  });

  it('the Gravekeeper greets the night, names the first thaw, and speaks the first beat (spec 06 Req 1, 2)', () => {
    // StrictMode, as in main.tsx: the repeated mount effects must not replace the night line with the season intro.
    render(<StrictMode><Graveyard data={DATA} tonight={TONIGHT} greet /></StrictMode>);
    const live = () => screen.getAllByRole('status').map((e) => e.textContent ?? '').join(' | ');
    expect(live()).toContain('The Gravekeeper: You were looking at fire scars. Look again. These are graves, twenty-four of them, from the summer of 2023.');
    // G-10 thaws on day 1, while the night line is still being read; the thaw line waits for silence.
    tick(DAY_MS);
    expect(day()).toBe(1);
    expect(live()).toContain('The Gravekeeper: You were looking at fire scars.');
    expect(live()).not.toContain('The snow is leaving');
    const quietDay = Math.ceil(NIGHT_MS / DAY_MS);
    const w = firstThaw(DATA.seasons.s2024, quietDay);
    expect(w).not.toBeNull();
    tick((quietDay - 1) * DAY_MS);
    expect(day()).toBe(quietDay);
    expect(live()).toContain(`The Gravekeeper: The snow is leaving ${w?.id}. Fifty days, now.`);
    tick((17 - quietDay) * DAY_MS);
    expect(day()).toBe(17);
    expect(live()).toContain('G-10. I buried it last autumn, under the fires of 2023. The snow let go of it 16 days ago. It was not ready to stay down.');
    expect(document.querySelector('.rv-say')).not.toBeNull();
  });

  it('opening the risen grave ends the hold; the day waits until the panel closes', () => {
    render(<Graveyard data={DATA} tonight={TONIGHT} />);
    tick(17 * DAY_MS);
    expect(document.querySelector('.rv-lbt')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Grave G-10/ }));
    expect(document.querySelector('.rv-lbt')).toBeNull();
    tick(20 * DAY_MS);
    expect(day()).toBe(17);
    expect(screen.getByText(/waits while you look/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Close exhumation/i }));
    tick(DAY_MS);
    expect(day()).toBe(18);
  });
});
