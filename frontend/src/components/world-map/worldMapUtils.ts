export interface Point {
  x: number;
  y: number;
}

export function arc(from: Point, to: Point): { midX: number; midY: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const midX = (from.x + to.x) / 2 + (dy / dist) * 8;
  const midY = (from.y + to.y) / 2 - (dx / dist) * 8;
  return { midX, midY };
}
