import { Vector2 } from "../utils/Vector2";

let equipId = 0;

export enum EquipType {
  ARMOR = "armor",
  SCOPE = "scope",
  BOOTS = "boots",
  HEAVY_AMMO = "heavy_ammo",
}

export enum EquipRarity {
  COMMON = "common",
  RARE = "rare",
  EPIC = "epic",
}

export interface EquipDefinition {
  type: EquipType;
  name: string;
  icon: string;
  color: string;
  baseStats: Record<string, number>;
  baseDurability: number;
}

const RARITY_MULTIPLIER: Record<EquipRarity, { stat: number; durability: number; color: string }> = {
  [EquipRarity.COMMON]: { stat: 1, durability: 1, color: "rgba(255,255,255,0.6)" },
  [EquipRarity.RARE]: { stat: 1.5, durability: 1.4, color: "rgba(60,140,255,0.8)" },
  [EquipRarity.EPIC]: { stat: 2, durability: 1.8, color: "rgba(180,60,255,0.8)" },
};

export const EQUIP_DEFS: Record<EquipType, EquipDefinition> = {
  [EquipType.ARMOR]: {
    type: EquipType.ARMOR,
    name: "Armor",
    icon: "#",
    color: "#78909c",
    baseStats: { damageReduction: 0.3 },
    baseDurability: 15,
  },
  [EquipType.SCOPE]: {
    type: EquipType.SCOPE,
    name: "Scope",
    icon: "+",
    color: "#26c6da",
    baseStats: { projectileSpeed: 1.4, projectileLifetime: 1.5 },
    baseDurability: 20,
  },
  [EquipType.BOOTS]: {
    type: EquipType.BOOTS,
    name: "Boots",
    icon: "^",
    color: "#66bb6a",
    baseStats: { speedBoost: 0.25 },
    baseDurability: 40,
  },
  [EquipType.HEAVY_AMMO]: {
    type: EquipType.HEAVY_AMMO,
    name: "Heavy Ammo",
    icon: "!",
    color: "#ef5350",
    baseStats: { damageBoost: 2 },
    baseDurability: 12,
  },
};

export class EquipmentItem {
  id: string;
  position: Vector2;
  equipType: EquipType;
  rarity: EquipRarity;
  def: EquipDefinition;
  radius: number = 14;
  isAlive: boolean = true;
  bobPhase: number;
  rarityMult: typeof RARITY_MULTIPLIER[EquipRarity];

  constructor(position: Vector2, equipType: EquipType, rarity: EquipRarity) {
    this.id = `equip_${equipId++}`;
    this.position = position;
    this.equipType = equipType;
    this.rarity = rarity;
    this.def = EQUIP_DEFS[equipType];
    this.rarityMult = RARITY_MULTIPLIER[rarity];
    this.bobPhase = Math.random() * Math.PI * 2;
  }

  get durability(): number {
    return Math.round(this.def.baseDurability * this.rarityMult.durability);
  }

  getStatValue(key: string): number {
    return (this.def.baseStats[key] ?? 0) * this.rarityMult.stat;
  }
}
