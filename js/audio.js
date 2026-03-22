/**
 * Procedural chiptune background music using Web Audio API.
 * 128-step melody (8 bars) with a 32-step bass — longer, more melodic, less repetitive.
 */

const BPM  = 120;
const STEP = 60 / (BPM * 4); // 16th-note ≈ 0.125 s

// ── Frequencies ──────────────────────────────────────────────────────────────
const A2=110.00, B2=123.47, C3=130.81, D3=146.83, E3=164.81, F3=174.61, G3=196.00;
const A3=220.00, B3=246.94, C4=261.63, D4=293.66, E4=329.63, F4=349.23, G4=392.00;
const A4=440.00, B4=493.88, C5=523.25, D5=587.33, E5=659.25, F5=698.46, G5=783.99;
const A5=880.00, C6=1046.5;
const F2=87.31, G2=98.00;
const _=null;

// ── 128-step melody — A natural minor, 8 bars ─────────────────────────────
// Chord map: Am | F | C | G | Am | Dm | F | Am
const MELODY = [
  // Bar 1 – Am  (A C E)
  E5,_,C5,_, A4,_,E5,_, C5,E5,A5,_, G5,_,E5,_,
  // Bar 2 – F   (F A C)
  F5,_,A5,_, C5,_,F5,_, E5,D5,C5,D5, E5,_,_,_,
  // Bar 3 – C   (C E G)
  G4,_,C5,_, E5,_,G5,_, E5,C5,E5,G5, A5,_,G5,_,
  // Bar 4 – G   (G B D)
  D5,_,B4,_, G4,B4,D5,_, G5,_,A5,G5, F5,E5,D5,_,
  // Bar 5 – Am  (development — descending run)
  A5,G5,E5,C5, B4,_,D5,_, C5,_,E5,_, G5,A5,G5,E5,
  // Bar 6 – Dm  (D F A)
  F5,_,D5,_, A4,_,D5,F5, E5,_,D5,_, C5,_,A4,_,
  // Bar 7 – F   (rising arpeggio into flourish)
  F4,A4,C5,F5, A5,_,C6,_, A5,G5,F5,E5, D5,C5,A4,_,
  // Bar 8 – Am  (resolve)
  A4,C5,E5,A5, G5,E5,C5,A4, B4,_,E5,_, A4,_,_,_,
];

// ── 32-step bass — follows chord changes (one chord per 8 melody steps → 4 bass steps) ──
// Am F C G Am Dm F Am
const BASS = [
  // Am
  A2,_,_,_, E3,_,_,_,
  // F
  F2,_,_,_, C3,_,_,_,
  // C
  C3,_,_,_, G3,_,_,_,
  // G
  G2,_,_,_, D3,_,_,_,
];

// ── 32-step counter-melody (plays on 2nd bar pass onwards, adds harmony) ──
const COUNTER = [
  C5,_,_,_, E5,_,C5,_, A4,_,_,_, G4,_,E4,_,
  A4,_,C5,_, F4,_,_,_, G4,_,E4,_, D5,_,C5,_,
];

export class AudioManager {
  constructor() {
    this._ctx    = null;
    this._master = null;
    this._running = false;
    this._muted   = false;
    this._timerId = null;
    this._nextBeat = 0;
    this._mIdx = 0;
    this._bIdx = 0;
    this._cIdx = 0;
    this._pass = 0;  // how many full 128-step cycles completed
  }

  _init() {
    if (this._ctx) return;
    this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    this._master = this._ctx.createGain();
    this._master.gain.value = this._muted ? 0 : 0.13;
    this._master.connect(this._ctx.destination);
  }

  start() {
    this._init();
    if (this._ctx.state === 'suspended') this._ctx.resume();
    if (this._running) return;
    this._running  = true;
    this._mIdx     = 0;
    this._bIdx     = 0;
    this._cIdx     = 0;
    this._pass     = 0;
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
  }

  get muted() { return this._muted; }

  toggleMute() {
    this._init();
    this._muted = !this._muted;
    const vol = this._muted ? 0 : 0.13;
    this._master.gain.setTargetAtTime(vol, this._ctx.currentTime, 0.05);
    return this._muted;
  }

  resume() {
    if (!this._ctx) return;
    if (this._ctx.state === 'suspended') this._ctx.resume();
    this._running  = true;
    this._nextBeat = this._ctx.currentTime + 0.05;
    this._tick();
  }

