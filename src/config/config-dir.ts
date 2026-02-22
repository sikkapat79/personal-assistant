import { homedir, platform } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const PA_DIR = '.pa';

/**
 * Returns the config directory: ~/.pa or $XDG_CONFIG_HOME/pa on Linux.
 * Creates the directory if it does not exist.
 */
export function getConfigDir(): string {
  const dir =
    platform() === 'linux' && process.env.XDG_CONFIG_HOME
      ? join(process.env.XDG_CONFIG_HOME, 'pa')
      : join(homedir(), PA_DIR);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  return dir;
}
