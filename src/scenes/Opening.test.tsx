// Spec 04 Requirements 2.6, 4.2, 6.1, 6.2, 7.1, 8.3: the opening runs daylight → dusk → title → night on its
// timers, nothing skips it, there is no sound control, and focus and the tab title follow the phases.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import seasonsRaw from '../../public/data/seasons.json';
import tonightRaw from '../../public/data/tonight.json';
import * as copy from '../copy/daylight';
import { parseSeasons, parseTonight } from '../data/load';
import { Opening } from './Opening';
import { DUSK_MS, TITLE_MS } from './useNightfall';

const DATA = parseSeasons(seasonsRaw);
const TONIGHT = parseTonight(tonightRaw);
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const soundControls = () => screen.queryAllByRole('button', { name: /sound|mute|audio/i });
const skipControls = () => screen.queryAllByRole('button', { name: /skip/i });

beforeEach(() => {
  vi.useFakeTimers();
  window.history.replaceState(null, '', '/');
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Opening', () => {
  it('starts in daylight with the agency tab title and no sound or skip control', () => {
    render(<Opening data={DATA} tonight={TONIGHT} />);
    expect(screen.getByRole('main', { name: copy.page.main })).toBeTruthy();
    expect(document.title).toBe(copy.docTitle.day);
    expect(screen.getByText('All clear')).toBeTruthy();
    expect(soundControls()).toHaveLength(0);
    expect(skipControls()).toHaveLength(0);
  });

  it('runs dusk → title → night on its timers; Escape and clicks never skip', () => {
    const onNight = vi.fn();
    render(<Opening data={DATA} tonight={TONIGHT} onNight={onNight} />);
    fireEvent.click(screen.getByRole('button', { name: copy.header.nightShiftAria }));

    // dusk: the daylight view drains and can't be used
    const main = document.querySelector('main')!;
    expect(main.classList.contains('rv-dusk')).toBe(true);
    expect(main.hasAttribute('inert')).toBe(true);
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(main);
    tick(DUSK_MS - 1);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.title).toBe(copy.docTitle.day);

    // title: focused card, no controls, the tab title switches
    tick(1);
    const card = screen.getByRole('dialog', { name: copy.title.aria });
    expect(document.activeElement).toBe(card);
    expect(card.querySelectorAll('button, a, input')).toHaveLength(0);
    expect(card.textContent).toContain(`ignoring ${DATA.static} static heat sources`);
    expect(document.title).toBe(copy.docTitle.night);
    fireEvent.keyDown(card, { key: 'Escape' });
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.click(card);
    tick(TITLE_MS - 1);
    expect(screen.getByRole('dialog', { name: copy.title.aria })).toBeTruthy();
    expect(onNight).not.toHaveBeenCalled();

    // night: the graveyard on Spring 2024 day 0, focus on the headline, onNight once
    tick(1);
    expect(screen.queryByRole('dialog')).toBeNull();
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(document.activeElement).toBe(h1);
    expect(screen.getByRole('button', { name: /Spring 2024/ }).getAttribute('aria-pressed')).toBe('true');
    expect((screen.getByLabelText(/Replay day/i) as HTMLInputElement).value).toBe('0');
    expect(soundControls()).toHaveLength(0);
    expect(skipControls()).toHaveLength(0);
    tick(30000);
    expect(onNight).toHaveBeenCalledTimes(1);
  });

  it('ignores a second press of either nightfall button', () => {
    render(<Opening data={DATA} tonight={TONIGHT} />);
    fireEvent.click(screen.getByRole('button', { name: copy.header.nightShiftAria }));
    tick(1000);
    fireEvent.click(screen.getByRole('button', { name: copy.nightCard.button, hidden: true }));
    tick(DUSK_MS - 1000);
    expect(screen.getByRole('dialog', { name: copy.title.aria })).toBeTruthy();
  });
});
