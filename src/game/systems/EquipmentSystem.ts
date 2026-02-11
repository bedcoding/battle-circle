import { EntityManager } from "../entities/EntityManager";
import { EquipmentItem, EquipType, EquipRarity } from "../entities/EquipmentItem";
import { Vector2 } from "../utils/Vector2";
import { CONFIG } from "../core/GameConfig";
import { randomRange } from "../utils/MathUtils";

const EQUIP_TYPES = [EquipType.ARMOR, EquipType.SCOPE, EquipType.BOOTS, EquipType.HEAVY_AMMO];
const MAX_EQUIPS = 6;
const SPAWN_INTERVAL = 18; // 18초마다 스폰
const BOOTS_WEAR_RATE = 1; // 초당 내구도 감소

export class EquipmentSystem {
  items: EquipmentItem[] = [];
  private spawnTimer: number = 8; // 8초 후 첫 스폰

  constructor(private entityManager: EntityManager) {}

  update(dt: number): void {
    // 스폰
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.items.length < MAX_EQUIPS) {
      this.spawnRandomEquip();
      this.spawnTimer = SPAWN_INTERVAL;
    }

    // 픽업 체크
    const entities = this.entityManager.getAllEntities();
    for (const item of this.items) {
      if (!item.isAlive) continue;
      for (const entity of entities) {
        if (!entity.isAlive) continue;
        const dist = entity.position.distanceTo(item.position);
        if (dist < entity.radius + item.radius) {
          // 같은 타입 장착 시 더 좋은 등급만 교체
          const existing = entity.equipment.find((e) => e.type === item.equipType);
          if (existing) {
            const rarityOrder = [EquipRarity.COMMON, EquipRarity.RARE, EquipRarity.EPIC];
            if (rarityOrder.indexOf(item.rarity) <= rarityOrder.indexOf(existing.rarity)) {
              continue; // 같거나 낮은 등급이면 스킵
            }
          }

          const stats: Record<string, number> = {};
          for (const key of Object.keys(item.def.baseStats)) {
            stats[key] = item.getStatValue(key);
          }
          entity.equipItem(item.equipType, item.rarity, item.durability, stats);
          item.isAlive = false;
          break;
        }
      }
    }

    // 부츠 내구도 시간 경과로 감소
    for (const entity of entities) {
      if (!entity.isAlive) continue;
      entity.wearEquip(EquipType.BOOTS, BOOTS_WEAR_RATE * dt);
    }

    // 죽은 아이템 정리
    this.items = this.items.filter((i) => i.isAlive);
  }

  private spawnRandomEquip(): void {
    const type = EQUIP_TYPES[Math.floor(Math.random() * EQUIP_TYPES.length)];

    // 레어리티 확률: 커먼 60%, 레어 30%, 에픽 10%
    const roll = Math.random();
    const rarity = roll < 0.6 ? EquipRarity.COMMON : roll < 0.9 ? EquipRarity.RARE : EquipRarity.EPIC;

    const pos = new Vector2(
      randomRange(200, CONFIG.WORLD.WIDTH - 200),
      randomRange(200, CONFIG.WORLD.HEIGHT - 200)
    );
    this.items.push(new EquipmentItem(pos, type, rarity));
  }

  clear(): void {
    this.items = [];
    this.spawnTimer = 8;
  }
}
