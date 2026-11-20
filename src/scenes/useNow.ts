// The viewer's clock for Tonight's staleness (spec 07 Requirement 1.3). It ticks once a minute, enough for a 48 h rule.
import { useEffect, useState } from 'react';

export function useNow(everyMs = 60000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}