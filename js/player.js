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

    this.animTimer  = 0;
    this.hitFlash   = 0;
    this.lastShot   = 0;
    this.muzzleFlash = 0;
    this._thrustPhase = 0;
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
    this.muzzleFlash = 6;
    return {
      x: this.x + this.width,
      y: this.y + this.height / 2 - CONFIG.BULLET_HEIGHT / 2,
    };
  }

  update(dt) {
    if (!this.alive) return;

    // dt-scaled physics (baseline 60 fps = 16.67 ms)
    const s = dt / 16.67;
    this.vy += CONFIG.GRAVITY * s;
    if (this.vy > CONFIG.PLAYER_MAX_FALL) this.vy = CONFIG.PLAYER_MAX_FALL;
    this.y += this.vy * s;

    // Clamp
    if (this.y < 0) { this.y = 0; this.vy = 0; }
    if (this.y + this.height > this.canvasHeight) {
      this.y = this.canvasHeight - this.height;
      this.die();
    }

    this.animTimer    += dt;
    this._thrustPhase += dt * 0.012;
    if (this.hitFlash   > 0) this.hitFlash--;
    if (this.muzzleFlash > 0) this.muzzleFlash--;
  }

  die() { this.alive = false; }

  getBounds() {
    return { x: this.x + 4, y: this.y + 3, w: this.width - 8, h: this.height - 6 };
  }

  draw(ctx) {
    const { x, y, width: w, height: h } = this;
    ctx.save();

    if (this.hitFlash > 0) {
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(this.hitFlash * 0.8);
    }

    const alive  = this.alive;
    const tp     = this._thrustPhase;
    const fSize  = 10 + 5 * Math.abs(Math.sin(tp));

    // ── Dual engine flames ──────────────────────────────────
    const drawFlame = (cy) => {
      const fg = ctx.createRadialGradient(x - 2, cy, 0, x - 4, cy, fSize);
      fg.addColorStop(0,   'rgba(255,255,180,0.95)');
      fg.addColorStop(0.25,'rgba(255,140,20,0.8)');
      fg.addColorStop(0.6, 'rgba(255,60,0,0.4)');
      fg.addColorStop(1,   'rgba(255,30,0,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.ellipse(x - 3, cy, fSize, fSize * 0.42, Math.PI, 0, Math.PI * 2);
      ctx.fill();
    };
    drawFlame(y + h * 0.27);
    drawFlame(y + h * 0.73);

    // ── Hull body ───────────────────────────────────────────
    const hullColor = alive ? '#1a7a9e' : '#882233';
    const hullLight = alive ? '#22aacc' : '#bb3344';

    // Body gradient
    const bg = ctx.createLinearGradient(x, y, x, y + h);
    bg.addColorStop(0,   alive ? '#1e90b8' : '#993344');
    bg.addColorStop(0.5, alive ? '#1a7a9e' : '#772233');
    bg.addColorStop(1,   alive ? '#0f4f6a' : '#551122');
    ctx.fillStyle = bg;

    ctx.beginPath();
    ctx.moveTo(x + w,      y + h * 0.5);   // nose tip
    ctx.lineTo(x + w * 0.18, y + h * 0.08); // top rear
    ctx.lineTo(x + w * 0.04, y + h * 0.18); // top engine
    ctx.lineTo(x + w * 0.04, y + h * 0.82); // bottom engine
    ctx.lineTo(x + w * 0.18, y + h * 0.92); // bottom rear
    ctx.closePath();
    ctx.fill();

    // Hull edge highlight (top)
    ctx.strokeStyle = alive ? 'rgba(0,220,255,0.75)' : 'rgba(255,120,120,0.6)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x + w, y + h * 0.5);
    ctx.lineTo(x + w * 0.18, y + h * 0.08);
    ctx.stroke();

    // ── Upper wing ──────────────────────────────────────────
    const wg = ctx.createLinearGradient(x, y, x, y + h * 0.4);
    wg.addColorStop(0,   alive ? '#115577' : '#662222');
    wg.addColorStop(1,   alive ? '#0a3a55' : '#441111');
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.14, y + h * 0.14);
    ctx.lineTo(x + w * 0.58, y);
    ctx.lineTo(x + w * 0.68, y + h * 0.32);
    ctx.lineTo(x + w * 0.14, y + h * 0.36);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = alive ? 'rgba(0,180,255,0.4)' : 'rgba(255,80,80,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // ── Lower wing ──────────────────────────────────────────
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.14, y + h * 0.86);
    ctx.lineTo(x + w * 0.58, y + h);
    ctx.lineTo(x + w * 0.68, y + h * 0.68);
    ctx.lineTo(x + w * 0.14, y + h * 0.64);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = alive ? 'rgba(0,180,255,0.4)' : 'rgba(255,80,80,0.3)';
    ctx.stroke();

    // ── Cockpit ─────────────────────────────────────────────
    const cg = ctx.createRadialGradient(
      x + w * 0.64, y + h * 0.42, 1,
      x + w * 0.66, y + h * 0.5,  8
    );
    cg.addColorStop(0,   alive ? 'rgba(180,255,240,0.95)' : 'rgba(255,160,160,0.95)');
    cg.addColorStop(0.5, alive ? 'rgba(0,220,190,0.8)'   : 'rgba(220,80,80,0.8)');
    cg.addColorStop(1,   alive ? 'rgba(0,150,130,0.4)'   : 'rgba(160,40,40,0.4)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.66, y + h * 0.5, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cockpit outer glow
    const cGlow = ctx.createRadialGradient(x + w * 0.66, y + h * 0.5, 2, x + w * 0.66, y + h * 0.5, 14);
    cGlow.addColorStop(0, alive ? 'rgba(0,255,210,0.3)' : 'rgba(255,100,100,0.3)');
    cGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cGlow;
    ctx.beginPath();
    ctx.arc(x + w * 0.66, y + h * 0.5, 14, 0, Math.PI * 2);
    ctx.fill();

    // ── Muzzle flash ────────────────────────────────────────
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
