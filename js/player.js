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

  get isBursting() {
    return this._burstCount > 0 && this._burstCount < CONFIG.BURST_SIZE;
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
    const fSize = 13 + 6 * Math.abs(Math.sin(tp));

    // === Engine exhaust — wide cyan-white plume ===
    const eg = ctx.createRadialGradient(x, y + h * 0.5, 0, x - fSize * 0.6, y + h * 0.5, fSize);
    eg.addColorStop(0,    'rgba(220,255,255,1)');
    eg.addColorStop(0.2,  'rgba(80,210,255,0.85)');
    eg.addColorStop(0.55, 'rgba(20,100,220,0.35)');
    eg.addColorStop(1,    'rgba(0,40,180,0)');
    ctx.fillStyle = eg;
    ctx.beginPath();
    ctx.ellipse(x - 2, y + h * 0.5, fSize, fSize * 0.38, Math.PI, 0, Math.PI * 2);
    ctx.fill();

    // === Upper swept wing ===
    ctx.beginPath();
    ctx.moveTo(x + w * 0.38, y + h * 0.28);  // wing root front
    ctx.lineTo(x + w * 0.55, y - h * 0.28);  // wing tip (above)
    ctx.lineTo(x + w * 0.20, y - h * 0.05);  // tip back edge
    ctx.lineTo(x + w * 0.08, y + h * 0.32);  // wing root back
    ctx.closePath();
    const uwg = ctx.createLinearGradient(x, y - h * 0.3, x, y + h * 0.3);
    uwg.addColorStop(0, '#3a1060');
    uwg.addColorStop(1, '#1e0840');
    ctx.fillStyle = uwg;
    ctx.fill();
    ctx.strokeStyle = 'rgba(180,80,255,0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // === Lower swept wing ===
    ctx.beginPath();
    ctx.moveTo(x + w * 0.38, y + h * 0.72);
    ctx.lineTo(x + w * 0.55, y + h * 1.28);
    ctx.lineTo(x + w * 0.20, y + h * 1.05);
    ctx.lineTo(x + w * 0.08, y + h * 0.68);
    ctx.closePath();
    const lwg = ctx.createLinearGradient(x, y + h * 0.7, x, y + h * 1.3);
    lwg.addColorStop(0, '#1e0840');
    lwg.addColorStop(1, '#3a1060');
    ctx.fillStyle = lwg;
    ctx.fill();
    ctx.strokeStyle = 'rgba(180,80,255,0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // === Main hull body ===
    ctx.beginPath();
    ctx.moveTo(x + w,        y + h * 0.5);   // nose tip
    ctx.lineTo(x + w * 0.55, y + h * 0.10);  // top-front
    ctx.lineTo(x + w * 0.06, y + h * 0.26);  // top-rear
    ctx.lineTo(x,            y + h * 0.5);   // engine rear
    ctx.lineTo(x + w * 0.06, y + h * 0.74);  // bottom-rear
    ctx.lineTo(x + w * 0.55, y + h * 0.90);  // bottom-front
    ctx.closePath();
    const bg = ctx.createLinearGradient(x, y, x + w, y + h);
    bg.addColorStop(0,   '#2a0e50');
    bg.addColorStop(0.4, '#1a0838');
    bg.addColorStop(1,   '#0d0420');
    ctx.fillStyle = bg;
    ctx.fill();

    // Hull top-edge neon accent
    ctx.strokeStyle = 'rgba(200,100,255,0.9)';
    ctx.lineWidth   = 1.4;
    ctx.shadowColor = 'rgba(200,80,255,0.8)';
    ctx.shadowBlur  = 6;
    ctx.beginPath();
    ctx.moveTo(x + w,        y + h * 0.5);
    ctx.lineTo(x + w * 0.55, y + h * 0.10);
    ctx.lineTo(x + w * 0.06, y + h * 0.26);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Hull bottom-edge accent
    ctx.strokeStyle = 'rgba(120,40,200,0.7)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(x + w,        y + h * 0.5);
    ctx.lineTo(x + w * 0.55, y + h * 0.90);
    ctx.lineTo(x + w * 0.06, y + h * 0.74);
    ctx.stroke();

    // === Cockpit — amber glow ===
    const cg = ctx.createRadialGradient(x + w * 0.68, y + h * 0.44, 0, x + w * 0.68, y + h * 0.5, 7);
    cg.addColorStop(0,   'rgba(255,230,80,1)');
    cg.addColorStop(0.5, 'rgba(220,120,0,0.9)');
    cg.addColorStop(1,   'rgba(100,40,0,0.3)');
    ctx.fillStyle = cg;
    ctx.shadowColor = 'rgba(255,180,0,0.9)';
    ctx.shadowBlur  = 8;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.68, y + h * 0.5, 7, 4.5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // === Muzzle flash ===
    if (this.muzzleFlash > 0) {
      const a  = this.muzzleFlash / 6;
      const mg = ctx.createRadialGradient(x + w + 5, y + h * 0.5, 0, x + w + 5, y + h * 0.5, 20);
      mg.addColorStop(0,   `rgba(255,240,180,${a})`);
      mg.addColorStop(0.35, `rgba(180,80,255,${a * 0.7})`);
      mg.addColorStop(1,   'rgba(100,20,200,0)');
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.ellipse(x + w + 5, y + h * 0.5, 20, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
