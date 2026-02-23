/**
 * Formats a bigint amount (18 decimals) into a compact human-readable string.
 * e.g. 8_669_106_870_000_000_000_000_000n → "8.67M"
 */
export function formatClawdia(raw: bigint): string {
  const whole = Number(raw / 10n ** 18n);
  if (whole >= 1_000_000) return `${(whole / 1_000_000).toFixed(2)}M`;
  if (whole >= 1_000) return `${(whole / 1_000).toFixed(1)}K`;
  return whole.toLocaleString();
}
