import { useState } from 'react';
import { App } from './App';

export function AppRoot() {
  const [configVersion, setConfigVersion] = useState(0);
  return <App key={configVersion} onConfigSaved={() => setConfigVersion((v) => v + 1)} />;
}
