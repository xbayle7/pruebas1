/**
 * Centralised input manager.
 * Captures keyboard, mouse and touch events.
 * Exposes simple boolean state flags.
 */
export class InputManager {
  constructor(canvas, btnJump, btnShoot) {
    this.jumpPressed = false;
    this.shootPressed = false;

    this._jumpCallbacks = [];
    this._shootCallbacks = [];

    this._bindCanvas(canvas);
    this._bindButtons(btnJump, btnShoot);
  }

  onJump(fn) { this._jumpCallbacks.push(fn); }
  onShoot(fn) { this._shootCallbacks.push(fn); }

  _fireJump() { this._jumpCallbacks.forEach(fn => fn()); }
  _fireShoot() { this._shootCallbacks.forEach(fn => fn()); }

  _bindCanvas(canvas) {
    // Right mouse button → jump
    canvas.addEventListener('mousedown', e => {
      e.preventDefault();
      if (e.button === 2) this._fireJump();
      if (e.button === 0) this._fireShoot();
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    // Keyboard
    window.addEventListener('keydown', e => {
      if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); this._fireJump(); }
      if (e.code === 'KeyZ' || e.code === 'ControlLeft' || e.code === 'ShiftLeft') { e.preventDefault(); this._fireShoot(); }
    });
  }

  _bindButtons(btnJump, btnShoot) {
    if (!btnJump || !btnShoot) return;

    const prevent = e => e.preventDefault();

    btnJump.addEventListener('touchstart', e => { prevent(e); this._fireJump(); }, { passive: false });
    btnJump.addEventListener('mousedown',  e => { prevent(e); this._fireJump(); });

    btnShoot.addEventListener('touchstart', e => { prevent(e); this._fireShoot(); }, { passive: false });
    btnShoot.addEventListener('mousedown',  e => { prevent(e); this._fireShoot(); });
  }
}
