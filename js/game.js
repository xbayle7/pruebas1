import { CONFIG } from './config.js';
import { Player } from './player.js';
import { ObstacleManager } from './obstacles.js';
import { BulletManager } from './bullets.js';
import { ParticleSystem } from './particles.js';
import { Background } from './background.js';
import { ScoreManager } from './score.js';
import { Renderer } from './renderer.js';
import { AudioManager } from './audio.js';
import { checkBulletObstacle, checkPlayerObstacle } from './collision.js';

const MAX_LIVES = 3;

export class Game {
  constructor(canvas, input) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.input  = input;

    this.scoreEl = document.getElementById('score-value');
    this.levelEl = document.getElementById('level-value');
    this.livesEl = document.getElementById('lives-value');

    this._resize();
    window.addEventListener('resize', () => this._resize());

    this.renderer = new Renderer(this.ctx);
    this._audio   = new AudioManager();
    this._state   = 'idle';
    this._rafId   = null;
    this._lastTime = 0;
    this._time     = 0;

    this._initEntities();
    this._bindInput();
  }

  _resize() {
    const dpr = window.devicePixelRatio || 1;
    const w   = this.canvas.clientWidth;
    const h   = this.canvas.clientHeight;
    this.canvas.width  = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.scale(dpr, dpr);
    this._logicalW = w;
    this._logicalH = h;
  }

  _initEntities() {
    this.background = new Background(this._logicalW, this._logicalH);
    this.player     = new Player(this._logicalH);
    this.obstacles  = new ObstacleManager(this._logicalW, this._logicalH);
    this.bullets    = new BulletManager();
    this.particles  = new ParticleSystem();
    this.score      = new ScoreManager();
    this.gameSpeed  = CONFIG.SPEED_BASE;
    this.difficulty = 0;
    this.lives      = MAX_LIVES;
    this.level      = 0;
  }

  _bindInput() {
    // Jump: single impulse per press (no continuous)
    this.input.onJump(() => {
      if (this._state === 'running') this.player.jump();
    });

    // Shoot: fires on press; game loop also checks isShootHeld for hold-to-fire
    this.input.onShoot(() => {
      if (this._state !== 'running') return;
      const pos = this.player.shoot(this._time);
      if (pos) this.bullets.spawn(pos.x, pos.y);
    });

    this.input.onPause(() => {
      if (this._state === 'running') this._pause();
      else if (this._state === 'paused')  this._resume();
    });
  }

  start() {
    this._initEntities();
    this._state = 'running';
    this._time  = 0;
    this._updateHUD();
    this._hidePauseOverlay();
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._lastTime = performance.now();
    this._audio.start();
    this._loop(this._lastTime);
  }

  stop() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = null;
    this._audio.stop();
  }

  _pause() {
    this._state = 'paused';
    this._audio.pause();
    this._showPauseOverlay();
  }

  _resume() {
    this._state = 'running';
    this._audio.resume();
    this._hidePauseOverlay();
    this._lastTime = performance.now();
    this._loop(this._lastTime);
  }

  _showPauseOverlay() {
    const el = document.getElementById('pause-overlay');
    if (el) el.classList.add('active');
  }
  _hidePauseOverlay() {
    const el = document.getElementById('pause-overlay');
    if (el) el.classList.remove('active');
  }

  _loop(ts) {
    if (this._state === 'paused') return;
    this._rafId = requestAnimationFrame(t => this._loop(t));
    const dt = Math.min(ts - this._lastTime, 50);
    this._lastTime = ts;
    this._time    += dt;
    if (this._state === 'running') this._update(dt);
    this._draw();
  }

  _update(dt) {
    // Difficulty ramp
    this.gameSpeed = Math.min(
      CONFIG.SPEED_MAX,
      CONFIG.SPEED_BASE + this._time * CONFIG.SPEED_INCREMENT
    );
    this.difficulty = (this.gameSpeed - CONFIG.SPEED_BASE) / (CONFIG.SPEED_MAX - CONFIG.SPEED_BASE);

    // Hold-to-shoot (no hold-to-jump — single impulse only)
    if (this.input.isShootHeld) {
      const pos = this.player.shoot(this._time);
      if (pos) this.bullets.spawn(pos.x, pos.y);
    }

    this.background.update(this.gameSpeed);
    this.player.update(dt);
    this.obstacles.update(dt, this.gameSpeed, this.difficulty);
    this.bullets.update();
    this.particles.update();
    this.score.update(dt);

    // Level: count obstacles that have passed the player
    for (const obs of this.obstacles.obstacles) {
      if (!obs.scored && obs.x + obs.width < this.player.x) {
        obs.scored = true;
        this.level++;
      }
    }

    // Bullet vs obstacle
    const hits = checkBulletObstacle(this.bullets.bullets, this.obstacles.obstacles);
    for (const hit of hits) {
      hit.obstacle.destroyPart(hit.part);
      this.score.addDestroy();
      const bx = hit.obstacle.x + CONFIG.OBSTACLE_WIDTH / 2;
      const by = hit.part === 'top'
        ? hit.obstacle.topH / 2
        : hit.obstacle.botY + hit.obstacle.botH / 2;
      this.particles.emit(bx, by, '#ff8844', 18);
      this.renderer.flash('#ff8844', 0.15);
    }

    this.obstacles.obstacles = this.obstacles.obstacles.filter(o => !o.isFullyGone());

    // Player vs obstacle
    if (!this.player.isInvincible() &&
        checkPlayerObstacle(this.player, this.obstacles.obstacles)) {
      this._takeDamage();
    }

    this._updateHUD();
  }

  _takeDamage() {
    this.lives--;
    this.particles.emit(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2,
      '#00d4ff', 20
    );
    this.renderer.flash('#ff2244', 0.5);
    this._audio.pause();

    if (this.lives <= 0) {
      // No more lives → restart
      this.player.die();
      this._state = 'dead';
      this.score.saveBest();
      setTimeout(() => this.start(), 1400);
    } else {
      // Still has lives → invincible briefly, keep playing
      this.player.takeDamage();
      setTimeout(() => this._audio.resume(), 300);
    }
  }

  _updateHUD() {
    if (this.scoreEl) this.scoreEl.textContent = this.score.score;
    if (this.levelEl) this.levelEl.textContent = this.level;
    if (this.livesEl) {
      this.livesEl.textContent = '♥'.repeat(this.lives) + '♡'.repeat(MAX_LIVES - this.lives);
    }
  }

  _drawFloor(ctx, w, h) {
    const fh = CONFIG.FLOOR_HEIGHT;
    const fy = h - fh;

    // Floor fill
    const grad = ctx.createLinearGradient(0, fy, 0, h);
    grad.addColorStop(0,   '#0a1a2e');
    grad.addColorStop(0.4, '#0d2040');
    grad.addColorStop(1,   '#050f1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, fy, w, fh);

    // Top edge glow line
    const t = this._time * 0.002;
    const pulse = 0.6 + 0.4 * Math.sin(t * 2);
    ctx.strokeStyle = `rgba(0,210,255,${pulse})`;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(0, fy);
    ctx.lineTo(w, fy);
    ctx.stroke();

    // Inner glow band
    const glow = ctx.createLinearGradient(0, fy, 0, fy + fh * 0.5);
    glow.addColorStop(0,   `rgba(0,200,255,${0.18 * pulse})`);
    glow.addColorStop(1,   'rgba(0,200,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, fy, w, fh * 0.5);

    // Grid lines on floor
    ctx.strokeStyle = `rgba(0,150,200,${0.12 * pulse})`;
    ctx.lineWidth   = 1;
    const spacing = 48;
    const offset  = (this._time * this.gameSpeed * 0.05) % spacing;
    for (let x = -offset; x < w + spacing; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, fy);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  }

  _draw() {
    const ctx = this.ctx;
    const w   = this._logicalW;
    const h   = this._logicalH;

    ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);

    this.background.draw(ctx, this._time);
    this._drawFloor(ctx, w, h);
    this.obstacles.draw(ctx, this._time);
    this.bullets.draw(ctx);
    this.particles.draw(ctx);
    this.player.draw(ctx);
    this.renderer.drawFlash();
    this.renderer.drawSpeedBar(ctx, this.gameSpeed, CONFIG.SPEED_MAX);

    if (this._state === 'dead') {
      ctx.fillStyle = 'rgba(255,20,60,0.18)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle   = '#ff2244';
      ctx.font        = `bold ${Math.round(h * 0.1)}px 'Courier New', monospace`;
      ctx.textAlign   = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.9;
      ctx.fillText('GAME OVER', w / 2, h / 2);
      ctx.globalAlpha = 1;
    }
  }
}
