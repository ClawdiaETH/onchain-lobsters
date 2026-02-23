/**
 * Formats a bigint amount (18 decimals) into a compact human-readable string.
 * Uses BigInt arithmetic throughout to avoid Number overflow for large values.
 * e.g. 8_669_106_870_000_000_000_000_000n → "8.67M"
 */
export function formatClawdia(raw: bigint): string {
  const DECIMALS = 18n;
  const MILLION = 10n ** 6n;
  const THOUSAND = 10n ** 3n;

  const whole = raw / 10n ** DECIMALS;

  if (whole >= MILLION) {
    const scaled = (whole * 100n + MILLION / 2n) / MILLION;
    const int = scaled / 100n;
    const dec = scaled % 100n;
    return `${int}.${dec.toString().padStart(2, "0")}M`;
  }

  if (whole >= THOUSAND) {
    const scaled = (whole * 10n + THOUSAND / 2n) / THOUSAND;
    const int = scaled / 10n;
    const dec = scaled % 10n;
    return `${int}.${dec}K`;
  }

  return Number(whole).toLocaleString();
}
