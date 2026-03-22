/**
 * Centralised input manager.
 * – Fires callbacks on press
 * – Exposes isShootHeld / isJumpHeld for continuous input in the game loop
 */
export class InputManager {
  constructor(canvas, btnJump, btnShoot) {
    this.isShootHeld = false;
    this.isJumpHeld  = false;

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
    // Mouse
    canvas.addEventListener('mousedown', e => {
      e.preventDefault();
      if (e.button === 2) { this.isJumpHeld  = true; this._fireJump(); }
      if (e.button === 0) { this.isShootHeld = true; this._fireShoot(); }
    });
    canvas.addEventListener('mouseup', e => {
      if (e.button === 2) this.isJumpHeld  = false;
      if (e.button === 0) this.isShootHeld = false;
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    // Touch: left 55% = shoot, right 45% = jump
    const activeTouches = { shoot: new Set(), jump: new Set() };

    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const rect = canvas.getBoundingClientRect();
        if ((t.clientX - rect.left) < rect.width * 0.55) {
          activeTouches.shoot.add(t.identifier);
          if (!this.isShootHeld) { this.isShootHeld = true; this._fireShoot(); }
        } else {
          activeTouches.jump.add(t.identifier);
          if (!this.isJumpHeld) { this.isJumpHeld = true; this._fireJump(); }
        }
      }
    }, { passive: false });

    canvas.addEventListener('touchend', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        activeTouches.shoot.delete(t.identifier);
        activeTouches.jump.delete(t.identifier);
      }
      if (activeTouches.shoot.size === 0) this.isShootHeld = false;
      if (activeTouches.jump.size  === 0) this.isJumpHeld  = false;
    }, { passive: false });

    canvas.addEventListener('touchcancel', e => {
      for (const t of e.changedTouches) {
        activeTouches.shoot.delete(t.identifier);
        activeTouches.jump.delete(t.identifier);
      }
      if (activeTouches.shoot.size === 0) this.isShootHeld = false;
      if (activeTouches.jump.size  === 0) this.isJumpHeld  = false;
    }, { passive: false });
  }

  _bindKeyboard() {
    const JUMP_KEYS  = new Set(['Space', 'ArrowUp', 'KeyW']);
    const SHOOT_KEYS = new Set(['KeyX', 'KeyZ', 'ControlLeft', 'ShiftLeft', 'KeyF']);

    window.addEventListener('keydown', e => {
      if (JUMP_KEYS.has(e.code)) {
        e.preventDefault();
        if (!this.isJumpHeld) { this.isJumpHeld = true; this._fireJump(); }
      }
      if (SHOOT_KEYS.has(e.code)) {
        e.preventDefault();
        if (!this.isShootHeld) { this.isShootHeld = true; this._fireShoot(); }
      }
      if (e.code === 'Escape') {
        e.preventDefault();
        this._firePause();
      }
    });

    window.addEventListener('keyup', e => {
      if (JUMP_KEYS.has(e.code))  this.isJumpHeld  = false;
      if (SHOOT_KEYS.has(e.code)) this.isShootHeld = false;
    });
  }

  _bindButtons(btnJump, btnShoot) {
    if (!btnJump || !btnShoot) return;

    const startJump  = e => { e.preventDefault(); if (!this.isJumpHeld)  { this.isJumpHeld  = true; this._fireJump(); } };
    const startShoot = e => { e.preventDefault(); if (!this.isShootHeld) { this.isShootHeld = true; this._fireShoot(); } };
    const endJump    = e => { e.preventDefault(); this.isJumpHeld  = false; };
    const endShoot   = e => { e.preventDefault(); this.isShootHeld = false; };

    btnJump.addEventListener('touchstart',  startJump,  { passive: false });
    btnJump.addEventListener('touchend',    endJump,    { passive: false });
    btnJump.addEventListener('touchcancel', endJump,    { passive: false });
    btnJump.addEventListener('mousedown',   startJump);
    btnJump.addEventListener('mouseup',     endJump);

    btnShoot.addEventListener('touchstart',  startShoot, { passive: false });
    btnShoot.addEventListener('touchend',    endShoot,   { passive: false });
    btnShoot.addEventListener('touchcancel', endShoot,   { passive: false });
    btnShoot.addEventListener('mousedown',   startShoot);
    btnShoot.addEventListener('mouseup',     endShoot);
  }
}
