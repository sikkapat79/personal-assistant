import { createCliRenderer } from '@opentui/core';
import { createRoot } from '@opentui/react';
import { AppRoot } from './tui/AppRoot';

const renderer = await createCliRenderer({ exitOnCtrlC: true, useKittyKeyboard: {} });
await renderer.setupTerminal();
createRoot(renderer).render(<AppRoot />);
