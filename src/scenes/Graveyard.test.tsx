// Spec 05 Requirements 1.1, 2.1, 4.1, 4.2, 6.1, 9.1–9.3: the graveyard replay runs with no play button, the first
// Spring 2024 rising (G-10, Apr 7) stings, zooms and holds, and opening a grave ends the hold and stops the clock.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import seasonsRaw from '../../public/data/seasons.json';
import tonightRaw from '../../public/data/tonight.json';
import { PERIOD_MS } from '../data/derive';
import { parseSeasons, parseTonight } from '../data/load';
import { clueCard, firstThaw, riddleCards, riddleHint, verdictView, whisperAt } from '../data/gravekeeper';
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
    fireEvent.click(screen.getByRole('button', { name: 'Just watch' }));

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

it('the wager holds day 0; marks, clues and the seal; the thaw waits for silence; "Your mark" at the beat (spec 06 Req 1, 2, 4)', () => {
    // StrictMode, as in main.tsx: the repeated mount effects must not replace the night line with the season intro.
    render(<StrictMode><Graveyard data={DATA} tonight={TONIGHT} greet /></StrictMode>);
    const live = () => screen.getAllByRole('status').map((e) => e.textContent ?? '').join(' | ');
    expect(live()).toContain('The Gravekeeper: You were looking at fire scars. Look again. These are graves, twenty-four of them, from the summer of 2023.');
    tick(5 * DAY_MS);
    expect(day()).toBe(0);
    expect(screen.getByRole('region', { name: "The Gravekeeper's wager" })).toBeTruthy();
    const seal = screen.getByRole('button', { name: 'Seal the wager' });
    expect(seal.getAttribute('aria-disabled')).toBe('true');

    // A stone's clue card holds its published values; pressing it marks it and does not open the exhumation.
    const g10 = screen.getByRole('button', { name: 'Mark grave G-10' });
    fireEvent.focus(g10);
    const c = clueCard(DATA.seasons.s2024.graves.find((g) => g.id === 'G-10')!, 2024);
    const tip = screen.getByRole('tooltip').textContent ?? '';
    for (const s of [c.footprint, c.latitude, c.thaw, c.early]) expect(tip).toContain(s);
    for (const id of ['G-10', 'G-01', 'G-02']) fireEvent.click(screen.getByRole('button', { name: `Mark grave ${id}` }));
    expect(screen.queryByRole('button', { name: /Close exhumation/i })).toBeNull();
    expect(screen.getByRole('button', { name: 'Unmark grave G-10' }).getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelectorAll('.rv-pick')).toHaveLength(3);
    expect(screen.getByText('Three marked. Seal it, and we watch.')).toBeTruthy();

    fireEvent.click(seal);
    expect(screen.queryByRole('region', { name: "The Gravekeeper's wager" })).toBeNull();
    expect(live()).toContain('The Gravekeeper: Sealed: G-10, G-01, G-02. Now we watch the snow.');

    // G-10 thaws on day 1, while the sealed line is still showing; the thaw line waits for silence.
    tick(DAY_MS);
    expect(day()).toBe(1);
    expect(live()).not.toContain('The snow is leaving');
    const quietDay = Math.ceil(5000 / DAY_MS);
    const w = firstThaw(DATA.seasons.s2024, quietDay);
    expect(w).not.toBeNull();
    tick((quietDay - 1) * DAY_MS);
    expect(day()).toBe(quietDay);
    expect(live()).toContain(`The Gravekeeper: The snow is leaving ${w?.id}. Fifty days, now.`);
    tick((17 - quietDay) * DAY_MS);
    expect(day()).toBe(17);
    expect(live()).toContain('Your mark. G-10. I buried it last autumn, under the fires of 2023. The snow let go of it 16 days ago. It was not ready to stay down.');
    expect(document.querySelector('.rv-say')).not.toBeNull();
    expect(document.querySelectorAll('.rv-pick')).toHaveLength(3);
  });

  it('the lantern hunt: fires hide in the dark, a focused fire draws the lantern and is found, the counter counts (spec 06 Req 6)', () => {
    render(<Graveyard data={DATA} tonight={TONIGHT} />);
    fireEvent.change(screen.getByLabelText(/Replay day/i), { target: { value: '60' } });
    const visible = DATA.seasons.s2024.fires.filter((f) => f.day <= 60);
    fireEvent.click(screen.getByRole('button', { name: 'Lantern' }));
    const counter = () => screen.getAllByRole('status').map((e) => e.textContent ?? '').find((t) => /new fires found/.test(t));
    expect(counter()).toBe(`0 of ${visible.length} new fires found`);
    const dark = screen.getAllByRole('button', { name: 'Something in the dark. Bring the lantern here.' });
    expect(dark).toHaveLength(visible.length);
    fireEvent.focus(dark[0]!);
    const live = screen.getAllByRole('status').map((e) => e.textContent ?? '').join(' | ');
    expect(live).toMatch(/The Gravekeeper: That one is not mine\. F-\d\d burned more than about 15 km from every scar\./);
    const n = Number(/^(\d+) of/.exec(counter() ?? '')?.[1]);
    expect(n).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /^New fire F-\d\d, not a revenant$/ })).toHaveLength(n);
  });

  it('the 2024 verdict: a zombie year, from published values; Dig them up again reopens the wager at day 0 (spec 06 Req 7)', () => {
    render(<Graveyard data={DATA} tonight={TONIGHT} />);
    fireEvent.change(screen.getByLabelText(/Replay day/i), { target: { value: '101' } });
    tick(DAY_MS);
    expect(day()).toBe(102);
    const v = verdictView(DATA.seasons.s2024, [], false);
    const live = screen.getAllByRole('status').map((e) => e.textContent ?? '').join(' | ');
    expect(live).toContain(`${v.kicker}. Fourteen of 24 rose.`);
    expect(live).toContain('The same shapes laid on unburned ground caught heat 26% of the time. These scars woke 2.2 times as often as chance: a zombie year, after the fires of 2023.');
    expect(live).toContain('The Gravekeeper: Fourteen of twenty-four rose. Chance alone would have raised six. This was a zombie year.');
    expect(v.bells).toBe(3);
    fireEvent.click(screen.getByRole('button', { name: 'Dig them up again' }));
    expect(day()).toBe(0);
    expect(screen.getByRole('region', { name: "The Gravekeeper's wager" })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Dig them up again' })).toBeNull();
    expect(screen.getAllByRole('status').map((e) => e.textContent ?? '').join(' | ')).toContain('Again, then. Mark three, or just watch.');
  });

  it('Spring 2026 is quiet: a whisper on day 22, and a verdict that does not cry wolf (spec 06 Req 3, 7)', () => {
    render(<Graveyard data={DATA} tonight={TONIGHT} />);
    fireEvent.click(screen.getByRole('button', { name: /Spring 2026/ }));
    tick(8000); // let the season's intro line end, so the whisper finds silence
    fireEvent.change(screen.getByLabelText(/Replay day/i), { target: { value: '21' } });
    tick(DAY_MS);
    expect(day()).toBe(22);
    const live = () => screen.getAllByRole('status').map((e) => e.textContent ?? '').join(' | ');
    expect(live()).toContain(`A voice under the snow: ${whisperAt(DATA.seasons.s2026, 22)}`);
    fireEvent.change(screen.getByLabelText(/Replay day/i), { target: { value: '101' } });
    tick(DAY_MS);
    expect(live()).toContain('Two of 24 rose.');
    expect(live()).toContain('These scars woke no more often than chance. Revenant says so, rather than cry wolf.');
    expect(live()).toContain('These were ordinary spring fires, not the dead walking. I do not cry wolf.');
    expect(verdictView(DATA.seasons.s2026, [], false).bells).toBe(1);
  });

  it('Keep watch: lanterns only on still-warm scars; the seal compares with the ranking and says crews confirm (spec 07 Req 4)', () => {
    vi.setSystemTime(Date.parse(TONIGHT.asOf) + 3600 * 1000);
    render(<Graveyard data={DATA} tonight={TONIGHT} />);
    fireEvent.click(screen.getByRole('button', { name: /^Tonight/ }));
    expect(screen.getByRole('region', { name: 'Keep watch' })).toBeTruthy();
    const warm = TONIGHT.scars.filter((s) => s.late > 0);
    const cold = TONIGHT.scars.find((s) => s.late === 0)!;
    // A cold stone takes no lantern; it opens as usual.
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Grave ${cold.id}`) }));
    expect(screen.getByRole('button', { name: /Close exhumation/i })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Close exhumation/i }));
    const seal = screen.getByRole('button', { name: 'Seal the watch' });
    expect(seal.getAttribute('aria-disabled')).toBe('true');
    const picks = warm.slice(-3).map((s) => s.id); // the three least-ranked warm scars in file order
    for (const id of picks) fireEvent.click(screen.getByRole('button', { name: `Set a lantern on ${id}` }));
    expect(screen.getByRole('button', { name: `Take the lantern from ${picks[0]}` }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: `Set a lantern on ${warm[0]!.id}` })); // a fourth is refused
    expect(screen.queryByRole('button', { name: `Take the lantern from ${warm[0]!.id}` })).toBeNull();
    fireEvent.click(seal);
    const top = TONIGHT.watch.map((i) => TONIGHT.scars[i]!).filter((s) => s.late > 0).slice(0, 3).map((s) => s.id);
    const k = picks.filter((id) => top.includes(id)).length;
    const panel = screen.getByRole('region', { name: 'Keep watch' }).textContent ?? '';
    expect(panel).toContain(`(${top.join(', ')})`);
    expect(panel).toContain('Late heat can be slash-pile burning; crews confirm.');
    const live = screen.getAllByRole('status').map((e) => e.textContent ?? '').join(' | ');
    expect(live).toContain(['Your lanterns stand apart', 'One of your lanterns', 'Two of your lanterns', 'We keep the same watch'][k]!);
    expect(screen.getByRole('button', { name: 'Save the epitaph card' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Watch again' }));
    expect(screen.getByRole('button', { name: 'Seal the watch' })).toBeTruthy();
  });

  it('dragging the candle past day 0 counts as Just watch (spec 06 Req 4.6)', () => {    render(<Graveyard data={DATA} tonight={TONIGHT} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mark grave G-01' }));
    fireEvent.change(screen.getByLabelText(/Replay day/i), { target: { value: '5' } });
    expect(screen.queryByRole('region', { name: "The Gravekeeper's wager" })).toBeNull();
    expect(document.querySelectorAll('.rv-pick')).toHaveLength(0);
    tick(DAY_MS);
    expect(day()).toBe(6);
  });

  it('opening the risen grave ends the hold; the day waits until the panel closes', () => {
    render(<Graveyard data={DATA} tonight={TONIGHT} />);
    fireEvent.click(screen.getByRole('button', { name: 'Just watch' }));
    tick(17 * DAY_MS);
    expect(document.querySelector('.rv-lbt')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Grave G-10/ }));
    expect(document.querySelector('.rv-lbt')).toBeNull();
    tick(20 * DAY_MS);
    expect(day()).toBe(17);
    expect(screen.getByText(/waits while you look/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Close exhumation/i }));
    // Then the riddle on G-10 (spec 06 Req 5): it holds the clock, takes focus, and gives it back on Let it lie.
    const dialog = screen.getByRole('dialog', { name: 'Why did G-10 rise?' });
    expect(dialog.contains(document.activeElement)).toBe(true);
    tick(3 * DAY_MS);
    expect(day()).toBe(17);
    fireEvent.click(screen.getByRole('button', { name: 'Let it lie' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(/^Grave G-10/);
    tick(DAY_MS);
    expect(day()).toBe(18);
  });

  it('the riddle: a wrong Dig gives the hint and keeps the choice; the right three open the exhumation (spec 06 Req 5)', () => {
    render(<Graveyard data={DATA} tonight={TONIGHT} />);
    fireEvent.click(screen.getByRole('button', { name: 'Just watch' }));
    tick(17 * DAY_MS);
    tick(HOLD_BEAT_MS);
    expect(screen.getByRole('dialog', { name: 'Why did G-10 rise?' })).toBeTruthy();
    const cards = riddleCards(2024, DATA.meta.proximity_km);
    expect(screen.getAllByRole('button', { pressed: false }).filter((b) => cards.some((c) => c.text === b.textContent)).map((b) => b.textContent))
      .toEqual(cards.map((c) => c.text));
    const pick = (text: string) => fireEvent.click(screen.getByRole('button', { name: text }));
    const decoy = cards.find((c) => !c.truth)!;
    const truths = cards.filter((c) => c.truth);
    pick(decoy.text); pick(truths[0]!.text); pick(truths[1]!.text);
    fireEvent.click(screen.getByRole('button', { name: 'Dig' }));
    expect(screen.getByText(riddleHint(2024))).toBeTruthy();
    expect(screen.getByRole('button', { name: decoy.text }).getAttribute('aria-pressed')).toBe('true');
    pick(decoy.text); pick(truths[2]!.text);
    fireEvent.click(screen.getByRole('button', { name: 'Dig' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: /Close exhumation/i })).toBeTruthy();
    const live = screen.getAllByRole('status').map((e) => e.textContent ?? '').join(' | ');
    expect(live).toContain('The Gravekeeper: Yes. All three, on G-10.');
  });
});
