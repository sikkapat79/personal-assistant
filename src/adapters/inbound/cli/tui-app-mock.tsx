import { createCliRenderer } from '@opentui/core';
import { createRoot } from '@opentui/react';
import { AppRoot } from './tui/AppRoot';
import { composeMock } from '../../../composition-mock';

const renderer = await createCliRenderer({ exitOnCtrlC: true });
await renderer.setupTerminal();
createRoot(renderer).render(<AppRoot composeFn={composeMock} />);
