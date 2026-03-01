import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { getConfigDir } from '../../../config/config-dir';

const DEVICE_ID_FILENAME = 'device-id';

export function getDeviceId(): string {
  const configDir = getConfigDir();
  const deviceIdPath = join(configDir, DEVICE_ID_FILENAME);

  if (existsSync(deviceIdPath)) {
    return readFileSync(deviceIdPath, 'utf-8').trim();
  }

  const newDeviceId = crypto.randomUUID();
  const dir = dirname(deviceIdPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  writeFileSync(deviceIdPath, newDeviceId, { encoding: 'utf-8', mode: 0o600 });
  return newDeviceId;
}
