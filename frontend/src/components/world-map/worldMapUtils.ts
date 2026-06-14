export interface Point {
  x: number;
  y: number;
}

/**
 * Quadratic Bézier control point for a smooth arc between two hubs.
 * Curvature is proportional to distance so routes never look jagged
 * or flat regardless of how far apart the hubs are.
 */
export function arc(from: Point, to: Point): { midX: number; midY: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const offset = Math.min(dist * 0.22, 160);
  const midX = (from.x + to.x) / 2 + (dy / dist) * offset;
  const midY = (from.y + to.y) / 2 - (dx / dist) * offset;
  return { midX, midY };
}
