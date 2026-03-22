/**
 * Procedural chiptune background music using Web Audio API.
 */

const BPM   = 138;
const STEP  = 60 / (BPM * 4); // 16th-note duration ≈ 0.109 s

// Frequencies (Hz)
const C3=130.81, G3=196.00, A3=220.00, E3=164.81;
const C4=261.63, E4=329.63, G4=392.00, A4=440.00;
const C5=523.25, E5=659.25, G5=783.99, A5=880.00;

// 32-step melody (null = rest)
const MELODY = [
  C5, null, E5, null, G5, null, E5,  C5,
  A4, null, C5, null, E5, null, A4,  null,
  G4, null, A4, null, C5, E5,  C5,  null,
  A4, G4,   A4, null, C5, null, null, null,
];

// 16-step bass (null = rest)
const BASS = [
  C3, null, null, null, G3, null, null, null,
  A3, null, null, null, E3, null, null, null,
];

export class AudioManager {
  constructor() {
    this._ctx    = null;
    this._master = null;
    this._running = false;
    this._timerId = null;
    this._nextBeat = 0;
    this._mIdx = 0;
    this._bIdx = 0;
  }

  _init() {
    if (this._ctx) return;
    this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    this._master = this._ctx.createGain();
    this._master.gain.value = 0.13;
    this._master.connect(this._ctx.destination);
  }

  start() {
    this._init();
    if (this._ctx.state === 'suspended') this._ctx.resume();
    if (this._running) return;
    this._running  = true;
    this._mIdx     = 0;
    this._bIdx     = 0;
    this._nextBeat = this._ctx.currentTime + 0.05;
    this._tick();
  }

  stop() {
    this._running = false;
    clearTimeout(this._timerId);
  }

  pause() {
    this._running = false;
    clearTimeout(this._timerId);
    if (this._master) {
      this._master.gain.setTargetAtTime(0, this._ctx.currentTime, 0.05);
    }
  }

  resume() {
    if (!this._ctx) return;
    if (this._ctx.state === 'suspended') this._ctx.resume();
    this._master.gain.setTargetAtTime(0.13, this._ctx.currentTime, 0.05);
    this._running  = true;
    this._nextBeat = this._ctx.currentTime + 0.05;
    this._tick();
  }

  _tick() {
    if (!this._running) return;
    const ctx = this._ctx;

    while (this._nextBeat < ctx.currentTime + 0.15) {
      const t = this._nextBeat;

      // Melody
      const mNote = MELODY[this._mIdx % MELODY.length];
      if (mNote) this._note(mNote, t, STEP * 0.85, 'square', 0.18);

      // Bass every 2 steps
      if (this._mIdx % 2 === 0) {
        const bNote = BASS[this._bIdx % BASS.length];
        if (bNote) this._note(bNote, t, STEP * 1.7, 'triangle', 0.22);
        this._bIdx++;
      }

      // Hi-hat click every step
      this._hihat(t, 0.04);

      // Kick on beats 1 and 3 (every 16 steps = 1 bar; beats = 0, 8)
      const bar = this._mIdx % 16;
      if (bar === 0 || bar === 8) this._kick(t, 0.28);

      this._mIdx++;
      this._nextBeat += STEP;
    }

    this._timerId = setTimeout(() => this._tick(), 22);
  }

  _note(freq, time, dur, type, vol) {
    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    env.gain.setValueAtTime(0.001, time);
    env.gain.linearRampToValueAtTime(vol, time + 0.005);
    env.gain.setValueAtTime(vol, time + dur * 0.6);
    env.gain.linearRampToValueAtTime(0.001, time + dur);

    osc.connect(env);
    env.connect(this._master);
    osc.start(time);
    osc.stop(time + dur + 0.01);
  }

  _hihat(time, vol) {
    const ctx   = this._ctx;
    const buf   = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
    const data  = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const src  = ctx.createBufferSource();
    const env  = ctx.createGain();
    const filt = ctx.createBiquadFilter();

    src.buffer  = buf;
    filt.type   = 'highpass';
    filt.frequency.value = 7000;

    env.gain.setValueAtTime(vol, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

    src.connect(filt);
    filt.connect(env);
    env.connect(this._master);
    src.start(time);
  }

  _kick(time, vol) {
    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.08);

    env.gain.setValueAtTime(vol, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(env);
    env.connect(this._master);
    osc.start(time);
    osc.stop(time + 0.15);
  }

  // ── Sound Effects ──────────────────────────────────────────

  sfxJump() {
    this._init();
    if (this._ctx.state === 'suspended') this._ctx.resume();
    const ctx = this._ctx;
    const t   = ctx.currentTime;

    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.18;

    osc.type = 'square';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.12);

    env.gain.setValueAtTime(0.5, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(env);
    env.connect(sfxGain);
    sfxGain.connect(this._ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  sfxShoot() {
    this._init();
    if (this._ctx.state === 'suspended') this._ctx.resume();
    const ctx = this._ctx;
    const t   = ctx.currentTime;

    // High-pitched laser zap
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.1;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.07);

    env.gain.setValueAtTime(0.6, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(env);
    env.connect(sfxGain);
    sfxGain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  sfxExplosion() {
    this._init();
    if (this._ctx.state === 'suspended') this._ctx.resume();
    const ctx = this._ctx;
    const t   = ctx.currentTime;

    // Noise burst
    const bufLen = ctx.sampleRate * 0.25;
    const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1);

    const src  = ctx.createBufferSource();
    const filt = ctx.createBiquadFilter();
    const env  = ctx.createGain();
    const sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.35;

    src.buffer       = buf;
    filt.type        = 'bandpass';
    filt.frequency.value = 300;
    filt.Q.value     = 0.8;

    env.gain.setValueAtTime(1, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    src.connect(filt);
    filt.connect(env);
    env.connect(sfxGain);
    sfxGain.connect(ctx.destination);
    src.start(t);
    src.stop(t + 0.25);

    // Low thud underneath
    const thud = ctx.createOscillator();
    const thudEnv = ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(120, t);
    thud.frequency.exponentialRampToValueAtTime(30, t + 0.15);
    thudEnv.gain.setValueAtTime(0.5, t);
    thudEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    thud.connect(thudEnv);
    thudEnv.connect(sfxGain);
    sfxGain.connect(ctx.destination);
    thud.start(t);
    thud.stop(t + 0.2);
  }

  sfxDamage() {
    this._init();
    if (this._ctx.state === 'suspended') this._ctx.resume();
    const ctx = this._ctx;
    const t   = ctx.currentTime;

    // Descending alarm-like tone
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.28;

    osc.type = 'square';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.linearRampToValueAtTime(80, t + 0.3);

    env.gain.setValueAtTime(0.7, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(env);
    env.connect(sfxGain);
    sfxGain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.38);
  }

  sfxGameOver() {
    this._init();
    if (this._ctx.state === 'suspended') this._ctx.resume();
    const ctx = this._ctx;
    const t   = ctx.currentTime;

    // Descending jingle
    const notes = [523.25, 392, 329.63, 261.63];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      const sfxGain = ctx.createGain();
      sfxGain.gain.value = 0.22;
      const nt = t + i * 0.18;

      osc.type = 'square';
      osc.frequency.value = freq;
      env.gain.setValueAtTime(0.6, nt);
      env.gain.exponentialRampToValueAtTime(0.001, nt + 0.16);

      osc.connect(env);
      env.connect(sfxGain);
      sfxGain.connect(ctx.destination);
      osc.start(nt);
      osc.stop(nt + 0.18);
    });
  }
}
