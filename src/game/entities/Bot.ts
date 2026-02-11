import { Entity } from "./Entity";
import { Vector2 } from "../utils/Vector2";
import { CONFIG } from "../core/GameConfig";
import { clamp, randomRange } from "../utils/MathUtils";

export interface BotPersonality {
  aggressiveness: number;
  caution: number;
  foodFocus: number;
  reactionTime: number;
  jitterAmount: number;
}

export interface WorldView {
  nearbyEntities: Entity[];
  nearbyFood: { position: Vector2; nutrition: number }[];
  nearbyBuffs: { position: Vector2 }[];
  nearbyEquipment: { position: Vector2 }[];
  stormCenter: Vector2;
  stormRadius: number;
  isInStorm: boolean;
}

export class Bot extends Entity {
  personality: BotPersonality;
  targetPosition: Vector2;
  kills: number = 0;
  shootCooldown: number = 0;
  private decisionTimer: number = 0;

  constructor(position: Vector2, name: string, color: string, personality?: Partial<BotPersonality>) {
    super(position, CONFIG.PLAYER.INITIAL_MASS, color);
    this.name = name;
    this.targetPosition = position.clone();
    this.personality = {
      aggressiveness: personality?.aggressiveness ?? randomRange(0.2, 0.8),
      caution: personality?.caution ?? randomRange(0.3, 0.7),
      foodFocus: personality?.foodFocus ?? randomRange(0.4, 0.9),
      reactionTime: personality?.reactionTime ?? randomRange(150, 400),
      jitterAmount: personality?.jitterAmount ?? randomRange(0.05, 0.2),
    };
  }

  think(view: WorldView): void {
    let bestScore = -Infinity;
    let bestTarget: Vector2 | null = null;

    // 1. 자기장 도망 (최우선)
    if (view.isInStorm) {
      const fleeScore = 100;
      if (fleeScore > bestScore) {
        bestScore = fleeScore;
        bestTarget = view.stormCenter;
      }
    }

    // 2. 큰 적에게서 도망
    for (const entity of view.nearbyEntities) {
      if (entity.id === this.id || !entity.isAlive) continue;
      if (entity.mass > this.mass * CONFIG.ABSORPTION.SIZE_RATIO_REQUIRED) {
        const dist = this.position.distanceTo(entity.position);
        const threatScore = (entity.mass / this.mass) * (1 / Math.max(dist, 1)) * 500 * this.personality.caution;
        if (threatScore > bestScore) {
          bestScore = threatScore;
          // 위협에서 반대 방향으로 도망
          const away = this.position.sub(entity.position).normalize();
          bestTarget = this.position.add(away.scale(200));
        }
      }
    }

    // 3. 작은 적 공격
    for (const entity of view.nearbyEntities) {
      if (entity.id === this.id || !entity.isAlive) continue;
      if (this.mass > entity.mass * CONFIG.ABSORPTION.SIZE_RATIO_REQUIRED) {
        const dist = this.position.distanceTo(entity.position);
        const attackScore = (this.mass / entity.mass) * (1 / Math.max(dist, 1)) * 300 * this.personality.aggressiveness;
        if (attackScore > bestScore) {
          bestScore = attackScore;
          bestTarget = entity.position.clone();
        }
      }
    }

    // 4. 버프 아이템 수집 (높은 우선순위)
    for (const buff of view.nearbyBuffs) {
      const dist = this.position.distanceTo(buff.position);
      const buffScore = 80 * (1 / Math.max(dist, 1)) * 100;
      if (buffScore > bestScore) {
        bestScore = buffScore;
        bestTarget = buff.position;
      }
    }

    // 4.5. 장비 아이템 수집
    for (const equip of view.nearbyEquipment) {
      const dist = this.position.distanceTo(equip.position);
      const equipScore = 90 * (1 / Math.max(dist, 1)) * 100;
      if (equipScore > bestScore) {
        bestScore = equipScore;
        bestTarget = equip.position;
      }
    }

    // 5. 음식 수집
    let closestFoodDist = Infinity;
    let closestFood: Vector2 | null = null;
    for (const food of view.nearbyFood) {
      const dist = this.position.distanceTo(food.position);
      if (dist < closestFoodDist) {
        closestFoodDist = dist;
        closestFood = food.position;
      }
    }
    if (closestFood) {
      const foodScore = this.personality.foodFocus * 50 * (1 / Math.max(closestFoodDist, 1)) * (1 / (1 + this.mass * 0.01));
      if (foodScore > bestScore) {
        bestTarget = closestFood;
      }
    }

    // 결정된 타겟에 노이즈 추가
    if (bestTarget) {
      const jitter = Vector2.random().scale(this.personality.jitterAmount * 50);
      this.targetPosition = bestTarget.add(jitter);
    } else {
      // 타겟 없으면 랜덤 배회
      if (this.position.distanceTo(this.targetPosition) < 50) {
        this.targetPosition = new Vector2(
          randomRange(100, CONFIG.WORLD.WIDTH - 100),
          randomRange(100, CONFIG.WORLD.HEIGHT - 100)
        );
      }
    }
  }

  update(dt: number): void {
    if (!this.isAlive) return;

    this.decisionTimer -= dt * 1000;

    const dir = this.targetPosition.sub(this.position);
    const dist = dir.length();

    if (dist > 1) {
      const normalized = dir.normalize();
      const moveSpeed = this.speed;
      const movement = normalized.scale(Math.min(moveSpeed * dt, dist));
      this.position = this.position.add(movement);
    }

    this.position.x = clamp(this.position.x, this.radius, CONFIG.WORLD.WIDTH - this.radius);
    this.position.y = clamp(this.position.y, this.radius, CONFIG.WORLD.HEIGHT - this.radius);
  }

  needsDecision(): boolean {
    if (this.decisionTimer <= 0) {
      this.decisionTimer = this.personality.reactionTime;
      return true;
    }
    return false;
  }
}
