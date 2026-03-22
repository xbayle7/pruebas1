export const CONFIG = {
  // Physics
  GRAVITY: 0.48,
  JUMP_FORCE: -10,

  // Player
  PLAYER_X: 120,
  PLAYER_WIDTH: 42,
  PLAYER_HEIGHT: 26,
  PLAYER_MAX_FALL: 14,

  // Bullets — burst fire
  BULLET_SPEED: 20,
  BULLET_WIDTH: 28,
  BULLET_HEIGHT: 4,
  BURST_SIZE:     3,    // shots per burst
  BURST_INTERVAL: 80,   // ms between shots within a burst
  BURST_COOLDOWN: 700,  // ms before next burst (~1.4 bursts/s)

  // Obstacles
  OBSTACLE_WIDTH: 32,
  GAP_MIN: 140,
  GAP_MAX: 210,
  SPAWN_INTERVAL_BASE: 2800,
  SPAWN_INTERVAL_MIN: 1200,
  DYNAMIC_OBSTACLE_CHANCE: 0.45,

  // Difficulty — speed ramps +10% every 30 s
  SPEED_BASE: 3.5,
  SPEED_MAX: 10,
  SPEED_RAMP_INTERVAL: 30000,  // ms between speed steps
  SPEED_RAMP_FACTOR:   1.10,   // +10% per step

  // Scoring
  SCORE_PER_SECOND: 1,
  SCORE_PER_DESTROY: 50,

  // Visual
  BG_PARALLAX_LAYERS: 4,
  PARTICLE_MAX: 200,
  FLOOR_HEIGHT: 36,
};
