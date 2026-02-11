import { EntityManager } from "../entities/EntityManager";

export class PhysicsSystem {
  constructor(private entityManager: EntityManager) {}

  update(_dt: number): void {
    const entities = this.entityManager.getAllEntities();

    // 음식 충돌 체크
    for (const entity of entities) {
      for (const food of this.entityManager.food) {
        if (!food.isAlive) continue;
        const dist = entity.position.distanceTo(food.position);
        if (dist < entity.radius + food.radius) {
          entity.mass += food.nutrition * entity.skillStats.massGainMultiplier;
          food.isAlive = false;
        }
      }
    }

    // 엔티티 vs 엄폐물 충돌 (밀어내기)
    for (const entity of entities) {
      for (const obs of this.entityManager.obstacles) {
        const dist = entity.position.distanceTo(obs.position);
        const minDist = entity.radius + obs.radius;
        if (dist < minDist && dist > 0) {
          const overlap = minDist - dist;
          const pushDir = entity.position.sub(obs.position).normalize();
          entity.position = entity.position.add(pushDir.scale(overlap));
        }
      }
    }
  }
}
