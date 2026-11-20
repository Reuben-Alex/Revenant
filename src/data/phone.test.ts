// Spec 07 Properties 5 and 7 for the phone, and the page without and with a position.
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import fc from 'fast-check';
import { afterEach, describe, expect, it, vi } from 'vitest';
import seasonsRaw from '../../public/data/seasons.json';
import tonightRaw from '../../public/data/tonight.json';
import { Phone } from '../scenes/Phone';
import { lat, lon } from './format';
import { parseSeasons, parseTonight } from './load';
import { haversineKm, nearest, parsePhoneHash, phoneView, shareText } from './phone';

const DATA = parseSeasons(seasonsRaw);
const T = parseTonight(tonightRaw);
const posArb = fc.record({ lat: fc.double({ min: 50, max: 64, noNaN: true }), lon: fc.double({ min: -130, max: -105, noNaN: true }) });

describe('Spec 07 phone properties', () => {
  it('Property 7: nearest is nearest; haversine is symmetric and 0 at a point (Req 6.4)', () => {
    fc.assert(fc.property(posArb, fc.array(posArb, { minLength: 1, maxLength: 24 }), (p, pts) => {
      const n = nearest(p, pts)!;
      const d = haversineKm(p.lat, p.lon, n.lat, n.lon);
      for (const q of pts) expect(d).toBeLessThanOrEqual(haversineKm(p.lat, p.lon, q.lat, q.lon) + 1e-9);
      expect(haversineKm(p.lat, p.lon, n.lat, n.lon)).toBeCloseTo(haversineKm(n.lat, n.lon, p.lat, p.lon), 9);
      expect(haversineKm(p.lat, p.lon, p.lat, p.lon)).toBe(0);
    }), { numRuns: 300 });
    // One degree of latitude is about 111 km.
    expect(haversineKm(57, -120, 58, -120)).toBeCloseTo(111.19, 1);
  });

  it('Tonight lists the still-warm scars in watch order; springs list the risen graves (Req 6.2)', () => {
    const v = phoneView(DATA, T, 'tonight', null, null);
    const warm = T.watch.map((i) => T.scars[i]!).filter((s) => s.late > 0).map((s) => s.id);
    expect(v.items.map((i) => i.id)).toEqual(warm);
    expect(v.title).toBe('Nine scars were still warm in the last two weeks.');
    expect(v.cardLabel).toBe('TOP OF THE LIST');
    expect(v.items.every((i) => i.line2.includes('crews confirm'))).toBe(true);
    const s = phoneView(DATA, T, 's2024', null, null);
    expect(s.items).toHaveLength(14);
    expect(s.title).toBe('Fourteen graves rose in spring 2024.');
  });

  it('Property 5: phone text carries only published values; the card is the nearest with a position', () => {
    fc.assert(fc.property(posArb, fc.constantFrom('tonight', 's2024', 's2025', 's2026' as const), (p, scene) => {
      const v = phoneView(DATA, T, scene as never, p, null);
      if (!v.items.length) return;
      const best = nearest(p, v.items)!;
      expect(v.card!.id).toBe(best.id);
      expect(v.cardLabel).toBe(`NEAREST · ${Math.round(best.km!).toLocaleString('en-US')} km`);
      for (const i of v.items) {
        expect(i.lat).toBeCloseTo(lat(i.y), 9);
        expect(i.lon).toBeCloseTo(lon(i.x), 9);
      }
      const text = shareText(v, v.card!, 'Smoke', Date.parse('2026-11-20T12:00:00Z'));
      expect(text).toContain(`${v.card!.id} (`);
      expect(text).toContain('Not an official report. Send it to your agency.');
      expect(text).toContain('Seen: smoke.');
    }), { numRuns: 200 });
  });

  it('parsePhoneHash reads only #scene or #scene/G-nn', () => {
    expect(parsePhoneHash('#s2024/G-03')).toEqual({ scene: 's2024', id: 'G-03' });
    expect(parsePhoneHash('#tonight')).toEqual({ scene: 'tonight', id: null });
    for (const bad of ['', '#s2030', '#s2024/3', '?scene=tonight']) expect(parsePhoneHash(bad)).toBeNull();
  });

  it('a grave sent from the dossier is on the card', () => {
    const v = phoneView(DATA, T, 's2024', null, 'G-03');
    expect(v.card!.id).toBe('G-03');
    expect(v.cardLabel).toBe('SENT FROM THE DOSSIER');
  });
});

describe('The phone page', () => {
  afterEach(() => { vi.unstubAllGlobals(); window.location.hash = ''; });

  it('shows the top of the list until the viewer shares a position, then the nearest; the position stays local', async () => {
    const fetchMock = vi.fn(async (url: string) => new Response(JSON.stringify(String(url).includes('tonight') ? tonightRaw : seasonsRaw)));
    vi.stubGlobal('fetch', fetchMock);
    const getCurrentPosition = vi.fn((ok: PositionCallback) => ok({ coords: { latitude: 57.8, longitude: -118 } } as GeolocationPosition));
    vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } });
    render(createElement(Phone));
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('still warm in the last two weeks'));
    expect(screen.getByText(/TOP OF THE LIST/)).toBeTruthy();
    expect(screen.queryByText('YOU')).toBeNull();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Use my location' })); });
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/NEAREST · \d+ km/)).toBeTruthy();
    expect(screen.getByText('YOU')).toBeTruthy();
    // Only the two data files were fetched: the position is not sent anywhere.
    expect(fetchMock.mock.calls.map((c) => String(c[0]))).toEqual(['/data/seasons.json', '/data/tonight.json']);
    fireEvent.click(screen.getByRole('button', { name: 'Smoke' }));
    expect(screen.getByRole('button', { name: 'Smoke' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('link', { name: 'Navigate' }).getAttribute('href')).toMatch(/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=5\d\.\d+,-1\d\d\.\d+$/);
  });
});
