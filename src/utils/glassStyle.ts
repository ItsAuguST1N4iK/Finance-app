/** Convert #RRGGBB to rgba with given alpha (1 = opaque) */
export function hexToRgba(hex: string, alpha: number): string {
  if (!hex.startsWith('#') || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * @param transparencyPct 0 = solid, 100 = most transparent
 * @param glassBorder optional theme-aware border color
 *
 * Important: when opaque (0%), do NOT override borderWidth — callers keep their
 * own borders (OLED cards otherwise vanish into pure black).
 */
export function glassStyle(
  baseColor: string,
  transparencyPct: number,
  glassBorder: string = 'rgba(255,255,255,0.12)',
): { backgroundColor: string; borderColor?: string; borderWidth?: number } {
  const t = Math.max(0, Math.min(100, transparencyPct));
  if (t <= 0) {
    return { backgroundColor: baseColor };
  }
  const alpha = 1 - t / 100 * 0.72;
  return {
    backgroundColor: hexToRgba(baseColor, alpha),
    borderColor: glassBorder,
    borderWidth: 1.25, // keep in sync with stroke.width in tokens
  };
}
