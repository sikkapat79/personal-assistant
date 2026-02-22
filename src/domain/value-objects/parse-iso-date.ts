import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

const FORMAT = 'YYYY-MM-DD';

/**
 * Parse a string as strict YYYY-MM-DD and return the normalized date.
 * Throws if the input is not exactly in that format or is an invalid calendar date.
 */
export function parseStrictYyyyMmDd(value: string): string {
  const d = dayjs(value, FORMAT, true);
  if (!d.isValid()) {
    throw new Error(`expected YYYY-MM-DD, got ${value}`);
  }
  return d.format(FORMAT);
}
