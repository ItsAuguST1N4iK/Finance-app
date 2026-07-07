/** Parse amount strings from bank exports (comma or dot decimals). */
export function parseAmount(value: string | undefined | null): number {
  if (!value) return 0;
  const cleaned = value.trim().replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}
