// The night graveyard scene (spec 03). Layout from Main.dc.html L105–490: header, headline band,
// map + right column, footer. Right column (task 7) and the candle timeline (task 8) follow.
import { useCallback, useMemo } from 'react';
import * as copy from '../copy/graveyard';
import {
  H, LANTERN_R, W, cardList, countList, creditLine, crossfade, exhumation, fireCallout, flakeCount, frames, graveCallout,
  graveViews, headlineFor, lanternNames, legendItems, registerNote, registerRows, riseMarks, sceneYear, tabList,
  tonightViews, tooltipFor, visibleFires, windowBand,
} from '../data/derive';
import { Exhumation } from '../components/Exhumation';
import { Compare, Lantern } from '../components/Lantern';
import { MASK_CLASS } from '../data/imagery';
import type { SeasonsFile, TonightFile } from '../data/types';
import { CandleTimeline } from '../components/CandleTimeline';
import { GraveCard } from '../components/GraveCard';
import { Header } from '../components/Header';
import { HeadlineBand } from '../components/HeadlineBand';
import { Legend } from '../components/Legend';
import { MapStack } from '../components/MapStack';
import { Register } from '../components/Register';
import { currentAudio } from '../audio/context';
import { playCreak } from '../audio/creak';
import { useGraveyard, type RisingEvent, type UIState } from './useGraveyard';

interface Props {
  data: SeasonsFile;
  tonight: TonightFile | null;
  /** Spec 04 Requirement 8.3: focus the headline when the scene opens after nightfall. */
  focusHeadline?: boolean;
  /** Seam for spec 06 (spec 05 Requirement 6.1). */
  onRising?: (e: RisingEvent) => void;
}

/** What time is doing, for the footer sub-label (spec 05 Requirement 9.5). */
function footerSub(st: UIState): string {
  if (!st.running) return copy.footer.over;
  if (st.cam) return copy.footer.rising;
  if (st.ex !== null || st.lantern.on || st.compare || st.dragging || !st.startGate) return copy.footer.waiting;
  return copy.footer.playing(st.speed);
}

