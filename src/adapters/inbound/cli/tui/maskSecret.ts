export function maskSecret(value: string | undefined): string {
  if (!value || value.length === 0) return 'Not set';
  if (value.length <= 8) return '***';
  return value.slice(0, 4) + '…' + value.slice(-4);
}
