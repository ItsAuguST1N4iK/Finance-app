export function smoothBezierPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;

  const tension = 0.35;
  let d = `M ${pts[0].x},${pts[0].y}`;

  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const pp   = pts[Math.max(0, i - 2)];
    const next = pts[Math.min(pts.length - 1, i + 1)];

    const cp1x = prev.x + tension * (curr.x - pp.x) / 2;
    const cp1y = prev.y + tension * (curr.y - pp.y) / 2;
    const cp2x = curr.x - tension * (next.x - prev.x) / 2;
    const cp2y = curr.y - tension * (next.y - prev.y) / 2;

    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${curr.x},${curr.y}`;
  }
  return d;
}
