import { openSync, writeSync, closeSync, readFileSync } from 'fs';
import { join } from 'path';
import { getConfigDir } from '../../../config/config-dir';

const DEVICE_ID_FILENAME = 'device-id';

export function getDeviceId(): string {
  const configDir = getConfigDir();
  const deviceIdPath = join(configDir, DEVICE_ID_FILENAME);

  // Atomic exclusive create — 'wx' fails with EEXIST if the file already exists,
  // avoiding the TOCTOU race between existsSync and writeFileSync.
  const newDeviceId = crypto.randomUUID();
  try {
    const fd = openSync(deviceIdPath, 'wx', 0o600);
    writeSync(fd, newDeviceId);
    closeSync(fd);
    return newDeviceId;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
    return readFileSync(deviceIdPath, 'utf-8').trim();
  }
}
