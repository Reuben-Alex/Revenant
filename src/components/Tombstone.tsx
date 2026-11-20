// One grave on the map (Main.dc.html L179–208; values from renderVals() L898–956).
import { capPath, cracksPath, crossPath, handPath, lanternFlame, lanternIcon, markBody, markFlame, smokePath, steamPath, tombPath } from '../data/geometry';
import type { GraveView } from '../data/derive';

const SVG: React.CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' };
const ACC = 'var(--ember)';

interface Props {
  v: GraveView;
  selected: boolean;
  hovered: boolean;
  /** The cinematic draws its own, larger hand for this grave (board handWrap, L943). */
  hideHand?: boolean;
  /** Spec 06: the viewer marked this grave in the wager (board markWrap, L190–193). */
  marked?: boolean;
  /** Spec 07 Keep watch: the viewer set a lantern on this scar. */
  lantern?: boolean;
}

export function Tombstone({ v, selected, hovered, hideHand = false, marked = false, lantern = false }: Props) {
  const { cx, cy, rx, ry } = v;
  return (
    <svg viewBox="0 0 1060 716" aria-hidden="true" style={SVG}>
      {v.glow === 'waking' && (
        <circle className="rv-breathe" cx={cx} cy={cy} r={v.glowR}
          style={{ fill: '#7FE0CF', fillOpacity: v.glowOpacity, stroke: '#7FE0CF', strokeOpacity: 0.55, strokeWidth: 1 }} />
      )}
      {v.glow === 'warm' && (
        <circle className="rv-breathe" cx={cx} cy={cy} r={v.glowR}
          style={{ fill: '#E8A07A', fillOpacity: 0.12, stroke: '#E8A07A', strokeOpacity: 0.45, strokeWidth: 1 }} />
      )}
      {hovered && (
        <circle cx={cx} cy={cy} r={v.glowR} style={{ fill: 'none', stroke: '#ECE6D6', strokeWidth: 1.6, filter: 'drop-shadow(0 0 6px #ECE6D6)' }} />
      )}
      {v.link && (
        <path d={`M${cx} ${cy} L${rx} ${ry}`} style={{ fill: 'none', stroke: ACC, strokeOpacity: 0.5, strokeWidth: 1, strokeDasharray: '2 4' }} />
      )}
      <g className="rv-emerge" style={{ animationDelay: `${v.emergeDelay.toFixed(2)}s` }}>
        <g className="rv-stone" style={{ transform: `translateY(${v.sunk ? 5 : 0}px)`, opacity: v.sunk ? 0.45 : 1 }}>
          <path d={tombPath(cx, cy)} style={{ fill: v.fill, stroke: v.stroke, strokeWidth: 1.4 }} />
          <path d={crossPath(cx, cy)} style={{ fill: 'none', stroke: v.stroke, strokeWidth: 1.1 }} />
          {v.capOpacity > 0 && (
            <path d={capPath(cx, cy)} style={{ fill: 'none', stroke: '#F1F6F6', strokeWidth: 3, strokeLinecap: 'round', transition: 'opacity .6s', opacity: +v.capOpacity.toFixed(2) }} />
          )}
        </g>
      </g>
      {marked && (
        <g className="rv-pick">
          <path d={markBody(cx, cy)} style={{ fill: '#E9DFC8', stroke: '#6E1E12', strokeWidth: 0.8 }} />
          <path className="rv-candle" d={markFlame(cx, cy)} style={{ fill: '#FFB86B' }} />
        </g>
      )}
      {lantern && (
        <g className="rv-pick" transform={`translate(${cx + 13} ${cy - 1}) scale(0.62) translate(${-(cx + 13)} ${-(cy - 1)})`}>
          <path d={lanternIcon(cx + 13, cy - 1)} style={{ fill: '#1A120B', stroke: '#FFE7C2', strokeWidth: 1.6, strokeLinejoin: 'round' }} />
          <path className="rv-candle" d={lanternFlame(cx + 13, cy - 1)} style={{ fill: '#FFB86B' }} />
        </g>
      )}
      {v.thawing && (
        <>
          <path className="rv-thaw" d={steamPath(cx, cy)} style={{ fill: 'none', stroke: '#DCE8E8', strokeWidth: 2, strokeLinecap: 'round', opacity: 0.8 }} />
          <circle className="rv-drip" cx={cx + 8} cy={cy - 2} r={1.3} style={{ fill: '#BFE6F0' }} />
        </>
      )}
      {v.risen && (
        <>
          <circle className="rv-pulse" cx={rx} cy={ry} r={34} style={{ fill: 'none', stroke: ACC, strokeWidth: 1.6 }} />
          <circle cx={rx} cy={ry} r={20} style={{ fill: ACC, fillOpacity: 0.22, stroke: ACC, strokeOpacity: 0.6, strokeWidth: 1 }} />
          <path className="rv-crack" d={cracksPath(rx, ry)} style={{ fill: 'none', stroke: ACC, strokeWidth: 1.3, strokeLinecap: 'round' }} />
        </>
      )}
      {(v.risen || v.warm) && (
        <path className="rv-smoke" d={smokePath(rx, ry)} style={{ fill: 'none', stroke: '#E6DFD2', strokeWidth: v.warm ? 2.2 : 3.5, strokeLinecap: 'round' }} />
      )}
      {v.risen && !hideHand && (
        <g className="rv-rise">
          <path className="rv-hand" d={handPath(rx, ry, 1)} style={{ fill: 'none', stroke: ACC, strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }} />
        </g>
      )}
      {(v.risen || v.warm) && (
        <circle className="rv-ember" cx={rx - 8} cy={ry - 6} r={1.8} style={{ fill: v.risen ? ACC : '#E8A07A', animationDelay: v.risen ? '0s' : '.4s' }} />
      )}
      {v.risen && (
        <>
          <circle className="rv-ember" cx={rx + 5} cy={ry - 9} r={1.4} style={{ fill: '#FFB86B', animationDelay: '1.1s' }} />
          <circle className="rv-ember" cx={rx + 10} cy={ry - 3} r={2} style={{ fill: ACC, animationDelay: '2.2s' }} />
        </>
      )}
      {selected && <circle cx={cx} cy={cy} r={22} style={{ fill: 'none', stroke: '#ECE6D6', strokeWidth: 1.2, strokeDasharray: '2 3' }} />}
    </svg>
  );
}
