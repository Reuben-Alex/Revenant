// The haunted tab (night only): while the page is hidden, the tab's title is `away` (a line about the graves on
// screen, kept current as the replay moves on) and its icon is lit. Coming back restores both. No motion is involved.
import { useEffect, useRef } from 'react';
import * as copy from '../copy/tab';
import { setIcon } from '../data/tab';

export function useHauntedTab(away: string, home: string) {
  const line = useRef(away);
  useEffect(() => {
    line.current = away;
    if (document.hidden) document.title = away;
  }, [away]);
  useEffect(() => {
    const apply = () => {
      document.title = document.hidden ? line.current : home;
      setIcon(document.hidden ? copy.icon.haunted : copy.icon.night);
    };
    document.addEventListener('visibilitychange', apply);
    return () => {
      document.removeEventListener('visibilitychange', apply);
      document.title = home;
      setIcon(copy.icon.night);
    };
  }, [home]);
}
