import { createCliRenderer } from '@opentui/core';
import { createRoot } from '@opentui/react';
import { AppMock } from './tui/AppMock';

const renderer = await createCliRenderer({ exitOnCtrlC: true });
await renderer.setupTerminal();
createRoot(renderer).render(<AppMock />);
