/**
 * Second monster using a photo with black background.
 * Uses screen blending so the black disappears.
 */
export class Monster2 {
  constructor(canvasW, canvasH) {
    this.name  = 'El Jefe';
    this.canvasW = canvasW;
    this.canvasH = canvasH;

    this.w = 90;
    this.h = 130;  // slightly taller — portrait photo

    this.maxHp = 20;
    this.hp    = this.maxHp;

    this.x = canvasW * 0.55;
    this.y = canvasH / 2 - this.h / 2;

    this._phase     = 0;
    this.hitTimer   = 0;
    this.dead       = false;
    this.respawnTimer = 0;

    this._img = null;
    this._loadImage();
  }

  _loadImage() {
    const img = new Image();
    img.src = 'assets/monster2.png';
    img.onload  = () => { this._img = img; };
    img.onerror = () => { this._img = null; };
  }

  getBounds() {
    return { x: this.x + 8, y: this.y + 8, w: this.w - 16, h: this.h - 16 };
  }

  takeDamage() {
    if (this.dead) return false;
    this.hp--;
    this.hitTimer = 14;
    if (this.hp <= 0) {
      this.dead = true;
      this.respawnTimer = 240;
      return true;
    }
    return false;
  }

  update(dt) {
    this._phase += dt * 0.002;

    if (this.dead) {
      this.respawnTimer--;
      if (this.respawnTimer <= 0) {
        this.dead = false;
        this.hp   = this.maxHp;
        this.x    = this.canvasW * 0.55;
      }
      return;
    }

    if (this.hitTimer > 0) this.hitTimer--;

    // Faster horizontal sweep
    const cx  = this.canvasW * 0.62;
    const amp = this.canvasW * 0.20;
    this.x = cx + Math.sin(this._phase * 0.9) * amp - this.w / 2;

    const cy   = this.canvasH * 0.40;
    const vamp = this.canvasH * 0.30;
    this.y = cy + Math.sin(this._phase * 1.3) * vamp - this.h / 2;

    this.y = Math.max(4, Math.min(this.canvasH - this.h - 40, this.y));
    this.x = Math.max(this.canvasW * 0.3, Math.min(this.canvasW - this.w - 8, this.x));
  }

  draw(ctx) {
    if (this.dead) return;

    const { x, y, w, h } = this;
    ctx.save();

    if (this.hitTimer > 0 && Math.floor(this.hitTimer / 2) % 2 === 0) {
      ctx.globalAlpha = 0.3;
    }

    if (this._img) {
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(this._img, x, y, w, h);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.fillStyle = 'rgba(255,30,120,0.8)';
      ctx.beginPath();
      ctx.ellipse(x + w/2, y + h*0.3, w*0.35, h*0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x + w*0.15, y + h*0.52, w*0.7, h*0.48);
    }

    ctx.restore();

    // ── Health bar ──────────────────────────────────────────
    const bx  = x;
    const by  = y - 16;
    const bw  = w;
    const bh  = 7;
    const pct = this.hp / this.maxHp;

    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(bx, by, bw, bh);

    const col = pct > 0.6 ? '#22ee44' : pct > 0.3 ? '#ffbb00' : '#ff2222';
    ctx.fillStyle = col;
    ctx.fillRect(bx, by, bw * pct, bh);

    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(bx, by, bw, bh);

    ctx.fillStyle    = '#ffffff';
    ctx.font         = 'bold 9px monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${this.name}  HP ${this.hp}/${this.maxHp}`, bx + bw/2, by - 7);
  }
}
