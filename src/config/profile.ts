import { join } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { getConfigDir } from './config-dir';

export interface Profile {
  displayName: string;
}

const DEFAULT_DISPLAY_NAME =
  process.env.USER || process.env.USERNAME || 'there';

const FILENAME = 'profile.json';

function profilePath(): string {
  return join(getConfigDir(), FILENAME);
}

/**
 * Load profile from ~/.pa/profile.json. Returns defaults for missing file or fields.
 */
export function loadProfile(): Profile {
  const path = profilePath();
  try {
    const raw = readFileSync(path, 'utf-8');
    const data = JSON.parse(raw) as Partial<Profile>;
    return {
      displayName: data.displayName ?? DEFAULT_DISPLAY_NAME,
    };
  } catch {
    return { displayName: DEFAULT_DISPLAY_NAME };
  }
}

/**
 * Save profile to ~/.pa/profile.json.
 */
export function saveProfile(profile: Profile): void {
  const path = profilePath();
  writeFileSync(path, JSON.stringify(profile, null, 2), { mode: 0o600 });
}
