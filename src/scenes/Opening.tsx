// The opening (spec 04): daylight → nightfall → title card → the graveyard. One fixed path with no skip and
// sound always on (design.md, "Immersion decision"). Board: Main.dc.html nightfall() L676.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { playBell } from '../audio/bell';
import { playBoom } from '../audio/boom';
import { currentAudio, getAudio } from '../audio/context';
import { playDrone } from '../audio/drone';
import { startWind } from '../audio/wind';
import { TitleCard } from '../components/TitleCard';
import * as copy from '../copy/daylight';
import * as tabCopy from '../copy/tab';
import { daylightView } from '../data/daylight';
import { setIcon } from '../data/tab';
import { FRAME_SATELLITE, KEYFRAMES, MASK_CLASS } from '../data/imagery';
import type { SeasonsFile, TonightFile } from '../data/types';
import { Daylight } from './Daylight';
import { Graveyard } from './Graveyard';
import { useNightfall } from './useNightfall';

/** Faces used by the title card and the graveyard (index.html loads the same families). */
const NIGHT_FONTS = [
  '400 16px "IM Fell English SC"',
  '400 16px "IM Fell English"',
  'italic 400 16px "IM Fell English"',
  '400 16px "JetBrains Mono"',
  '500 16px "JetBrains Mono"',
];

interface Props {
  data: SeasonsFile;
  tonight: TonightFile | null;
  /** Seam for specs 05 and 06: called once when nightfall reaches night. */
  onNight?: () => void;
}

export function Opening({ data, tonight, onNight }: Props) {
  // Night arrives with the boom and one bell (spec 05 Requirement 5.4; board nightfall() L684), then any later seam.
  const arrive = useCallback(() => {
    playBoom(currentAudio());
    playBell(currentAudio(), 1);
    onNight?.();
  }, [onNight]);
  const { phase, nightfall } = useNightfall({ onNight: arrive });
  const keyframe = KEYFRAMES.s2024[0]!;
  const view = useMemo(() => daylightView(data.seasons.s2024, keyframe, FRAME_SATELLITE.s2024, data.static), [data, keyframe]);
  const daylit = phase === 'day' || phase === 'dusk';

  // Browsers fetch a web font only when text first uses it, so the night faces would arrive after the reveal
  // and flash in Georgia. Ask for them while the daylight view is up.
  useEffect(() => {
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
    if (!fonts?.load) return;
    for (const f of NIGHT_FONTS) fonts.load(f).catch(() => undefined);
  }, []);

  // Requirement 2.6: the tab keeps the agency name until the title card.
  // The icon follows: the agency's flame by day, the stone from the title card on.
  useEffect(() => {
    document.title = daylit ? copy.docTitle.day : copy.docTitle.night;
    setIcon(daylit ? tabCopy.icon.day : tabCopy.icon.night);
  }, [daylit]);

  // Sound starts inside the click: browsers allow audio only after a user gesture (Requirement 7.2).
  const started = useRef(false);
  const [fromNightfall, setFromNightfall] = useState(false);
  const onNightShift = useCallback(() => {
    if (started.current) return;
    started.current = true;
    setFromNightfall(true);
    const ac = getAudio();
    startWind(ac);
    playDrone(ac);
    nightfall();
  }, [nightfall]);

  if (daylit) {
    return <Daylight view={view} src={keyframe.src} maskClass={MASK_CLASS.s2024} dusk={phase === 'dusk'} onNightShift={onNightShift} />;
  }
  if (phase === 'title') return <TitleCard staticLine={view.text.titleLine2} />;
  return <Graveyard data={data} tonight={tonight} focusHeadline={fromNightfall} greet={fromNightfall} />;
}
