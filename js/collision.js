/**
 * Axis-Aligned Bounding Box (AABB) intersection test.
 * All bounds: { x, y, w, h }
 */
export function aabb(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/**
 * Check bullets vs obstacle segments.
 * Returns array of { bulletIndex, obstacle, part } for hits.
 */
export function checkBulletObstacle(bullets, obstacles) {
  const hits = [];
  for (let bi = 0; bi < bullets.length; bi++) {
    const b = bullets[bi];
    if (!b.alive) continue;
    const bb = b.getBounds();
    for (const obs of obstacles) {
      for (const seg of obs.getSegments()) {
        if (seg.type === 'dynamic' && aabb(bb, seg.bounds)) {
          hits.push({ bulletIndex: bi, obstacle: obs, part: seg.part });
          b.alive = false;
          break;
        }
      }
    }
  }
  return hits;
}

/**
 * Check player vs all obstacle segments.
 * Returns true if collision found.
 */
export function checkPlayerObstacle(player, obstacles) {
  if (!player.alive) return false;
  const pb = player.getBounds();
  for (const obs of obstacles) {
    for (const seg of obs.getSegments()) {
      if (aabb(pb, seg.bounds)) return true;
    }
  }
  return false;
}
