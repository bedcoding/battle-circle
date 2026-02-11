import { Vector2 } from "../utils/Vector2";

let buffItemId = 0;

export enum BuffType {
  SPEED = "speed",
  SHIELD = "shield",
  DAMAGE = "damage",
  MAGNET = "magnet",
}

export interface BuffDefinition {
  type: BuffType;
  name: string;
  duration: number;
  color: string;
  icon: string;
}

export const BUFF_DEFS: Record<BuffType, BuffDefinition> = {
  [BuffType.SPEED]: {
    type: BuffType.SPEED,
    name: "Speed Boost",
    duration: 6,
    color: "#00e5ff",
    icon: ">>",
  },
  [BuffType.SHIELD]: {
    type: BuffType.SHIELD,
    name: "Shield",
    duration: 8,
    color: "#7c4dff",
    icon: "()",
  },
  [BuffType.DAMAGE]: {
    type: BuffType.DAMAGE,
    name: "Power Shot",
    duration: 8,
    color: "#ff1744",
    icon: "!!",
  },
  [BuffType.MAGNET]: {
    type: BuffType.MAGNET,
    name: "Food Magnet",
    duration: 7,
    color: "#ffea00",
    icon: "@",
  },
};

export class BuffItem {
  id: string;
  position: Vector2;
  buffType: BuffType;
  def: BuffDefinition;
  radius: number = 12;
  isAlive: boolean = true;
  bobPhase: number;

  constructor(position: Vector2, buffType: BuffType) {
    this.id = `buff_${buffItemId++}`;
    this.position = position;
    this.buffType = buffType;
    this.def = BUFF_DEFS[buffType];
    this.bobPhase = Math.random() * Math.PI * 2;
  }
}
