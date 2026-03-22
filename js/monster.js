/**
 * Monster that chases the player from the left.
 * Has health; bullets reduce it. When health = 0 it dies and respawns.
 */
export class Monster {
  constructor(canvasW, canvasH) {
    this.canvasW = canvasW;
    this.canvasH = canvasH;

    this.w = 72;
    this.h = 96;

    this.maxHp = 10;
    this.hp    = this.maxHp;

    // Start off-screen to the left
    this.x = -this.w - 20;
    this.y = canvasH / 2 - this.h / 2;
    this.vy = 0;

    this.speed     = 1.2;   // horizontal chase speed
    this.floatPhase = 0;
    this.hitTimer  = 0;     // flash when hit
    this.dead      = false;
    this.respawnTimer = 0;

    this._img = null;
    this._loadImage();
  }

  _loadImage() {
    const img = new Image();
    img.src = 'assets/monster.png';
    img.onload = () => { this._img = img; };
  }

  getBounds() {
    return { x: this.x + 10, y: this.y + 8, w: this.w - 20, h: this.h - 16 };
  }

  /** Called when a bullet hits the monster. Returns true if just died. */
  takeDamage() {
    if (this.dead) return false;
    this.hp--;
    this.hitTimer = 12;
    if (this.hp <= 0) {
      this.dead = true;
      this.respawnTimer = 300; // ~5 s at 60 fps
      return true;
    }
    return false;
  }

  update(dt, playerY, gameSpeed) {
    this.floatPhase += dt * 0.003;

    if (this.dead) {
      this.respawnTimer--;
      if (this.respawnTimer <= 0) {
        this.dead  = false;
        this.hp    = this.maxHp;
        this.x     = -this.w - 20;
        this.y     = this.canvasH / 2 - this.h / 2;
      }
      return;
    }

    if (this.hitTimer > 0) this.hitTimer--;

    // Advance into screen from the left
    const targetX = 40;
    if (this.x < targetX) {
      this.x += this.speed + gameSpeed * 0.15;
    }

    // Float vertically toward player
    const targetY = playerY - this.h * 0.1;
    const dy = targetY - this.y;
    this.y += dy * 0.04 + Math.sin(this.floatPhase) * 1.2;

    // Clamp to screen
    this.y = Math.max(0, Math.min(this.canvasH - this.h - 36, this.y));
  }

  draw(ctx) {
    if (this.dead) return;

    const { x, y, w, h } = this;
    ctx.save();

    // Hit flash
    if (this.hitTimer > 0 && Math.floor(this.hitTimer / 2) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // Red glow aura
    const aura = ctx.createRadialGradient(x + w/2, y + h/2, 10, x + w/2, y + h/2, w * 0.75);
    aura.addColorStop(0,   'rgba(255,30,0,0.18)');
    aura.addColorStop(1,   'rgba(255,30,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.ellipse(x + w/2, y + h/2, w * 0.75, h * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw sprite or fallback
    if (this._img) {
      ctx.drawImage(this._img, x, y, w, h);
    } else {
      // Fallback: simple figure
      ctx.fillStyle = '#bb5533';
      ctx.beginPath();
      ctx.ellipse(x + w/2, y + h * 0.28, w * 0.32, h * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x + w*0.18, y + h*0.5, w*0.64, h*0.5);
      ctx.fillStyle = '#ffaa44';
      ctx.fillRect(x + w*0.2, y + h*0.33, w*0.6, h*0.08);
    }

    ctx.restore();

    // ── Health bar ──────────────────────────────────────────
    const bw = w;
    const bh = 6;
    const bx = x;
    const by = y - 14;
    const pct = this.hp / this.maxHp;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx, by, bw, bh);

    // Health fill
    const hcol = pct > 0.5 ? '#22dd44' : pct > 0.25 ? '#ffaa00' : '#ff2244';
    ctx.fillStyle = hcol;
    ctx.fillRect(bx, by, bw * pct, bh);

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);

    // HP label
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`HP ${this.hp}/${this.maxHp}`, bx + bw/2, by - 6);
  }
}
