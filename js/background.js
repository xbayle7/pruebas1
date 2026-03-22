/**
 * Parallax starfield background: nebula, stars, planet, shooting stars.
 */
export class Background {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.layers  = this._buildStars();
    this.nebulae = this._buildNebulae();
    this.planet  = { x: w * 0.82, y: h * 0.22, r: Math.min(w, h) * 0.09 };
    this.shooters = [];
    this._shooterTimer = 180;
  }

  _buildStars() {
    return [
      { speed: 0.15, size: 0.8,  stars: this._makeStars(100, '#aaaacc') },
      { speed: 0.35, size: 1.2,  stars: this._makeStars(60,  '#ffffff') },
      { speed: 0.7,  size: 1.8,  stars: this._makeStars(35,  '#cceeff') },
      { speed: 1.5,  size: 2.6,  stars: this._makeStars(15,  '#ffeecc') },
    ];
  }

  _makeStars(count, color) {
    return Array.from({ length: count }, () => ({
      x:     Math.random() * this.w,
      y:     Math.random() * this.h,
      b:     0.3 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
      color,
    }));
  }

  _buildNebulae() {
    return [
      { x: this.w * 0.15, y: this.h * 0.25, rx: this.w * 0.22, ry: this.h * 0.28, r: 80,  g: 0,   b: 140 },
      { x: this.w * 0.45, y: this.h * 0.70, rx: this.w * 0.28, ry: this.h * 0.30, r: 0,   g: 60,  b: 160 },
      { x: this.w * 0.70, y: this.h * 0.20, rx: this.w * 0.20, ry: this.h * 0.25, r: 0,   g: 100, b: 100 },
      { x: this.w * 0.88, y: this.h * 0.65, rx: this.w * 0.18, ry: this.h * 0.22, r: 100, g: 0,   b: 80  },
    ];
  }

  update(gameSpeed) {
    const ratio = gameSpeed / 3.5;

    for (const layer of this.layers) {
      for (const s of layer.stars) {
        s.x -= layer.speed * ratio;
        if (s.x < 0) { s.x = this.w; s.y = Math.random() * this.h; }
      }
    }

    // Shooting stars
    this._shooterTimer--;
    if (this._shooterTimer <= 0) {
      this._shooterTimer = 150 + Math.random() * 250;
      this.shooters.push({
        x:    this.w + 20,
        y:    Math.random() * this.h * 0.55,
        vx:   -(7 + Math.random() * 5),
        vy:   1 + Math.random() * 2,
        len:  55 + Math.random() * 70,
        life: 1,
      });
    }
    for (const s of this.shooters) {
      s.x    += s.vx;
      s.y    += s.vy;
      s.life -= 0.022;
    }
    this.shooters = this.shooters.filter(s => s.life > 0 && s.x > -200);
  }

  draw(ctx, time) {
    const t = time * 0.001;

    // Deep space gradient
    const grad = ctx.createLinearGradient(0, 0, 0, this.h);
    grad.addColorStop(0,   '#010112');
    grad.addColorStop(0.5, '#03031a');
    grad.addColorStop(1,   '#050520');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.w, this.h);

    // Nebulae — simple ellipse + radial gradient, no transforms
    for (const n of this.nebulae) {
      const maxR = Math.max(n.rx, n.ry);
      if (maxR <= 0) continue;
      const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, maxR);
      ng.addColorStop(0,   `rgba(${n.r},${n.g},${n.b},0.13)`);
      ng.addColorStop(0.5, `rgba(${n.r},${n.g},${n.b},0.06)`);
      ng.addColorStop(1,   `rgba(${n.r},${n.g},${n.b},0)`);
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(n.x, n.y, n.rx, n.ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = ng;
      ctx.fill();
      ctx.restore();
    }

    // Planet
    const p = this.planet;
    if (p.r > 0) {
      const pg = ctx.createRadialGradient(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.05, p.x, p.y, p.r);
      pg.addColorStop(0,   '#2255aa');
      pg.addColorStop(0.5, '#113366');
      pg.addColorStop(1,   '#050f22');
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = pg;
      ctx.fill();

      // Atmosphere rim
      const rim = ctx.createRadialGradient(p.x, p.y, p.r * 0.82, p.x, p.y, p.r * 1.18);
      rim.addColorStop(0,   'rgba(30,100,255,0)');
      rim.addColorStop(0.5, 'rgba(30,100,255,0.12)');
      rim.addColorStop(1,   'rgba(30,100,255,0)');
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 1.18, 0, Math.PI * 2);
      ctx.fillStyle = rim;
      ctx.fill();
    }

    // Stars
    for (const layer of this.layers) {
      for (const s of layer.stars) {
        const tw = 0.55 + 0.45 * Math.sin(t * 2.5 + s.phase);
        ctx.globalAlpha = s.b * tw;
        ctx.fillStyle   = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, layer.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // Shooting stars
    for (const s of this.shooters) {
      const tailX = s.x - s.vx * (s.len / Math.abs(s.vx));
      const tailY = s.y - s.vy * (s.len / Math.abs(s.vx));
      const sg = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
      sg.addColorStop(0, 'rgba(200,230,255,0)');
      sg.addColorStop(1, `rgba(255,255,255,${s.life * 0.9})`);
      ctx.save();
      ctx.strokeStyle = sg;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
      ctx.restore();
    }
  }
}
