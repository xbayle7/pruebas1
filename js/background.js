/**
 * Rich parallax background: nebula, stars, planet, shooting stars.
 */
export class Background {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.layers   = this._buildStars();
    this.nebulae  = this._buildNebulae();
    this.planet   = this._buildPlanet();
    this.shooters = []; // shooting stars
    this._shooterTimer = 0;
  }

  _buildStars() {
    const defs = [
      { count: 120, speed: 0.15, size: 0.8,  colors: ['#aaaacc', '#8888bb', '#ccccff'] },
      { count:  70, speed: 0.35, size: 1.2,  colors: ['#ffffff', '#ccddff', '#ffeecc'] },
      { count:  40, speed: 0.7,  size: 1.8,  colors: ['#ffffff', '#00eeff', '#ffccaa'] },
      { count:  18, speed: 1.5,  size: 2.8,  colors: ['#ffffff', '#aaffee', '#ffddaa'] },
    ];
    return defs.map(d => ({
      speed: d.speed,
      size:  d.size,
      stars: Array.from({ length: d.count }, () => ({
        x:    Math.random() * this.w,
        y:    Math.random() * this.h,
        b:    0.3 + Math.random() * 0.7,
        color: d.colors[Math.floor(Math.random() * d.colors.length)],
        phase: Math.random() * Math.PI * 2,
      })),
    }));
  }

  _buildNebulae() {
    const palettes = [
      ['rgba(60,0,120,0.12)',  'rgba(100,0,180,0.06)'],
      ['rgba(0,40,120,0.10)',  'rgba(0,80,200,0.05)'],
      ['rgba(0,80,80,0.10)',   'rgba(0,150,150,0.04)'],
      ['rgba(80,0,60,0.10)',   'rgba(140,0,100,0.05)'],
    ];
    return palettes.map((cols, i) => ({
      x:   this.w * (0.15 + i * 0.22),
      y:   this.h * (0.2  + (i % 2) * 0.5),
      rx:  this.w * (0.18 + Math.random() * 0.12),
      ry:  this.h * (0.22 + Math.random() * 0.12),
      col: cols,
    }));
  }

  _buildPlanet() {
    return {
      x:  this.w * 0.82,
      y:  this.h * 0.22,
      r:  Math.min(this.w, this.h) * 0.09,
    };
  }

  update(gameSpeed) {
    const ratio = gameSpeed / 3.5;
    for (const layer of this.layers) {
      for (const s of layer.stars) {
        s.x -= layer.speed * ratio;
        if (s.x < 0) {
          s.x = this.w;
          s.y = Math.random() * this.h;
        }
      }
    }

    // Shooting stars
    this._shooterTimer--;
    if (this._shooterTimer <= 0) {
      this._shooterTimer = 120 + Math.random() * 200;
      this.shooters.push({
        x: this.w + 10,
        y: Math.random() * this.h * 0.6,
        vx: -(6 + Math.random() * 4),
        vy:  1 + Math.random() * 2,
        len: 60 + Math.random() * 80,
        life: 1,
      });
    }
    for (const s of this.shooters) {
      s.x    += s.vx;
      s.y    += s.vy;
      s.life -= 0.025;
    }
    this.shooters = this.shooters.filter(s => s.life > 0 && s.x > -s.len);
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

    // Nebulae
    for (const n of this.nebulae) {
      const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, Math.max(n.rx, n.ry));
      ng.addColorStop(0,   n.col[0]);
      ng.addColorStop(0.5, n.col[1]);
      ng.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.save();
      ctx.scale(n.rx / Math.max(n.rx, n.ry), n.ry / Math.max(n.rx, n.ry));
      ctx.fillStyle = ng;
      ctx.beginPath();
      const scale = Math.max(n.rx, n.ry);
      ctx.arc(n.x * (Math.max(n.rx,n.ry)/n.rx), n.y * (Math.max(n.rx,n.ry)/n.ry), scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // simpler approach
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(n.x, n.y, n.rx, n.ry, 0, 0, Math.PI * 2);
      const ng2 = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, Math.max(n.rx, n.ry));
      ng2.addColorStop(0,   n.col[0]);
      ng2.addColorStop(0.6, n.col[1]);
      ng2.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = ng2;
      ctx.fill();
      ctx.restore();
    }

    // Distant planet
    const p = this.planet;
    const pg = ctx.createRadialGradient(p.x - p.r*0.3, p.y - p.r*0.3, p.r*0.1, p.x, p.y, p.r);
    pg.addColorStop(0,   '#2255aa');
    pg.addColorStop(0.4, '#113366');
    pg.addColorStop(0.8, '#0a1f44');
    pg.addColorStop(1,   '#050f22');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    // Planet atmosphere rim
    const rim = ctx.createRadialGradient(p.x, p.y, p.r * 0.8, p.x, p.y, p.r * 1.15);
    rim.addColorStop(0,   'rgba(0,80,200,0)');
    rim.addColorStop(0.7, 'rgba(0,80,200,0.12)');
    rim.addColorStop(1,   'rgba(0,80,200,0)');
    ctx.fillStyle = rim;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 1.15, 0, Math.PI * 2);
    ctx.fill();
    // Planet surface bands
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = 'rgba(0,120,255,0.12)';
    ctx.lineWidth = p.r * 0.18;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + p.r*0.15, p.r, p.r*0.2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - p.r*0.2, p.r, p.r*0.15, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Stars
    for (const layer of this.layers) {
      for (const s of layer.stars) {
        const twinkle = 0.55 + 0.45 * Math.sin(t * 2.5 + s.phase);
        ctx.globalAlpha = s.b * twinkle;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, layer.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // Shooting stars
    for (const s of this.shooters) {
      ctx.save();
      ctx.globalAlpha = s.life * 0.9;
      const sg = ctx.createLinearGradient(s.x, s.y, s.x + s.len, s.y - s.vy * s.len / Math.abs(s.vx));
      sg.addColorStop(0,   'rgba(255,255,255,0.9)');
      sg.addColorStop(0.4, 'rgba(180,220,255,0.5)');
      sg.addColorStop(1,   'rgba(180,220,255,0)');
      ctx.strokeStyle = sg;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + s.len * (-s.vx / Math.abs(s.vx)) * -1, s.y - s.vy * (s.len / Math.abs(s.vx)));
      ctx.stroke();
      ctx.restore();
    }
  }
}
