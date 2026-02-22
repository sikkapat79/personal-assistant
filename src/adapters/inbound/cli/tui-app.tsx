import { createCliRenderer } from '@opentui/core';
import { createRoot } from '@opentui/react';
import { AppRoot } from './tui/AppRoot';

const renderer = await createCliRenderer({ exitOnCtrlC: true });
createRoot(renderer).render(<AppRoot />);
