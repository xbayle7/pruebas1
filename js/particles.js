import { CONFIG } from './config.js';

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

export class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = randRange(-4, 4);
    this.vy = randRange(-5, 2);
    this.life = 1;
    this.decay = randRange(0.03, 0.07);
    this.size = randRange(3, 8);
    this.color = color;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.15; // mini gravity
    this.vx *= 0.95;
    this.life -= this.decay;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  reset() {
    this.particles = [];
  }

  emit(x, y, color = '#ff8844', count = 12) {
    for (let i = 0; i < count && this.particles.length < CONFIG.PARTICLE_MAX; i++) {
      this.particles.push(new Particle(x, y, color));
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
