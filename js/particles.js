import { CONFIG } from './config.js';

function rand(a, b) { return a + Math.random() * (b - a); }

class Particle {
  constructor(x, y, color, type) {
    this.x     = x;
    this.y     = y;
    this.type  = type || 'ember'; // 'ember' | 'spark' | 'debris'
    this.color = color;
    this.life  = 1;

    if (this.type === 'spark') {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(3, 10);
      this.vx    = Math.cos(angle) * speed;
      this.vy    = Math.sin(angle) * speed;
      this.size  = rand(1, 2.5);
      this.decay = rand(0.04, 0.08);
      this.len   = rand(6, 18);
    } else if (this.type === 'debris') {
      this.vx    = rand(-5, 5);
      this.vy    = rand(-6, 1);
      this.size  = rand(3, 7);
      this.decay = rand(0.025, 0.05);
      this.rot   = rand(0, Math.PI * 2);
      this.rotV  = rand(-0.2, 0.2);
    } else {
      this.vx    = rand(-3.5, 3.5);
      this.vy    = rand(-5.5, 1.5);
      this.size  = rand(3, 9);
      this.decay = rand(0.025, 0.06);
    }
  }

  update() {
    this.x  += this.vx;
    this.y  += this.vy;
    this.vy += 0.18;
    this.vx *= 0.96;
    this.life -= this.decay;
    if (this.type === 'debris') this.rot += this.rotV;
  }

  draw(ctx) {
    const a = Math.max(0, this.life);
    ctx.save();
    ctx.globalAlpha = a;

    if (this.type === 'spark') {
      const ex = this.x - this.vx * (this.len / 10);
      const ey = this.y - this.vy * (this.len / 10);
      const sg = ctx.createLinearGradient(ex, ey, this.x, this.y);
      sg.addColorStop(0, 'rgba(255,255,255,0)');
      sg.addColorStop(1, this.color);
      ctx.strokeStyle = sg;
      ctx.lineWidth   = this.size;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();
    } else if (this.type === 'debris') {
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.fillStyle = this.color;
      const s = this.size * this.life;
      ctx.fillRect(-s / 2, -s / 2, s, s * 0.5);
    } else {
      // Ember – glowing sphere
      const rg = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * this.life);
      rg.addColorStop(0, 'rgba(255,255,220,0.9)');
      rg.addColorStop(0.3, this.color);
      rg.addColorStop(1,  'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export class ParticleSystem {
  constructor() { this.particles = []; }
  reset()       { this.particles = []; }

  emit(x, y, color = '#ff8844', count = 12) {
    const max = CONFIG.PARTICLE_MAX;
    const third = Math.ceil(count / 3);
    for (let i = 0; i < count && this.particles.length < max; i++) {
      let type;
      if (i < third)          type = 'spark';
      else if (i < third * 2) type = 'debris';
      else                    type = 'ember';
      this.particles.push(new Particle(x, y, color, type));
    }
  }

  update() {
    for (const p of this.particles) p.update();
    this.particles = this.particles.filter(p => p.life > 0);
  }

  draw(ctx) {
    for (const p of this.particles) p.draw(ctx);
  }
}
