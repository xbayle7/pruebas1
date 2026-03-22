/**
 * Centralised input manager.
 * Captures keyboard, mouse and touch events.
 * Exposes simple boolean state flags.
 */
export class InputManager {
  constructor(canvas, btnJump, btnShoot) {
    this.jumpPressed  = false;
    this.shootPressed = false;

    this._jumpCallbacks  = [];
    this._shootCallbacks = [];
    this._pauseCallbacks = [];

    this._canvas = canvas;
    this._bindCanvas(canvas);
    this._bindButtons(btnJump, btnShoot);
    this._bindKeyboard();
  }

  onJump(fn)  { this._jumpCallbacks.push(fn); }
  onShoot(fn) { this._shootCallbacks.push(fn); }
  onPause(fn) { this._pauseCallbacks.push(fn); }

  _fireJump()  { this._jumpCallbacks.forEach(fn => fn()); }
  _fireShoot() { this._shootCallbacks.forEach(fn => fn()); }
  _firePause() { this._pauseCallbacks.forEach(fn => fn()); }

  _bindCanvas(canvas) {
    // Mouse: left = shoot, right = jump
    canvas.addEventListener('mousedown', e => {
      e.preventDefault();
      if (e.button === 2) this._fireJump();
      if (e.button === 0) this._fireShoot();
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    // Touch: left 55% of canvas = shoot, right 45% = jump
    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        const rect = canvas.getBoundingClientRect();
        const relX = touch.clientX - rect.left;
        if (relX < rect.width * 0.55) {
          this._fireShoot();
        } else {
          this._fireJump();
        }
      }
    }, { passive: false });
  }

  _bindKeyboard() {
    window.addEventListener('keydown', e => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        this._fireJump();
      }
      if (e.code === 'KeyZ' || e.code === 'ControlLeft' || e.code === 'ShiftLeft') {
        e.preventDefault();
        this._fireShoot();
      }
      if (e.code === 'Escape') {
        e.preventDefault();
        this._firePause();
      }
    });
  }

  _bindButtons(btnJump, btnShoot) {
    if (!btnJump || !btnShoot) return;

    const prevent = e => e.preventDefault();

    btnJump.addEventListener('touchstart',  e => { prevent(e); this._fireJump(); },  { passive: false });
    btnJump.addEventListener('mousedown',   e => { prevent(e); this._fireJump(); });

    btnShoot.addEventListener('touchstart', e => { prevent(e); this._fireShoot(); }, { passive: false });
    btnShoot.addEventListener('mousedown',  e => { prevent(e); this._fireShoot(); });
  }
}
