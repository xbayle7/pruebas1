import { CONFIG } from './config.js';

const STORAGE_KEY = 'sky_shooter_best';

export class ScoreManager {
  constructor() {
    this.score = 0;
    this.destroyed = 0;
    this.elapsed = 0;         // seconds alive
    this.best = this._loadBest();
    this._scoreTimer = 0;
  }

  reset() {
    this.score = 0;
    this.destroyed = 0;
    this.elapsed = 0;
    this._scoreTimer = 0;
  }

  update(dt) {
    this._scoreTimer += dt;
    this.elapsed += dt / 1000;

    // +1 per second survived
    if (this._scoreTimer >= 1000) {
      this._scoreTimer -= 1000;
      this.score += CONFIG.SCORE_PER_SECOND;
    }
  }

  addDestroy() {
    this.destroyed++;
    this.score += CONFIG.SCORE_PER_DESTROY;
  }

  saveBest() {
    if (this.score > this.best) {
      this.best = this.score;
      try { localStorage.setItem(STORAGE_KEY, String(this.best)); } catch (_) {}
    }
  }

  _loadBest() {
    try { return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10); } catch (_) { return 0; }
  }
}
