#!/usr/bin/env bun
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const script = join(root, 'src/adapters/inbound/cli/index.ts');

const child = spawn('bun', ['run', script, ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true,
  cwd: root,
});
child.on('exit', (code) => process.exit(code ?? 0));
