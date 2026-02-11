import { EntityManager } from "../entities/EntityManager";
import { CONFIG } from "../core/GameConfig";

export class FoodSpawnSystem {
  private spawnAccumulator: number = 0;

  constructor(private entityManager: EntityManager) {}

  init(): void {
    this.entityManager.spawnFood(CONFIG.WORLD.FOOD_COUNT);
  }

  update(dt: number): void {
    // 일정 수 이하로 떨어지면 재생성
    if (this.entityManager.food.length < CONFIG.WORLD.FOOD_COUNT) {
      this.spawnAccumulator += dt * CONFIG.WORLD.FOOD_RESPAWN_RATE;
      while (this.spawnAccumulator >= 1) {
        this.entityManager.spawnSingleFood();
        this.spawnAccumulator -= 1;
      }
    }
  }
}
