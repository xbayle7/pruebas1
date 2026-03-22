import { CONFIG } from './config.js';

export class Player {
  constructor(canvasHeight) {
    this.x = CONFIG.PLAYER_X;
    this.y = canvasHeight / 2;
    this.vy = 0;
    this.width = CONFIG.PLAYER_WIDTH;
    this.height = CONFIG.PLAYER_HEIGHT;
    this.alive = true;
    this.canvasHeight = canvasHeight;

    // Visual
    this.animFrame = 0;
    this.animTimer = 0;
    this.hitFlash = 0;

    // Shoot state
    this.lastShot = 0;
    this.muzzleFlash = 0;
  }

  jump() {
    if (!this.alive) return;
    this.vy = CONFIG.JUMP_FORCE;
  }

  canShoot(now) {
    return this.alive && (now - this.lastShot >= CONFIG.SHOOT_COOLDOWN);
  }

  shoot(now) {
    if (!this.canShoot(now)) return null;
    this.lastShot = now;
    this.muzzleFlash = 8;
    return {
      x: this.x + this.width,
      y: this.y + this.height / 2 - CONFIG.BULLET_HEIGHT / 2,
    };
  }

  update(dt) {
    if (!this.alive) return;

    this.vy += CONFIG.GRAVITY;
    if (this.vy > CONFIG.PLAYER_MAX_FALL) this.vy = CONFIG.PLAYER_MAX_FALL;
    this.y += this.vy;

    // Floor / ceiling clamp
    if (this.y < 0) { this.y = 0; this.vy = 0; }
    if (this.y + this.height > this.canvasHeight) {
      this.y = this.canvasHeight - this.height;
      this.die();
    }

    // Animation
    this.animTimer += dt;
    if (this.animTimer > 80) { this.animFrame ^= 1; this.animTimer = 0; }
    if (this.hitFlash > 0) this.hitFlash--;
    if (this.muzzleFlash > 0) this.muzzleFlash--;
  }

  die() {
    this.alive = false;
  }

  getBounds() {
    // Slightly shrunken hitbox for fairness
    return {
      x: this.x + 4,
      y: this.y + 4,
      w: this.width - 8,
      h: this.height - 8,
    };
  }

  draw(ctx) {
    const { x, y, width: w, height: h } = this;

    ctx.save();

    if (this.hitFlash > 0) {
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(this.hitFlash * 0.8);
    }

    // Engine glow trail
    const trailGrad = ctx.createRadialGradient(x, y + h / 2, 0, x, y + h / 2, 24);
    trailGrad.addColorStop(0, 'rgba(255,120,0,0.6)');
    trailGrad.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = trailGrad;
    ctx.beginPath();
    ctx.ellipse(x - 4, y + h / 2, 24, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = this.alive ? '#00d4ff' : '#ff2244';
    ctx.beginPath();
    ctx.moveTo(x + w, y + h / 2);
    ctx.lineTo(x + 2, y + 2);
    ctx.lineTo(x + 6, y + h / 2);
    ctx.lineTo(x + 2, y + h - 2);
    ctx.closePath();
    ctx.fill();

    // Cockpit
    ctx.fillStyle = this.alive ? '#00ffcc' : '#ff8888';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.55, y + h / 2, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wing
    ctx.fillStyle = '#0088bb';
    ctx.beginPath();
    ctx.moveTo(x + 8, y + h / 2);
    ctx.lineTo(x + 18, y + 2);
    ctx.lineTo(x + 22, y + h / 2);
    ctx.lineTo(x + 18, y + h - 2);
    ctx.closePath();
    ctx.fill();

    // Muzzle flash
    if (this.muzzleFlash > 0) {
      ctx.fillStyle = `rgba(255,220,80,${this.muzzleFlash / 8})`;
      ctx.beginPath();
      ctx.ellipse(x + w + 6, y + h / 2, 12, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
