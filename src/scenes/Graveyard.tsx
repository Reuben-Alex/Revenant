// The night graveyard scene (spec 03). Layout from Main.dc.html L105–490: header, headline band,
// map + right column, footer. Right column (task 7) and the candle timeline (task 8) follow.
import { useMemo } from 'react';
import * as copy from '../copy/graveyard';
import {
  countList, creditLine, crossfade, fireCallout, flakeCount, frames, graveCallout, graveViews, headlineFor, sceneYear,
  tabList, tonightViews, tooltipFor, visibleFires,
} from '../data/derive';
import { MASK_CLASS } from '../data/imagery';
import type { SeasonsFile, TonightFile } from '../data/types';
import { Header } from '../components/Header';
import { HeadlineBand } from '../components/HeadlineBand';
import { MapStack } from '../components/MapStack';
import { useGraveyard } from './useGraveyard';

interface Props {
  data: SeasonsFile;
  tonight: TonightFile | null;
}

export function Graveyard({ data, tonight }: Props) {
  const { state: st, act } = useGraveyard();
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
  const overlayOpen = st.ex !== null || st.lantern.on;
  const callout = overlayOpen ? null : fireSel ? fireCallout(fireSel, year) : graveCallout(selV, year);
  const hovV = st.hover && !st.lantern.on ? views.find((v) => v.id === st.hover) : undefined;
  const tip = hovV ? tooltipFor(hovV, scene, year) : null;

  return (
    <div style={{ width: '100%', minHeight: 900, boxSizing: 'border-box', background: '#050807', color: '#ECE6D6', fontFamily: 'var(--font-ui)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <Header
        tabs={tabList(data, tonight, scene)} onScene={(k) => act({ type: 'scene', scene: k })}
        lanternOn={st.lantern.on} compareOn={st.compare && !isT} compareDisabled={isT} night={st.night}
        onLantern={() => act({ type: 'lantern' })} onCompare={() => act({ type: 'compare' })} onNight={() => act({ type: 'night' })}
      />
      <HeadlineBand headline={head.headline} subline={head.subline} glow={head.glow} counts={countList(scene, views, tonight)} />

      <div style={{ display: 'flex', flexWrap: 'wrap', flex: '1 1 auto', alignItems: 'stretch' }}>
        <MapStack
          frames={fr} weights={weights} night={st.night} maskClass={MASK_CLASS[scene]} graves={views} fires={fires}
          fireSel={st.fireSel} clusters={isT ? tonight!.clusters : []} selected={st.selected} hover={st.hover}
          callout={callout} tip={tip} flakes={flakeCount(scene, st.day)} credit={creditLine(scene, st.day, tonight, year)}
          onGrave={(id) => act({ type: 'select', id })} onFire={(id) => act({ type: 'selectFire', id })} onHover={(id) => act({ type: 'hover', id })}
        />
        <aside aria-label="Graves and parish register" style={{ flex: '1 1 340px', maxHeight: 860, overflowY: 'auto', boxSizing: 'border-box', padding: '18px 20px 24px', display: 'flex', flexDirection: 'column', gap: 12, background: '#070C0B' }} />
      </div>

      <footer style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 18, padding: '14px 28px 18px', borderTop: '1px solid #172120', boxSizing: 'border-box', background: 'linear-gradient(180deg, #080C0B, #040605)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 'none', minWidth: 160 }}>
          <span style={{ fontFamily: 'var(--font-fell-sc)', fontSize: 24 }}>{isT ? copy.footer.tonightDate(tonight!.asOf) : copy.footer.date(year, st.day)}</span>
          <span style={{ fontFamily: 'var(--font-fell)', fontStyle: 'italic', fontSize: 13, color: '#A3ADA8' }}>{isT ? copy.footer.tonightSub(year) : copy.footer.paused}</span>
        </div>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10.5, color: '#7C8884' }}>{copy.footerCredit(isT ? tonight!.credit : data.meta.credit)}</span>
      </footer>
    </div>
  );
}
