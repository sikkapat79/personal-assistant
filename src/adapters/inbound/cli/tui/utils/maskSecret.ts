export function maskSecret(value: string | undefined): string {
  if (!value || value.length === 0) return 'Not set';
  return '****';
}
