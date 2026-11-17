// Header: brand, season tombstone tabs, iron-plate buttons (Main.dc.html L106–129).
import * as copy from '../copy/graveyard';
import type { SceneKey } from '../data/types';
import { IronButton } from './IronButton';

export interface TabView { key: SceneKey; label: string; sub: string; on: boolean; tonight: boolean; disabled: boolean }

interface Props {
  tabs: TabView[];
  onScene: (k: SceneKey) => void;
  lanternOn: boolean;
  compareOn: boolean;
  compareDisabled: boolean;
  night: boolean;
  onLantern: () => void;
  onCompare: () => void;
  onNight: () => void;
}

function tabStyle(t: TabView): React.CSSProperties {
  const edge = t.tonight ? '#7FE0CF' : 'var(--ember)';
  return {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minHeight: 50, minWidth: 98, padding: '9px 14px 7px',
    borderRadius: '26px 26px 3px 3px', cursor: t.disabled ? 'not-allowed' : 'pointer', opacity: t.disabled ? 0.45 : 1,
    color: t.on ? '#F4EEE2' : '#AEB6B2', border: `1px solid ${t.on ? edge : '#2A3532'}`,
    background: `linear-gradient(180deg, ${t.on ? '#232B28' : '#161C1A'}, #0B0F0E)`,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 3px 0 -1px #030404' + (t.on ? `, 0 0 16px ${t.tonight ? 'rgba(127,224,207,0.2)' : 'rgba(255,107,44,0.2)'}` : ''),
    textShadow: '0 -1px 0 #000',
  };
}

export function Header(p: Props) {
  return (
    <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px 20px', padding: '12px 28px', borderBottom: '1px solid #172120', boxSizing: 'border-box', background: '#060A09' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <svg width="28" height="32" viewBox="0 0 28 32" aria-hidden="true">
          <path d="M3 31 V13 A11 11 0 0 1 25 13 V31 Z" style={{ fill: '#0E1513', stroke: '#ECE6D6', strokeWidth: 1.5 }} />
          <path d="M14 9 V21 M9.5 13.5 H18.5" style={{ stroke: 'var(--ember)', strokeWidth: 1.6 }} />
          <path d="M0 31 H28" style={{ stroke: '#4D5A55', strokeWidth: 1.5 }} />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontFamily: 'var(--font-fell-sc)', fontSize: 28, letterSpacing: 4, lineHeight: 1 }}>{copy.brand.name}</span>
          <span style={{ fontFamily: 'var(--font-fell)', fontStyle: 'italic', fontSize: 13.5, color: '#A3ADA8' }}>{copy.brand.tagline}</span>
        </div>
      </div>
      <nav aria-label="Season" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {p.tabs.map((t) => (
          <button key={t.key} type="button" className="rv-tab" aria-pressed={t.on} disabled={t.disabled} onClick={() => p.onScene(t.key)} style={tabStyle(t)}>
            <span style={{ fontFamily: 'var(--font-fell-sc)', fontSize: 17, lineHeight: 1 }}>{t.label}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: t.tonight ? '#7FE0CF' : t.on ? 'var(--ember)' : '#7C8884' }}>{t.sub}</span>
          </button>
        ))}
      </nav>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <IronButton on={p.lanternOn} pressed={p.lanternOn} onClick={p.onLantern}>
          <svg width="16" height="18" viewBox="0 0 16 18" aria-hidden="true">
            <path d="M5 3 H11 M8 1 V3 M4 5 H12 L13 14 H3 Z M3 14 H13 V16 H3 Z" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinejoin: 'round' }} />
            <path d="M8 8 C9.5 9.5 9.5 11.5 8 12 C6.5 11.5 6.5 9.5 8 8 Z" style={{ fill: 'var(--ember)' }} />
          </svg>
          {copy.buttons.lantern}
        </IronButton>
        <IronButton on={p.compareOn} pressed={p.compareOn} disabled={p.compareDisabled} onClick={p.onCompare}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 1 V15 M2 3 H14 V13 H2 Z" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.3 }} />
            <path d="M2 3 H8 V13 H2 Z" style={{ fill: 'currentColor', opacity: 0.35 }} />
          </svg>
          {copy.buttons.compare}
        </IronButton>
        <IronButton pressed={p.night} onClick={p.onNight}>{copy.buttons.night(p.night)}</IronButton>
      </div>
    </header>
  );
}
