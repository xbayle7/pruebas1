import { CONFIG } from './config.js';

/**
 * A single obstacle column (top + bottom walls with a gap).
 * Each wall segment can be FIXED (indestructible) or DYNAMIC (shootable).
 */
export class Obstacle {
  constructor(x, canvasHeight, speed) {
    this.x = x;
    this.canvasHeight = canvasHeight;
    this.speed = speed;

    const gap = CONFIG.GAP_MIN + Math.random() * (CONFIG.GAP_MAX - CONFIG.GAP_MIN);
    const gapY = 60 + Math.random() * (canvasHeight - gap - 120);

    this.topH = gapY;
    this.botY = gapY + gap;
    this.botH = canvasHeight - this.botY;
    this.width = CONFIG.OBSTACLE_WIDTH;

    // Each column segment is independently typed
    this.topType = Math.random() < CONFIG.DYNAMIC_OBSTACLE_CHANCE ? 'dynamic' : 'fixed';
    this.botType = Math.random() < CONFIG.DYNAMIC_OBSTACLE_CHANCE ? 'dynamic' : 'fixed';

    this.topAlive = true;
    this.botAlive = true;
    this.scored = false;

    // Wobble for dynamic obstacles
    this.wobbleOffset = Math.random() * Math.PI * 2;
  }

  update(dt, speed) {
    this.speed = speed;
    this.x -= speed;
  }

  isOffScreen() {
    return this.x + this.width < 0;
  }

  /**
   * Returns hit segments: { part: 'top'|'bot', bounds }
   */
  getSegments() {
    const segs = [];
    if (this.topAlive && this.topH > 0) {
      segs.push({
        part: 'top',
        type: this.topType,
        bounds: { x: this.x, y: 0, w: this.width, h: this.topH },
      });
    }
    if (this.botAlive && this.botH > 0) {
      segs.push({
        part: 'bot',
        type: this.botType,
        bounds: { x: this.x, y: this.botY, w: this.width, h: this.botH },
      });
    }
    return segs;
  }

  destroyPart(part) {
    if (part === 'top') this.topAlive = false;
    else this.botAlive = false;
  }

  isFullyGone() {
    return !this.topAlive && !this.botAlive;
  }

  draw(ctx, time) {
    const t = time * 0.002;

    this._drawSegment(ctx, 'top', this.topType, this.topAlive, 0, 0, this.width, this.topH, t);
    this._drawSegment(ctx, 'bot', this.botType, this.botAlive, 0, this.botY, this.width, this.botH, t);

    // Gap danger line (subtle)
    if (this.topAlive || this.botAlive) {
      ctx.strokeStyle = 'rgba(255,100,0,0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(this.x + this.width / 2, this.topH);
      ctx.lineTo(this.x + this.width / 2, this.botY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  _drawSegment(ctx, _part, type, alive, _ox, segY, segW, segH, t) {
    if (!alive || segH <= 0) return;

    const x = this.x;
    const wobble = type === 'dynamic' ? Math.sin(t * 2 + this.wobbleOffset) * 3 : 0;

    if (type === 'fixed') {
      // Dark metallic wall
      const grad = ctx.createLinearGradient(x, 0, x + segW, 0);
      grad.addColorStop(0, '#1a1a3a');
      grad.addColorStop(0.4, '#2a2a5a');
      grad.addColorStop(1, '#111128');
      ctx.fillStyle = grad;
      ctx.fillRect(x, segY, segW, segH);

      // Edge highlight
      ctx.strokeStyle = '#444488';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, segY + 1, segW - 2, segH - 2);

      // Rivets
      ctx.fillStyle = '#5555aa';
      for (let ry = segY + 8; ry < segY + segH - 4; ry += 24) {
        ctx.beginPath();
        ctx.arc(x + 4, ry, 2, 0, Math.PI * 2);
        ctx.arc(x + segW - 4, ry, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Dynamic: glowing destructible block
      const pulse = 0.7 + 0.3 * Math.sin(t * 3 + this.wobbleOffset);
      ctx.fillStyle = `rgba(255,80,20,${0.5 * pulse})`;
      ctx.fillRect(x + wobble, segY, segW, segH);

      // Glow border
      ctx.strokeStyle = `rgba(255,150,50,${pulse})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + wobble + 1, segY + 1, segW - 2, segH - 2);

      // Warning stripes
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + wobble, segY, segW, segH);
      ctx.clip();
      ctx.strokeStyle = `rgba(255,200,0,${0.3 * pulse})`;
      ctx.lineWidth = 4;
      for (let sx = x - segH + wobble; sx < x + segW + wobble; sx += 14) {
        ctx.beginPath();
        ctx.moveTo(sx, segY);
        ctx.lineTo(sx + segH, segY + segH);
        ctx.stroke();
      }
      ctx.restore();

      // Shoot-me icon
      const cx = x + wobble + segW / 2;
      const cy = segY + Math.min(segH / 2, 20);
      ctx.fillStyle = `rgba(255,220,80,${pulse})`;
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✦', cx, cy);
    }
  }
}

export class ObstacleManager {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.obstacles = [];
    this.spawnTimer = 0;
    this.spawnInterval = CONFIG.SPAWN_INTERVAL_BASE;
  }

  reset() {
    this.obstacles = [];
    this.spawnTimer = 0;
    this.spawnInterval = CONFIG.SPAWN_INTERVAL_BASE;
  }

  update(dt, speed, difficulty) {
    this.spawnTimer += dt;

    // Shrink spawn interval as difficulty increases
    const interval = Math.max(
      CONFIG.SPAWN_INTERVAL_MIN,
      CONFIG.SPAWN_INTERVAL_BASE - difficulty * 600
    );
    this.spawnInterval = interval;

    if (this.spawnTimer >= interval) {
      this.spawnTimer = 0;
      this.obstacles.push(new Obstacle(this.canvasWidth + 20, this.canvasHeight, speed));
    }

    for (const obs of this.obstacles) {
      obs.update(dt, speed);
    }

    // Remove off-screen obstacles
    this.obstacles = this.obstacles.filter(o => !o.isOffScreen());
  }

  draw(ctx, time) {
    for (const obs of this.obstacles) {
      obs.draw(ctx, time);
    }
  }
}
