import { EntityManager } from "../entities/EntityManager";
import { Projectile } from "../entities/Projectile";
import { EventBus } from "../core/EventBus";
import { CONFIG } from "../core/GameConfig";
import { BuffType } from "../entities/BuffItem";
import { EquipType } from "../entities/EquipmentItem";

export class ProjectileSystem {
  projectiles: Projectile[] = [];

  constructor(
    private entityManager: EntityManager,
    private eventBus: EventBus
  ) {}

  add(projectile: Projectile): void {
    this.projectiles.push(projectile);
  }

  update(dt: number): void {
    const entities = this.entityManager.getAllEntities();

    for (const proj of this.projectiles) {
      if (!proj.isAlive) continue;
      proj.update(dt);

      // 월드 경계 체크
      if (
        proj.position.x < 0 || proj.position.x > CONFIG.WORLD.WIDTH ||
        proj.position.y < 0 || proj.position.y > CONFIG.WORLD.HEIGHT
      ) {
        proj.isAlive = false;
        continue;
      }

      // 엄폐물 충돌 체크
      for (const obs of this.entityManager.obstacles) {
        const dist = proj.position.distanceTo(obs.position);
        if (dist < obs.radius + proj.radius) {
          proj.isAlive = false;
          break;
        }
      }
      if (!proj.isAlive) continue;

      // 엔티티 충돌 체크
      for (const entity of entities) {
        if (!entity.isAlive || entity.id === proj.ownerId) continue;

        const dist = proj.position.distanceTo(entity.position);
        if (dist < entity.radius + proj.radius) {
          // 실드 버프: 피격 흡수
          if (entity.hasBuff(BuffType.SHIELD) && entity.shieldHits > 0) {
            entity.shieldHits--;
            proj.isAlive = false;
            if (entity.shieldHits <= 0) {
              entity.activeBuffs = entity.activeBuffs.filter((b) => b.type !== BuffType.SHIELD);
            }
            break;
          }
          let finalDamage = proj.damage;
          const armorReduction = entity.getEquipStat("damageReduction");
          if (armorReduction > 0) {
            finalDamage *= (1 - armorReduction);
            entity.wearEquip(EquipType.ARMOR);
          }
          entity.mass -= finalDamage;
          proj.isAlive = false;

          if (entity.mass < CONFIG.PLAYER.MIN_MASS) {
            entity.kill();
            this.eventBus.emit("entity:killed", entity.id, "projectile");

            // 발사자 킬 카운트 증가
            const shooter = entities.find((e) => e.id === proj.ownerId);
            if (shooter && "kills" in shooter) {
              (shooter as { kills: number }).kills++;
            }
          }
          break;
        }
      }
    }

    // 죽은 projectile 정리
    this.projectiles = this.projectiles.filter((p) => p.isAlive);
  }

  clear(): void {
    this.projectiles = [];
  }
}