  _tick() {
    if (!this._running) return;
    const ctx = this._ctx;

    while (this._nextBeat < ctx.currentTime + 0.18) {
      const t = this._nextBeat;

      // ── Melody ──
      const mNote = MELODY[this._mIdx % MELODY.length];
      if (mNote) this._note(mNote, t, STEP * 0.82, 'square', 0.16);

      // ── Counter-melody (from pass 1 onward, softer) ──
      if (this._pass >= 1) {
        const cNote = COUNTER[this._cIdx % COUNTER.length];
        if (cNote) this._note(cNote, t, STEP * 0.75, 'triangle', 0.09);
        this._cIdx++;
      }

      // ── Bass every 4 steps ──
      if (this._mIdx % 4 === 0) {
        const bNote = BASS[this._bIdx % BASS.length];
        if (bNote) this._note(bNote, t, STEP * 3.6, 'triangle', 0.20);
        this._bIdx++;
      }

      // ── Hi-hat every step ──
      this._hihat(t, 0.035);

      // ── Kick: beats 1 & 3 of each bar (every 16 steps; beats at 0 and 8) ──
      const barPos = this._mIdx % 16;
      if (barPos === 0 || barPos === 8) this._kick(t, 0.26);

      // ── Snare on beats 2 & 4 (positions 4 and 12) ──
      if (barPos === 4 || barPos === 12) this._snare(t, 0.14);

      this._mIdx++;

      // Track how many full 128-step passes completed
      if (this._mIdx % MELODY.length === 0) {
        this._pass++;
        this._bIdx = 0;
        this._cIdx = 0;
      }

      this._nextBeat += STEP;
    }

    this._timerId = setTimeout(() => this._tick(), 20);
  }

  _note(freq, time, dur, type, vol) {
    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    env.gain.setValueAtTime(0.001, time);
    env.gain.linearRampToValueAtTime(vol, time + 0.006);
    env.gain.setValueAtTime(vol, time + dur * 0.55);
    env.gain.linearRampToValueAtTime(0.001, time + dur);

    osc.connect(env);
    env.connect(this._master);
    osc.start(time);
    osc.stop(time + dur + 0.01);
  }

