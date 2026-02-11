import { EntityManager } from "../entities/EntityManager";
import { EventBus } from "../core/EventBus";
import { CONFIG } from "../core/GameConfig";
import { Entity } from "../entities/Entity";
import { Player } from "../entities/Player";
import { Bot } from "../entities/Bot";

export interface AbsorptionEffect {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
  time: number;
}

export class AbsorptionSystem {
  effects: AbsorptionEffect[] = [];

  constructor(
    private entityManager: EntityManager,
    private eventBus: EventBus
  ) {}

  update(dt: number): void {
    const entities = this.entityManager.getAllEntities();
    this.entityManager.rebuildHash();

    for (let i = 0; i < entities.length; i++) {
      const a = entities[i];
      if (!a.isAlive) continue;

      const nearby = this.entityManager.entityHash.queryArea(a.position, a.radius * 3);

      for (const b of nearby) {
        if (a.id === b.id || !b.isAlive) continue;
        this.tryAbsorb(a, b);
      }
    }

    // 이펙트 업데이트
    for (let i = this.effects.length - 1; i >= 0; i--) {
      this.effects[i].time -= dt;
      this.effects[i].alpha = Math.max(0, this.effects[i].time / CONFIG.ABSORPTION.ANIMATION_DURATION);
      this.effects[i].radius += dt * 100;
      if (this.effects[i].time <= 0) {
        this.effects.splice(i, 1);
      }
    }
  }

  private tryAbsorb(a: Entity, b: Entity): void {
    if (a.mass <= b.mass * CONFIG.ABSORPTION.SIZE_RATIO_REQUIRED) return;

    const dist = a.position.distanceTo(b.position);
    const absorptionRange = a.radius * CONFIG.ABSORPTION.OVERLAP_RATIO * a.skillStats.absorptionRangeMultiplier;
    if (dist > absorptionRange) return;

    // 가시 체크: b가 가시 스킬이 있으면 a에 대미지
    if (b.skillStats.thornsDamage > 0) {
      a.mass -= b.skillStats.thornsDamage;
      if (a.mass < CONFIG.PLAYER.MIN_MASS) {
        a.kill();
        this.eventBus.emit("entity:killed", a.id, "thorns");
        return;
      }
    }

    // 흡수 실행
    const gained = b.mass * CONFIG.ABSORPTION.MASS_TRANSFER_RATE * a.skillStats.massGainMultiplier;
    a.mass += gained;

    // 킬 카운트
    if (a instanceof Player || a instanceof Bot) {
      (a as Player | Bot).kills++;
    }

    // 이펙트 추가
    this.effects.push({
      x: b.position.x,
      y: b.position.y,
      radius: b.radius,
      color: b.color,
      alpha: 1,
      time: CONFIG.ABSORPTION.ANIMATION_DURATION,
    });

    b.kill();
    this.eventBus.emit("entity:absorbed", a.id, b.id);
  }
}
