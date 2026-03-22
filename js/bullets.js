import { CONFIG } from './config.js';

export class Bullet {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = CONFIG.BULLET_WIDTH;
    this.height = CONFIG.BULLET_HEIGHT;
    this.alive = true;
  }

  update() {
    this.x += CONFIG.BULLET_SPEED;
    if (this.x > 2000) this.alive = false;
  }

  getBounds() {
    return { x: this.x, y: this.y, w: this.width, h: this.height };
  }

  draw(ctx) {
    if (!this.alive) return;

    // Glow
    const grd = ctx.createRadialGradient(
      this.x + this.width / 2, this.y + this.height / 2, 0,
      this.x + this.width / 2, this.y + this.height / 2, this.width
    );
    grd.addColorStop(0, 'rgba(255,220,80,0.9)');
    grd.addColorStop(0.5, 'rgba(255,120,20,0.5)');
    grd.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.ellipse(
      this.x + this.width / 2,
      this.y + this.height / 2,
      this.width, this.height * 1.5,
      0, 0, Math.PI * 2
    );
    ctx.fill();

    // Core
    ctx.fillStyle = '#ffffaa';
    ctx.beginPath();
    ctx.ellipse(
      this.x + this.width / 2,
      this.y + this.height / 2,
      this.width * 0.6, this.height * 0.5,
      0, 0, Math.PI * 2
    );
    ctx.fill();
  }
}

export class BulletManager {
  constructor() {
    this.bullets = [];
  }

  reset() {
    this.bullets = [];
  }

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