  _hihat(time, vol) {
    const ctx   = this._ctx;
    const buf   = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.035), ctx.sampleRate);
    const data  = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const src  = ctx.createBufferSource();
    const env  = ctx.createGain();
    const filt = ctx.createBiquadFilter();

    src.buffer           = buf;
    filt.type            = 'highpass';
    filt.frequency.value = 8000;

    env.gain.setValueAtTime(vol, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.028);

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
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.09);

    env.gain.setValueAtTime(vol, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    osc.connect(env);
    env.connect(this._master);
    osc.start(time);
    osc.stop(time + 0.16);
  }

  _snare(time, vol) {
    const ctx  = this._ctx;
    // Noise layer
    const buf  = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.12), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src  = ctx.createBufferSource();
    const filt = ctx.createBiquadFilter();
    const env  = ctx.createGain();
    src.buffer           = buf;
    filt.type            = 'bandpass';
    filt.frequency.value = 2200;
    filt.Q.value         = 0.7;
    env.gain.setValueAtTime(vol, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.10);
    src.connect(filt);
    filt.connect(env);
    env.connect(this._master);
    src.start(time);

    // Tone layer
    const osc  = ctx.createOscillator();
    const oenv = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 220;
    oenv.gain.setValueAtTime(vol * 0.5, time);
    oenv.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
    osc.connect(oenv);
    oenv.connect(this._master);
    osc.start(time);
    osc.stop(time + 0.07);
  }

  // ── Sound Effects ──────────────────────────────────────────────────────────

  sfxJump() {
    this._init();
    if (this._ctx.state === 'suspended') this._ctx.resume();
    const ctx = this._ctx;
    const t   = ctx.currentTime;

    const osc     = ctx.createOscillator();
    const env     = ctx.createGain();
    const sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.18;

    osc.type = 'square';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.12);

    env.gain.setValueAtTime(0.5, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(env);
    env.connect(sfxGain);
    sfxGain.connect(this._master);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  sfxShoot() {
    this._init();
    if (this._ctx.state === 'suspended') this._ctx.resume();
    const ctx = this._ctx;
    const t   = ctx.currentTime;

    const osc     = ctx.createOscillator();
    const env     = ctx.createGain();
    const sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.10;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(350, t + 0.07);

    env.gain.setValueAtTime(0.6, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(env);
    env.connect(sfxGain);
    sfxGain.connect(this._master);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  /** Enemy bullet sound — lower, more menacing */
  sfxEnemyShoot() {
    this._init();
    if (this._ctx.state === 'suspended') this._ctx.resume();
    const ctx = this._ctx;
    const t   = ctx.currentTime;

    const osc     = ctx.createOscillator();
    const env     = ctx.createGain();
    const sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.10;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);

    env.gain.setValueAtTime(0.55, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.13);

    osc.connect(env);
    env.connect(sfxGain);
    sfxGain.connect(this._master);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  sfxExplosion() {
    this._init();
    if (this._ctx.state === 'suspended') this._ctx.resume();
    const ctx = this._ctx;
    const t   = ctx.currentTime;

    const bufLen = Math.floor(ctx.sampleRate * 0.25);
    const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const src     = ctx.createBufferSource();
    const filt    = ctx.createBiquadFilter();
    const env     = ctx.createGain();
    const sfxGain = ctx.createGain();
    sfxGain.gain.value  = 0.35;
    src.buffer          = buf;
    filt.type           = 'bandpass';
    filt.frequency.value = 300;
    filt.Q.value        = 0.8;
    env.gain.setValueAtTime(1, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    src.connect(filt);
    filt.connect(env);
    env.connect(sfxGain);
    sfxGain.connect(this._master);
    src.start(t);
    src.stop(t + 0.25);

    const thud    = ctx.createOscillator();
    const thudEnv = ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(120, t);
    thud.frequency.exponentialRampToValueAtTime(30, t + 0.15);
    thudEnv.gain.setValueAtTime(0.5, t);
    thudEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    thud.connect(thudEnv);
    thudEnv.connect(sfxGain);
    thud.start(t);
    thud.stop(t + 0.2);
  }

  sfxDamage() {
    this._init();
    if (this._ctx.state === 'suspended') this._ctx.resume();
    const ctx = this._ctx;
    const t   = ctx.currentTime;

    const osc     = ctx.createOscillator();
    const env     = ctx.createGain();
    const sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.28;

    osc.type = 'square';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.linearRampToValueAtTime(80, t + 0.3);
    env.gain.setValueAtTime(0.7, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(env);
    env.connect(sfxGain);
    sfxGain.connect(this._master);
    osc.start(t);
    osc.stop(t + 0.38);
  }

  sfxGameOver() {
    this._init();
    if (this._ctx.state === 'suspended') this._ctx.resume();
    const ctx = this._ctx;
    const t   = ctx.currentTime;

    [523.25, 392, 329.63, 261.63].forEach((freq, i) => {
      const osc     = ctx.createOscillator();
      const env     = ctx.createGain();
      const sfxGain = ctx.createGain();
      sfxGain.gain.value = 0.22;
      const nt = t + i * 0.18;
      osc.type = 'square';
      osc.frequency.value = freq;
      env.gain.setValueAtTime(0.6, nt);
      env.gain.exponentialRampToValueAtTime(0.001, nt + 0.16);
      osc.connect(env);
      env.connect(sfxGain);
      sfxGain.connect(this._master);
      osc.start(nt);
      osc.stop(nt + 0.18);
    });
  }

  sfxGroan() {
    this._init();
    if (this._ctx.state === 'suspended') this._ctx.resume();
    const ctx = this._ctx;
    const t   = ctx.currentTime;

    const osc     = ctx.createOscillator();
    const lfo     = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const filt    = ctx.createBiquadFilter();
    const env     = ctx.createGain();
    const sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.22;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(380, t);
    osc.frequency.linearRampToValueAtTime(140, t + 0.35);

    lfo.type = 'sine';
    lfo.frequency.value = 7;
    lfoGain.gain.value  = 18;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    filt.type            = 'bandpass';
    filt.frequency.value = 900;
    filt.Q.value         = 1.2;

    env.gain.setValueAtTime(0.001, t);
    env.gain.linearRampToValueAtTime(0.9, t + 0.04);
    env.gain.setValueAtTime(0.9, t + 0.15);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(filt);
    filt.connect(env);
    env.connect(sfxGain);
    sfxGain.connect(this._master);
    lfo.start(t);  lfo.stop(t + 0.41);
    osc.start(t);  osc.stop(t + 0.41);
  }
}
