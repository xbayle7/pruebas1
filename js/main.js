import { Game } from './game.js';
import { InputManager } from './input.js';

const canvas   = document.getElementById('game-canvas');
const btnJump  = document.getElementById('btn-jump');
const btnShoot = document.getElementById('btn-shoot');

const input = new InputManager(canvas, btnJump, btnShoot);
let game = null;

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function startGame() {
  showScreen('game-screen');
  if (!game) {
    game = new Game(canvas, input);
  }
  game.start();
}

function goMenu() {
  if (game) game.stop();
  showScreen('menu-screen');
}

// ── Button wiring ──────────────────────────────────────────
document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-restart').addEventListener('click', startGame);
document.getElementById('btn-menu').addEventListener('click', goMenu);

// Pause overlay menu button
document.getElementById('btn-pause-menu').addEventListener('click', goMenu);
