// The haunted tab (night only): while the page is hidden, the tab's title and icon are `away` (built from the graves
// on screen, kept current as the replay moves on). Coming back restores both. No motion is involved.
import { useEffect, useRef } from 'react';
import * as copy from '../copy/tab';
import { setIcon, type Away } from '../data/tab';

export function useHauntedTab(away: Away, home: string) {
  const now = useRef(away);
  const { title, icon } = away;
  useEffect(() => {
    now.current = { title, icon };
    if (document.hidden) { document.title = title; setIcon(icon); }
  }, [title, icon]);
  useEffect(() => {
    const apply = () => {
      document.title = document.hidden ? now.current.title : home;
      setIcon(document.hidden ? now.current.icon : copy.icon.night);
    };
    document.addEventListener('visibilitychange', apply);
    return () => {
      document.removeEventListener('visibilitychange', apply);
      document.title = home;
      setIcon(copy.icon.night);
    };
  }, [home]);
}
