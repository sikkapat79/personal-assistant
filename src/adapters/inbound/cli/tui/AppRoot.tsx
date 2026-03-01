import { useState } from 'react';
import { App } from './App';
import type { Composition } from '../../../../composition';

interface AppRootProps {
  composeFn?: () => Promise<Composition>;
}

export function AppRoot({ composeFn }: AppRootProps) {
  const [configVersion, setConfigVersion] = useState(0);
  return (
    <App
      key={configVersion}
      composeFn={composeFn}
      onConfigSaved={() => setConfigVersion((v) => v + 1)}
    />
  );
}
