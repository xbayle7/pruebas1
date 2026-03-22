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
import { Monster } from './monster.js';
import { Monster2 } from './monster2.js';

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
    this._monsterIdx = 0;
    this.monster     = new Monster(this._logicalW, this._logicalH);
  }

  _bindInput() {
    // Jump: single impulse per press (no continuous)
    this.input.onJump(() => {
      if (this._state === 'running') {
        this.player.jump();
        this._audio.sfxJump();
      }
    });

    // Shoot: fires on press; game loop also checks isShootHeld for hold-to-fire
    this.input.onShoot(() => {
      if (this._state !== 'running') return;
      const pos = this.player.shoot(this._time);
      if (pos) {
        this.bullets.spawn(pos.x, pos.y);
        this._audio.sfxShoot();
      }
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

  /** Called from pause-overlay Resume button */
  resumeFromPause() {
    if (this._state === 'paused') this._resume();
  }

  /** Called from pause-overlay Mute button. Returns new muted state. */
  toggleMute() {
    return this._audio.toggleMute();
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
      if (pos) {
        this.bullets.spawn(pos.x, pos.y);
        this._audio.sfxShoot();
      }
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

    // Monster update & bullet collision
    this.monster.update(dt);
    for (const b of this.bullets.bullets) {
      if (!b.alive) continue;
      const bb = b.getBounds();
      const mb = this.monster.getBounds();
      if (bb.x < mb.x + mb.w && bb.x + bb.w > mb.x &&
          bb.y < mb.y + mb.h && bb.y + bb.h > mb.y) {
        b.alive = false;
        const killed = this.monster.takeDamage();
        this._audio.sfxExplosion();
        this.particles.emit(mb.x + mb.w/2, mb.y + mb.h/2, '#ff4422', killed ? 30 : 10);
        if (killed) {
          this.score.addDestroy();
          this.renderer.flash('#ff8800', 0.4);
          // Swap monster on next respawn
          this._monsterIdx = (this._monsterIdx + 1) % 2;
          this.monster = this._monsterIdx === 0
            ? new Monster(this._logicalW, this._logicalH)
            : new Monster2(this._logicalW, this._logicalH);
        }
      }
    }

    // Monster touches player → damage
    if (!this.player.isInvincible() && !this.monster.dead) {
      const pb = this.player.getBounds();
      const mb = this.monster.getBounds();
      if (pb.x < mb.x + mb.w && pb.x + pb.w > mb.x &&
          pb.y < mb.y + mb.h && pb.y + pb.h > mb.y) {
        this._takeDamage();
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
      this._audio.sfxExplosion();
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
      this._audio.sfxGameOver();
      setTimeout(() => this.start(), 1400);
    } else {
      // Still has lives → invincible briefly, keep playing
      this.player.takeDamage();
      this._audio.sfxDamage();
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
    const t  = this._time * 0.002;
    const pulse = 0.7 + 0.3 * Math.sin(t * 2);

    // Solid dark base
    ctx.fillStyle = '#080c1a';
    ctx.fillRect(0, fy, w, fh);

    // Metallic top strip
    const strip = ctx.createLinearGradient(0, fy, 0, fy + 6);
    strip.addColorStop(0, '#334466');
    strip.addColorStop(1, '#111830');
    ctx.fillStyle = strip;
    ctx.fillRect(0, fy, w, 6);

    // Bright neon glow line
    ctx.shadowColor = '#00ccff';
    ctx.shadowBlur  = 12;
    ctx.strokeStyle = `rgba(0,220,255,${pulse})`;
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.moveTo(0, fy + 3);
    ctx.lineTo(w, fy + 3);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Scrolling grid lines
    const spacing = 60;
    const offset  = (this._time * (this.gameSpeed || 3.5) * 0.06) % spacing;
    ctx.strokeStyle = 'rgba(0,160,220,0.25)';
    ctx.lineWidth   = 1;
    for (let x = -offset; x < w + spacing; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, fy + 6);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Upward glow fade
    const glow = ctx.createLinearGradient(0, fy - 20, 0, fy + 4);
    glow.addColorStop(0, 'rgba(0,200,255,0)');
    glow.addColorStop(1, `rgba(0,200,255,${0.22 * pulse})`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, fy - 20, w, 24);
  }

  _draw() {
    const ctx = this.ctx;
    const w   = this._logicalW;
    const h   = this._logicalH;

    ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);

    this.background.draw(ctx, this._time);
    this.obstacles.draw(ctx, this._time);
    this.bullets.draw(ctx);
    this.particles.draw(ctx);
    this.monster.draw(ctx);
    this.player.draw(ctx);
    this._drawFloor(ctx, w, h);
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
