import { EntityManager } from "../entities/EntityManager";
import { CONFIG } from "../core/GameConfig";

export class FoodSpawnSystem {
  private spawnAccumulator: number = 0;

  constructor(private entityManager: EntityManager) { }

  init(): void {
    this.entityManager.spawnFood(CONFIG.WORLD.FOOD_COUNT);
  }

  update(dt: number): void {
    // 일정 수 이하로 떨어지면 재생성
    if (this.entityManager.food.length < CONFIG.WORLD.FOOD_COUNT) {
      this.spawnAccumulator += dt * CONFIG.WORLD.FOOD_RESPAWN_RATE;
      let iterations = 0;
      while (this.spawnAccumulator >= 1 && iterations < 100) {
        this.entityManager.spawnSingleFood();
        this.spawnAccumulator -= 1;
        iterations++;
      }
      // Safety reset if accumulated too much
      if (this.spawnAccumulator >= 1) {
        this.spawnAccumulator = 0;
      }
    }
  }
}
