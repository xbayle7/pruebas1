/**
 * Game configuration constants.
 * Centralised here for easy tuning and future feature integration.
 */
export const CONFIG = {
  // Physics
  GRAVITY: 0.45,
  JUMP_FORCE: -9,

  // Player
  PLAYER_X: 120,
  PLAYER_WIDTH: 36,
  PLAYER_HEIGHT: 28,
  PLAYER_MAX_FALL: 12,

  // Bullets
  BULLET_SPEED: 14,
  BULLET_WIDTH: 18,
  BULLET_HEIGHT: 6,
  SHOOT_COOLDOWN: 300, // ms

  // Obstacles
  OBSTACLE_WIDTH: 28,
  GAP_MIN: 130,
  GAP_MAX: 200,
  SPAWN_INTERVAL_BASE: 1800,  // ms
  SPAWN_INTERVAL_MIN: 800,
  DYNAMIC_OBSTACLE_CHANCE: 0.45,  // 0–1

  // Difficulty
  SPEED_BASE: 3.5,
  SPEED_MAX: 9,
  SPEED_INCREMENT: 0.0004,   // per frame

  // Scoring
  SCORE_PER_SECOND: 1,
  SCORE_PER_DESTROY: 50,

  // Visual
  BG_PARALLAX_LAYERS: 3,
  PARTICLE_MAX: 80,
};
