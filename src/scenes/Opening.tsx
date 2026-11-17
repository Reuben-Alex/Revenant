// The opening (spec 04): daylight → nightfall → title card → the graveyard. One fixed path with no skip and
// sound always on (design.md, "Immersion decision"). Board: Main.dc.html nightfall() L676.
import { useCallback, useMemo, useRef } from 'react';
import { getAudio } from '../audio/context';
import { playDrone } from '../audio/drone';
import { startWind } from '../audio/wind';
import { daylightView } from '../data/daylight';
import { FRAME_SATELLITE, KEYFRAMES, MASK_CLASS } from '../data/imagery';
import type { SeasonsFile, TonightFile } from '../data/types';
import { Daylight } from './Daylight';
import { Graveyard } from './Graveyard';
import { useNightfall } from './useNightfall';

interface Props {
  data: SeasonsFile;
  tonight: TonightFile | null;
  /** Seam for specs 05 and 06: called once when nightfall reaches night. */
  onNight?: () => void;
}

export function Opening({ data, tonight, onNight }: Props) {
  const { phase, nightfall } = useNightfall({ onNight });
  const keyframe = KEYFRAMES.s2024[0]!;
  const view = useMemo(() => daylightView(data.seasons.s2024, keyframe, FRAME_SATELLITE.s2024, data.static), [data, keyframe]);

  // Sound starts inside the click: browsers allow audio only after a user gesture (Requirement 7.2).
  const started = useRef(false);
  const onNightShift = useCallback(() => {
    if (started.current) return;
    started.current = true;
    const ac = getAudio();
    startWind(ac);
    playDrone(ac);
    nightfall();
  }, [nightfall]);

  if (phase === 'day' || phase === 'dusk') {
    return <Daylight view={view} src={keyframe.src} maskClass={MASK_CLASS.s2024} dusk={phase === 'dusk'} onNightShift={onNightShift} />;
  }
  if (phase === 'title') {
    // The title card (task 5.2) goes here; until then the 6 s beat is a black screen.
    return <div aria-busy="true" style={{ minHeight: '100vh', background: '#020303' }} />;
  }
  return <Graveyard data={data} tonight={tonight} />;
}
