import { CONFIG } from './config.js';
import { Player } from './player.js';
import { ObstacleManager } from './obstacles.js';
import { BulletManager } from './bullets.js';
import { ParticleSystem } from './particles.js';
import { Background } from './background.js';
import { ScoreManager } from './score.js';
import { Renderer } from './renderer.js';
import { checkBulletObstacle, checkPlayerObstacle } from './collision.js';

export class Game {
  constructor(canvas, input) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = input;

    this.scoreEl = document.getElementById('score-value');
    this.statusEl = document.getElementById('status-display');

    this._resize();
    window.addEventListener('resize', () => this._resize());

    this.renderer = new Renderer(this.ctx);
    this._state = 'idle';
    this._rafId = null;
    this._lastTime = 0;
    this._time = 0;

    this._initEntities();
    this._bindInput();
  }

  _resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.canvas.width  = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.scale(dpr, dpr);
    this._logicalW = w;
    this._logicalH = h;
  }

  _initEntities() {
    this.background = new Background(this._logicalW, this._logicalH);
    this.player = new Player(this._logicalH);
    this.obstacles = new ObstacleManager(this._logicalW, this._logicalH);
    this.bullets = new BulletManager();
    this.particles = new ParticleSystem();
    this.score = new ScoreManager();
    this.gameSpeed = CONFIG.SPEED_BASE;
    this.difficulty = 0;  // 0–1 scale used to ramp up settings
  }

  _bindInput() {
    this.input.onJump(() => {
      if (this._state === 'running') this.player.jump();
    });

    this.input.onShoot(() => {
      if (this._state !== 'running') return;
      const pos = this.player.shoot(this._time);
      if (pos) {
        this.bullets.spawn(pos.x, pos.y);
      }
    });
  }

  start() {
    this._initEntities();
    this._state = 'running';
    this.scoreEl.textContent = '0';
    this.statusEl.className = 'status-alive';
    this.statusEl.textContent = 'ALIVE';
    this._lastTime = performance.now();
    this._loop(this._lastTime);
  }

  stop() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = null;
  }

  _loop(ts) {
    this._rafId = requestAnimationFrame(t => this._loop(t));

    const dt = Math.min(ts - this._lastTime, 50);  // cap at 50ms to avoid spiral
    this._lastTime = ts;
    this._time += dt;

    if (this._state === 'running') {
      this._update(dt);
    }
    this._draw();
  }

  _update(dt) {
    // Ramp difficulty
    this.gameSpeed = Math.min(
      CONFIG.SPEED_MAX,
      CONFIG.SPEED_BASE + this._time * CONFIG.SPEED_INCREMENT
    );
    this.difficulty = (this.gameSpeed - CONFIG.SPEED_BASE) / (CONFIG.SPEED_MAX - CONFIG.SPEED_BASE);

    this.background.update(this.gameSpeed);
    this.player.update(dt);
    this.obstacles.update(dt, this.gameSpeed, this.difficulty);
    this.bullets.update();
    this.particles.update();
    this.score.update(dt);

    // Bullet vs obstacle
    const hits = checkBulletObstacle(this.bullets.bullets, this.obstacles.obstacles);
    for (const hit of hits) {
      hit.obstacle.destroyPart(hit.part);
      this.score.addDestroy();
      const bx = hit.obstacle.x + CONFIG.OBSTACLE_WIDTH / 2;
      const by = hit.part === 'top'
        ? hit.obstacle.topH / 2
        : hit.obstacle.botY + hit.obstacle.botH / 2;
      this.particles.emit(bx, by, '#ff8844', 16);
      this.renderer.flash('#ff8844', 0.15);
    }

    // Remove fully destroyed obstacles
    this.obstacles.obstacles = this.obstacles.obstacles.filter(o => !o.isFullyGone());

    // Player vs obstacle
    if (checkPlayerObstacle(this.player, this.obstacles.obstacles)) {
      this._triggerDeath();
    }

    // Update HUD score
    this.scoreEl.textContent = this.score.score;
  }

  _triggerDeath() {
    this.player.die();
    this._state = 'dead';
    this.statusEl.className = 'status-dead';
    this.statusEl.textContent = 'DEAD';
    this.particles.emit(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2,
      '#00d4ff', 30
    );
    this.renderer.flash('#ff2244', 0.7);
    this.score.saveBest();

    // Short delay then show game over
    setTimeout(() => this._showGameOver(), 1200);
  }

  _showGameOver() {
    this.stop();
    document.getElementById('final-score').textContent = this.score.score;
    document.getElementById('final-time').textContent = Math.floor(this.score.elapsed) + 's';
    document.getElementById('final-destroyed').textContent = this.score.destroyed;
    document.getElementById('best-score').textContent = this.score.best;

    document.getElementById('game-screen').classList.remove('active');
    document.getElementById('gameover-screen').classList.add('active');
  }

  _draw() {
    const ctx = this.ctx;
    const w = this._logicalW;
    const h = this._logicalH;

    // Re-apply scale after potential resize
    ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);

    this.background.draw(ctx, this._time);
    this.obstacles.draw(ctx, this._time);
    this.bullets.draw(ctx);
    this.particles.draw(ctx);
    this.player.draw(ctx);
    this.renderer.drawFlash();
    this.renderer.drawSpeedBar(ctx, this.gameSpeed, CONFIG.SPEED_MAX);

    // Death overlay
    if (this._state === 'dead') {
      ctx.fillStyle = 'rgba(255,20,60,0.12)';
      ctx.fillRect(0, 0, w, h);
    }
  }
}
