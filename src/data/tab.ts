// The haunted tab's line (pure). Replays: the grave that thawed most recently and is still waking, else how many
// have risen, else whether they lie buried or at rest. Tonight: how many scars are still warm.
import * as copy from '../copy/tab';
import type { GraveView } from './derive';

export interface Away { title: string; icon: string }

/** Replays: once any grave has risen, "They are awake (n)" under a burning hand; before that, the most recent thaw
 *  still waking, else buried or at rest. Tonight: how many scars are still warm. */
export function awayLine(views: GraveView[], tonight: boolean): Away {
  if (tonight) {
    const warm = views.filter((v) => v.warm).length;
    return { title: warm ? copy.away.warm(warm) : copy.away.sleeping, icon: copy.icon.haunted };
  }
  const risen = views.filter((v) => v.risen).length;
  if (risen) return { title: copy.away.awake(risen), icon: copy.icon.risen };
  // `since` counts days from the state's start, so the smallest is the most recent thaw.
  const waking = views.filter((v) => v.st === 'waking').sort((a, b) => a.since - b.since || a.id.localeCompare(b.id));
  if (waking.length) return { title: copy.away.waking(waking[0]!.id), icon: copy.icon.haunted };
  return { title: views.some((v) => v.st === 'buried') ? copy.away.buried : copy.away.rest, icon: copy.icon.haunted };
}

/** Points the page's icon link at `href` (the link is in each page's head; one is added if it is missing). */
export function setIcon(href: string): void {
  if (typeof document === 'undefined') return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    document.head.appendChild(link);
  }
  if (link.getAttribute('href') !== href) link.setAttribute('href', href);
}