export function Graveyard({ data, tonight, focusHeadline = false, onRising }: Props) {
  const { state: st, act } = useGraveyard({ seasons: data.seasons, onRising });
  const scene = st.scene === 'tonight' && !tonight ? 's2024' : st.scene;
  const isT = scene === 'tonight';
  const season = isT ? null : data.seasons[scene];
  const year = sceneYear(scene, tonight);

  const views = useMemo(() => (isT ? tonightViews(tonight!) : graveViews(season!, st.day)), [isT, tonight, season, st.day]);
  const fr = frames(scene, tonight);
  const weights = isT ? [1] : crossfade(st.day, fr.map((f) => f.day));
  const fires = season ? visibleFires(season.fires, st.day) : [];
  const head = headlineFor(scene, views, year);

  const selV = views.find((v) => v.id === st.selected) ?? views[0]!;
  const fireSel = season && st.fireSel ? season.fires.find((f) => f.id === st.fireSel) ?? null : null;
  // The board only hides the callout for exhumation and lantern; under the before/after split it showed
  // as a sliver at the divider, so it is hidden there too.
  // Spec 05: while the camera holds, the sting carries the news; a callout or tooltip would be scaled 2.4× with the map.
  const overlayOpen = st.ex !== null || st.lantern.on || (st.compare && !isT) || st.cam !== null;
  const callout = overlayOpen ? null : fireSel ? fireCallout(fireSel, year) : graveCallout(selV, year);
  const hovV = st.hover && !st.lantern.on && !st.cam ? views.find((v) => v.id === st.hover) : undefined;
  const tip = hovV ? tooltipFor(hovV, scene, year) : null;

  const comparing = st.compare && !isT;
  const shownWeights = comparing ? fr.map((_, i) => (i === fr.length - 1 ? 1 : 0)) : weights;
  let topFrame = 0;
  weights.forEach((w, i) => { if (w > (weights[topFrame] ?? 0)) topFrame = i; });
  const exV = st.ex ? views.find((v) => v.id === st.ex) : undefined;
  const ex = exV ? exhumation(exV, scene, st.day, year, tonight, data.meta.proximity_km) : null;
  const closeEx = useCallback(() => act({ type: 'exhume', id: null }), [act]);
  // Opening a stone creaks (spec 05 Requirement 5.5; board playCreak on grave click and card pick).
  const openEx = useCallback((id: string) => { playCreak(currentAudio()); act({ type: 'exhume', id }); }, [act]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!st.lantern.on) return;
    const r = e.currentTarget.getBoundingClientRect();
    act({ type: 'lanternMove', x: Math.round(((e.clientX - r.left) / r.width) * W), y: Math.round(((e.clientY - r.top) / r.height) * H), inside: true });
  };
  const onFocusGrave = (id: string) => {
    if (!st.lantern.on) return;
    const v = views.find((g) => g.id === id);
    if (v) act({ type: 'lanternMove', x: v.cx, y: v.cy, inside: true });
  };

  const overlays = (
    <>
      {comparing && (
        <Compare src={fr[0]!.src} night={st.night} split={st.split}
          left={copy.compare.left(fr[0]!.label, year)} right={copy.compare.right(fr[fr.length - 1]!.label, year)}
          onSplit={(n) => act({ type: 'split', split: n })} />
      )}
      {st.lantern.on && (
        <Lantern x={st.lantern.x} y={st.lantern.y} r={LANTERN_R} inside={st.lantern.inside} src={fr[topFrame]!.src}
          names={lanternNames(views, st.lantern.x, st.lantern.y)} />
      )}
    </>
  );

  return (
    <div style={{ width: '100%', minHeight: 900, boxSizing: 'border-box', background: '#050807', color: '#ECE6D6', fontFamily: 'var(--font-ui)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <Header
        tabs={tabList(data, tonight, scene)} onScene={(k) => act({ type: 'scene', scene: k })}
        lanternOn={st.lantern.on} compareOn={st.compare && !isT} compareDisabled={isT} night={st.night}
        onLantern={() => act({ type: 'lantern' })} onCompare={() => act({ type: 'compare' })} onNight={() => act({ type: 'night' })}
      />
      <HeadlineBand headline={head.headline} subline={head.subline} glow={head.glow} counts={countList(scene, views, tonight)} focusOnMount={focusHeadline} />

      <div style={{ display: 'flex', flexWrap: 'wrap', flex: '1 1 auto', alignItems: 'stretch' }}>
        <MapStack
          frames={fr} weights={shownWeights} night={st.night} maskClass={MASK_CLASS[scene]} graves={views} fires={fires}
          fireSel={st.fireSel} clusters={isT ? tonight!.clusters : []} selected={st.selected} hover={st.hover}
          callout={callout} tip={tip} flakes={flakeCount(scene, st.day)} credit={creditLine(scene, st.day, tonight, year)}
          cam={isT ? null : st.cam} sting={isT ? null : st.sting}
          onGrave={openEx} onFire={(id) => act({ type: 'selectFire', id })} onHover={(id) => act({ type: 'hover', id })}
          onFocusGrave={onFocusGrave} onMove={onMove}
          onLeave={() => st.lantern.on && act({ type: 'lanternMove', x: st.lantern.x, y: st.lantern.y, inside: false })}
          cursor={st.lantern.on ? 'none' : 'default'} overlays={overlays}
          panel={ex && <Exhumation ex={ex} onClose={closeEx} />}
        />
        {/* The aside takes the map's height and scrolls inside it (its content would otherwise stretch the row). */}
        <aside aria-label="Graves and parish register" style={{ flex: '1 1 340px', position: 'relative', minHeight: 480, background: '#070C0B' }}>
          <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', boxSizing: 'border-box', padding: '18px 20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Register rows={registerRows(data, scene)} note={registerNote(data)} onPick={(k) => act({ type: 'scene', scene: k })} />
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginTop: 4 }}>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-fell-sc)', fontWeight: 400, fontSize: 24, letterSpacing: 1 }}>{isT ? copy.list.tonightTitle : copy.list.title}</h2>
            <span style={{ fontFamily: 'var(--font-fell)', fontStyle: 'italic', fontSize: 13, color: '#A3ADA8' }}>{isT ? copy.list.tonightSub : copy.list.sub(year)}</span>
          </div>
          {cardList(scene, views, year).map((c) => (
            <GraveCard key={c.id} c={c} selected={st.selected === c.id} onPick={() => openEx(c.id)} />
          ))}
          <Legend {...legendItems(scene, data, tonight, year)} />
          </div>
        </aside>
      </div>

      {/* overflowX clip: the flame's 140 px glow is centred on the playhead and would widen the page at Jul 1 */}
      <footer style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 18, padding: '14px 28px 18px', borderTop: '1px solid #172120', boxSizing: 'border-box', background: 'linear-gradient(180deg, #080C0B, #040605)', overflowX: 'clip' }}>
        {isT ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 'none', minWidth: 160 }}>
            <span style={{ fontFamily: 'var(--font-fell-sc)', fontSize: 24 }}>{copy.footer.tonightDate(tonight!.asOf)}</span>
            <span style={{ fontFamily: 'var(--font-fell)', fontStyle: 'italic', fontSize: 13, color: '#A3ADA8' }}>{copy.footer.tonightSub(year)}</span>
          </div>
        ) : (
          <CandleTimeline
            speed={st.speed} day={st.day}
            dateLabel={copy.footer.date(year, st.day)} subLabel={footerSub(st)}
            marks={riseMarks(season!, st.day, year)} band={windowBand(selV.grave, year)}
            onSpeed={(s) => act({ type: 'speed', speed: s })}
            onScrub={(d) => act({ type: 'day', day: d })}
            onScrubStart={() => act({ type: 'scrubStart' })} onScrubEnd={() => act({ type: 'scrubEnd' })}
          />
        )}
        <span style={{ flexBasis: '100%', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 10.5, color: '#7C8884' }}>{copy.footerCredit(isT ? tonight!.credit : data.meta.credit)}</span>
      </footer>
    </div>
  );
}
