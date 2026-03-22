import { CONFIG } from './config.js';

export class Bullet {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width  = CONFIG.BULLET_WIDTH;
    this.height = CONFIG.BULLET_HEIGHT;
    this.alive  = true;
  }

  update() {
    this.x += CONFIG.BULLET_SPEED;
    if (this.x > 3000) this.alive = false;
  }

  getBounds() {
    return { x: this.x, y: this.y, w: this.width, h: this.height };
  }

  draw(ctx) {
    if (!this.alive) return;
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    // Outer glow
    const glow = ctx.createLinearGradient(this.x, cy, this.x + this.width, cy);
    glow.addColorStop(0,   'rgba(255,100,0,0)');
    glow.addColorStop(0.2, 'rgba(255,200,50,0.5)');
    glow.addColorStop(0.5, 'rgba(255,240,120,0.8)');
    glow.addColorStop(0.8, 'rgba(255,200,50,0.5)');
    glow.addColorStop(1,   'rgba(255,100,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(cx, cy, this.width * 0.6, this.height * 2.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Core laser beam
    const core = ctx.createLinearGradient(this.x, 0, this.x + this.width, 0);
    core.addColorStop(0,   'rgba(255,220,80,0.3)');
    core.addColorStop(0.15,'rgba(255,255,200,1)');
    core.addColorStop(0.85,'rgba(255,255,200,1)');
    core.addColorStop(1,   'rgba(255,220,80,0.3)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.ellipse(cx, cy, this.width * 0.55, this.height * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hot center dot
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 4, this.height * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class BulletManager {
  constructor() { this.bullets = []; }
  reset()       { this.bullets = []; }

  spawn(x, y) {
    this.bullets.push(new Bullet(x, y));
  }

  update() {
    for (const b of this.bullets) b.update();
    this.bullets = this.bullets.filter(b => b.alive);
  }

  draw(ctx) {
    for (const b of this.bullets) b.draw(ctx);
  }
}
