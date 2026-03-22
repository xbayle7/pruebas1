import { CONFIG } from './config.js';

export class Player {
  constructor(canvasHeight) {
    this.x = CONFIG.PLAYER_X;
    this.y = canvasHeight / 2;
    this.vy = 0;
    this.width  = CONFIG.PLAYER_WIDTH;
    this.height = CONFIG.PLAYER_HEIGHT;
    this.alive  = true;
    this.canvasHeight = canvasHeight;

    this.animTimer    = 0;
    this._thrustPhase = 0;
    this.muzzleFlash  = 0;
    this.lastShot     = 0;      // timestamp of last individual shot
    this.lastBurst    = -9999;  // timestamp of burst start
    this._burstCount  = 0;      // shots fired in current burst

    // Invincibility after taking damage (ms)
    this.invincible = 0;
  }

  jump() {
    if (!this.alive) return;
    this.vy = CONFIG.JUMP_FORCE;
  }

  takeDamage() {
    this.invincible = 1800; // 1.8 s of invincibility
  }

  isInvincible() {
    return this.invincible > 0;
  }

  /**
   * Call every frame. Returns a spawn position if a shot fires, else null.
   * Burst logic: up to BURST_SIZE shots per burst, BURST_INTERVAL ms apart.
   * A new burst starts only after BURST_COOLDOWN ms since the burst began.
   */
  shoot(now) {
    if (!this.alive) return null;

    const inBurst   = this._burstCount > 0 && this._burstCount < CONFIG.BURST_SIZE;
    const burstReady = (now - this.lastBurst) >= CONFIG.BURST_COOLDOWN;
    const shotReady  = (now - this.lastShot)  >= CONFIG.BURST_INTERVAL;

    if (!inBurst && !burstReady) return null;   // waiting for burst cooldown
    if (!shotReady) return null;                // waiting between shots

    if (!inBurst) {
      // Start a new burst
      this.lastBurst   = now;
      this._burstCount = 0;
    }

    this.lastShot    = now;
    this._burstCount++;
    this.muzzleFlash = 6;
    return {
      x: this.x + this.width,
      y: this.y + this.height / 2 - CONFIG.BULLET_HEIGHT / 2,
    };
  }

  /** For the on-press event: reset burst so pressing always fires a new burst immediately */
  triggerBurst(now) {
    this.lastBurst   = now - CONFIG.BURST_COOLDOWN;
    this._burstCount = 0;
  }

  update(dt) {
    if (!this.alive) return;

    const s = dt / 16.67;
    this.vy += CONFIG.GRAVITY * s;
    if (this.vy > CONFIG.PLAYER_MAX_FALL) this.vy = CONFIG.PLAYER_MAX_FALL;
    this.y += this.vy * s;

    const floor = this.canvasHeight - CONFIG.FLOOR_HEIGHT;
    if (this.y < 0)                        { this.y = 0; this.vy = 0; }
    if (this.y + this.height > floor) {
      this.y  = floor - this.height;
      this.vy = 0;
    }

    if (this.invincible > 0)   this.invincible  -= dt;
    if (this.muzzleFlash > 0)  this.muzzleFlash--;
    this.animTimer    += dt;
    this._thrustPhase += dt * 0.012;
  }

  die() { this.alive = false; }

  getBounds() {
    return { x: this.x + 4, y: this.y + 3, w: this.width - 8, h: this.height - 6 };
  }

  draw(ctx) {
    if (!this.alive) return;

    // Flicker when invincible
    if (this.invincible > 0) {
      const flicker = Math.sin(this.invincible * 0.03) > 0;
      if (!flicker) return;
    }

    const { x, y, width: w, height: h } = this;
    ctx.save();

    const tp    = this._thrustPhase;
    const fSize = 10 + 5 * Math.abs(Math.sin(tp));

    // Dual engine flames
    const drawFlame = (cy) => {
      const fg = ctx.createRadialGradient(x - 2, cy, 0, x - 4, cy, fSize);
      fg.addColorStop(0,    'rgba(255,255,180,0.95)');
      fg.addColorStop(0.25, 'rgba(255,140,20,0.8)');
      fg.addColorStop(0.6,  'rgba(255,60,0,0.4)');
      fg.addColorStop(1,    'rgba(255,30,0,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.ellipse(x - 3, cy, fSize, fSize * 0.42, Math.PI, 0, Math.PI * 2);
      ctx.fill();
    };
    drawFlame(y + h * 0.27);
    drawFlame(y + h * 0.73);

    // Hull body
    const bg = ctx.createLinearGradient(x, y, x, y + h);
    bg.addColorStop(0,   '#1e90b8');
    bg.addColorStop(0.5, '#1a7a9e');
    bg.addColorStop(1,   '#0f4f6a');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(x + w,        y + h * 0.5);
    ctx.lineTo(x + w * 0.18, y + h * 0.08);
    ctx.lineTo(x + w * 0.04, y + h * 0.18);
    ctx.lineTo(x + w * 0.04, y + h * 0.82);
    ctx.lineTo(x + w * 0.18, y + h * 0.92);
    ctx.closePath();
    ctx.fill();

    // Hull edge highlight
    ctx.strokeStyle = 'rgba(0,220,255,0.75)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x + w, y + h * 0.5);
    ctx.lineTo(x + w * 0.18, y + h * 0.08);
    ctx.stroke();

    // Upper wing
    const wg = ctx.createLinearGradient(x, y, x, y + h * 0.4);
    wg.addColorStop(0, '#115577');
    wg.addColorStop(1, '#0a3a55');
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.14, y + h * 0.14);
    ctx.lineTo(x + w * 0.58, y);
    ctx.lineTo(x + w * 0.68, y + h * 0.32);
    ctx.lineTo(x + w * 0.14, y + h * 0.36);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,180,255,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Lower wing
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.14, y + h * 0.86);
    ctx.lineTo(x + w * 0.58, y + h);
    ctx.lineTo(x + w * 0.68, y + h * 0.68);
    ctx.lineTo(x + w * 0.14, y + h * 0.64);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,180,255,0.4)';
    ctx.stroke();

    // Cockpit glow
    const cg = ctx.createRadialGradient(x + w * 0.64, y + h * 0.42, 1, x + w * 0.66, y + h * 0.5, 8);
    cg.addColorStop(0,   'rgba(180,255,240,0.95)');
    cg.addColorStop(0.5, 'rgba(0,220,190,0.8)');
    cg.addColorStop(1,   'rgba(0,150,130,0.4)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.66, y + h * 0.5, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Muzzle flash
    if (this.muzzleFlash > 0) {
      const a  = this.muzzleFlash / 6;
      const mg = ctx.createRadialGradient(x + w + 4, y + h * 0.5, 0, x + w + 4, y + h * 0.5, 18);
      mg.addColorStop(0,   `rgba(255,255,180,${a})`);
      mg.addColorStop(0.4, `rgba(255,180,20,${a * 0.6})`);
      mg.addColorStop(1,   'rgba(255,100,0,0)');
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.ellipse(x + w + 4, y + h * 0.5, 18, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
