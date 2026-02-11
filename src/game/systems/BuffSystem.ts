import { EntityManager } from "../entities/EntityManager";
import { BuffItem, BuffType, BUFF_DEFS } from "../entities/BuffItem";
import { Vector2 } from "../utils/Vector2";
import { CONFIG } from "../core/GameConfig";
import { randomRange } from "../utils/MathUtils";

const BUFF_TYPES = [BuffType.SPEED, BuffType.SHIELD, BuffType.DAMAGE, BuffType.MAGNET];
const MAX_BUFFS = 8;
const SPAWN_INTERVAL = 12; // 12초마다 스폰
const MAGNET_RANGE = 200;
const MAGNET_PULL_SPEED = 300;

export class BuffSystem {
  buffs: BuffItem[] = [];
  private spawnTimer: number = 5; // 5초 후 첫 스폰

  constructor(private entityManager: EntityManager) {}

  update(dt: number): void {
    // 스폰
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.buffs.length < MAX_BUFFS) {
      this.spawnRandomBuff();
      this.spawnTimer = SPAWN_INTERVAL;
    }

    // 픽업 체크
    const entities = this.entityManager.getAllEntities();
    for (const buff of this.buffs) {
      if (!buff.isAlive) continue;
      for (const entity of entities) {
        if (!entity.isAlive) continue;
        const dist = entity.position.distanceTo(buff.position);
        if (dist < entity.radius + buff.radius) {
          entity.addBuff(buff.buffType, buff.def.duration);
          buff.isAlive = false;
          break;
        }
      }
    }

    // 마그넷 버프 효과: 주변 음식 끌어당김
    for (const entity of entities) {
      if (!entity.isAlive || !entity.hasBuff(BuffType.MAGNET)) continue;
      for (const food of this.entityManager.food) {
        if (!food.isAlive) continue;
        const dist = entity.position.distanceTo(food.position);
        if (dist < MAGNET_RANGE && dist > 1) {
          const dir = entity.position.sub(food.position).normalize();
          food.position = food.position.add(dir.scale(MAGNET_PULL_SPEED * dt));
        }
      }
    }

    // 엔티티 버프 타이머 업데이트
    for (const entity of entities) {
      entity.updateBuffs(dt);
    }

    // 죽은 버프 정리
    this.buffs = this.buffs.filter((b) => b.isAlive);
  }

  private spawnRandomBuff(): void {
    const type = BUFF_TYPES[Math.floor(Math.random() * BUFF_TYPES.length)];
    const pos = new Vector2(
      randomRange(200, CONFIG.WORLD.WIDTH - 200),
      randomRange(200, CONFIG.WORLD.HEIGHT - 200)
    );
    this.buffs.push(new BuffItem(pos, type));
  }

  clear(): void {
    this.buffs = [];
    this.spawnTimer = 5;
  }
}
