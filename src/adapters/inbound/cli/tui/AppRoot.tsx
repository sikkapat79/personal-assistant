import { App } from './App';
import type { Composition } from '../../../../composition';

interface AppRootProps {
  composeFn?: () => Promise<Composition>;
}

export function AppRoot({ composeFn }: AppRootProps) {
  return <App composeFn={composeFn} />;
}
