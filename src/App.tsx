// Loads the published data, then shows the opening (daylight → nightfall → graveyard, spec 04). On a load failure it shows an error stone
// instead of rendering invented values (spec 03, Requirement 2.2).
import { useEffect, useState } from 'react';
import * as copy from './copy/graveyard';
import { DataError, loadSeasons, loadTonight } from './data/load';
import type { SeasonsFile, TonightFile } from './data/types';
import { Opening } from './scenes/Opening';

type Loaded = { data: SeasonsFile; tonight: TonightFile | null };

export function App() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    Promise.all([loadSeasons(), loadTonight()])
      .then(([data, tonight]) => live && setLoaded({ data, tonight }))
      .catch((e: unknown) => live && setError(e instanceof DataError ? e.file : 'seasons.json'));
    return () => { live = false; };
  }, []);

  if (error) {
    return (
      <main role="alert" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050807' }}>
        <div style={{ textAlign: 'center', padding: '48px 40px 28px', border: '1px solid #3A3022', borderRadius: '140px 140px 8px 8px', background: 'linear-gradient(180deg, #161B19, #0A0E0D)', maxWidth: 420 }}>
          <p style={{ fontFamily: 'var(--font-fell-sc)', fontSize: 26, margin: '0 0 10px' }}>{copy.errors.title}</p>
          <p style={{ fontFamily: 'var(--font-fell)', fontStyle: 'italic', color: '#B8A880', margin: 0 }}>{copy.errors.detail(error)}</p>
        </div>
      </main>
    );
  }
  if (!loaded) return <main aria-busy="true" style={{ minHeight: '100vh', background: '#050807' }} />;
  return <Opening data={loaded.data} tonight={loaded.tonight} />;
}
