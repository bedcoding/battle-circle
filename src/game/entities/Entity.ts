import { Vector2 } from "../utils/Vector2";
import { CONFIG } from "../core/GameConfig";
import { SkillSystem, SkillStats, defaultStats } from "../systems/SkillSystem";
import { BuffType } from "./BuffItem";
import { EquipType, EquipRarity } from "./EquipmentItem";

let nextId = 0;

export interface ActiveBuff {
  type: BuffType;
  remaining: number;
  duration: number;
}

export interface EquippedItem {
  type: EquipType;
  rarity: EquipRarity;
  durability: number;
  maxDurability: number;
  stats: Record<string, number>;
}

export abstract class Entity {
  id: string;
  position: Vector2;
  velocity: Vector2;
  mass: number;
  color: string;
  isAlive: boolean = true;
  name: string = "";
  skills: SkillSystem = new SkillSystem();
  activeBuffs: ActiveBuff[] = [];
  shieldHits: number = 0;
  equipment: EquippedItem[] = [];

  constructor(position: Vector2, mass: number, color: string) {
    this.id = `entity_${nextId++}`;
    this.position = position;
    this.velocity = new Vector2(0, 0);
    this.mass = mass;
    this.color = color;
  }

  get radius(): number {
    return Math.sqrt(this.mass) * CONFIG.PLAYER.RADIUS_MULTIPLIER;
  }

  get speed(): number {
    let multiplier = this.skills.stats.speedMultiplier;
    if (this.hasBuff(BuffType.SPEED)) multiplier *= 1.5;
    multiplier *= (1 + this.getEquipStat("speedBoost"));
    return CONFIG.PLAYER.BASE_SPEED * (1 / (1 + this.mass * CONFIG.PLAYER.SPEED_DECAY)) * multiplier;
  }

  get skillStats(): SkillStats {
    return this.skills.stats;
  }

  hasBuff(type: BuffType): boolean {
    return this.activeBuffs.some((b) => b.type === type);
  }

  addBuff(type: BuffType, duration: number): void {
    const existing = this.activeBuffs.find((b) => b.type === type);
    if (existing) {
      existing.remaining = duration;
      existing.duration = duration;
    } else {
      this.activeBuffs.push({ type, remaining: duration, duration });
      if (type === BuffType.SHIELD) {
        this.shieldHits = 3;
      }
    }
  }

  updateBuffs(dt: number): void {
    for (const buff of this.activeBuffs) {
      buff.remaining -= dt;
    }
    this.activeBuffs = this.activeBuffs.filter((b) => b.remaining > 0);
  }

  hasEquip(type: EquipType): boolean {
    return this.equipment.some((e) => e.type === type);
  }

  getEquipStat(key: string): number {
    let total = 0;
    for (const eq of this.equipment) {
      if (eq.durability > 0 && eq.stats[key]) {
        total += eq.stats[key];
      }
    }
    return total;
  }

  equipItem(type: EquipType, rarity: EquipRarity, durability: number, stats: Record<string, number>): void {
    // 같은 타입이면 교체
    this.equipment = this.equipment.filter((e) => e.type !== type);
    this.equipment.push({ type, rarity, durability, maxDurability: durability, stats });
  }

  wearEquip(type: EquipType, amount: number = 1): void {
    const eq = this.equipment.find((e) => e.type === type);
    if (eq) {
      eq.durability -= amount;
      if (eq.durability <= 0) {
        this.equipment = this.equipment.filter((e) => e.type !== type);
      }
    }
  }

  abstract update(dt: number): void;

  kill(): void {
    this.isAlive = false;
  }
}
