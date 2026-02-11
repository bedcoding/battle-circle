export const CONFIG = {
  WORLD: {
    WIDTH: 6000, // 맵 크기 확장 (4000 -> 6000)
    HEIGHT: 6000,
    FOOD_COUNT: 500, // 음식 개수도 맵 크기에 맞춰 증량
    FOOD_RESPAWN_RATE: 2,
    LARGE_FOOD_CHANCE: 0.05,
  },
  PLAYER: {
    INITIAL_MASS: 50,
    MIN_MASS: 10,
    BASE_SPEED: 900,
    SPEED_DECAY: 0.003,
    RADIUS_MULTIPLIER: 4.0,
  },
  ABSORPTION: {
    SIZE_RATIO_REQUIRED: 1.0,
    OVERLAP_RATIO: 0.6,
    MASS_TRANSFER_RATE: 0.8,
    ANIMATION_DURATION: 0.3,
  },
  STORM: {
    PHASES: [
      { waitTime: 30, shrinkTime: 20, targetRadius: 2000, damageRate: 0.02, centerDrift: 300 }, // 첫 자기장 크기도 확장
      { waitTime: 25, shrinkTime: 15, targetRadius: 1200, damageRate: 0.04, centerDrift: 200 },
      { waitTime: 20, shrinkTime: 12, targetRadius: 700, damageRate: 0.07, centerDrift: 150 },
      { waitTime: 15, shrinkTime: 10, targetRadius: 250, damageRate: 0.12, centerDrift: 80 },
      { waitTime: 10, shrinkTime: 8, targetRadius: 50, damageRate: 0.20, centerDrift: 30 },
    ],
  },
  BOT: {
    COUNT: 40, // 적 수 2배로 증가 (20 -> 40)
    VISION_RANGE_MULTIPLIER: 1.5,
    DECISION_INTERVAL_BASE: 250,
    JITTER_ANGLE: Math.PI / 12,
    NAME_PREFIX: "코잉이",
  },
  RENDER: {
    GRID_SIZE: 50,
    GRID_COLOR: "rgba(255,255,255,0.05)",
    BG_COLOR: "#1a1a2e",
    STORM_COLOR: "rgba(255, 50, 50, 0.3)",
    SAFE_ZONE_BORDER: "rgba(255, 255, 255, 0.5)",
    MINIMAP_SIZE: 180,
    MINIMAP_MARGIN: 16,
  },
} as const;
