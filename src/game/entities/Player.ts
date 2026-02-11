import { Entity } from "./Entity";
import { Vector2 } from "../utils/Vector2";
import { CONFIG } from "../core/GameConfig";
import { clamp } from "../utils/MathUtils";

export class Player extends Entity {
  /** 현재 이동 방향 (정규화, 키보드 입력) */
  moveDirection: Vector2 = new Vector2(0, 0);
  /** 마우스 조준 위치 (월드 좌표) */
  aimTarget: Vector2 = new Vector2(0, 0);
  kills: number = 0;
  maxMass: number = 0;

  constructor(position: Vector2, name: string, color: string) {
    super(position, CONFIG.PLAYER.INITIAL_MASS, color);
    this.name = name;
  }

  setMoveDirection(dx: number, dy: number): void {
    this.moveDirection.set(dx, dy);
  }

  update(dt: number): void {
    if (!this.isAlive) return;

    // 키보드 방향 입력이 있을 때만 이동
    const len = this.moveDirection.length();
    if (len > 0.01) {
      const normalized = this.moveDirection.normalize();
      const movement = normalized.scale(this.speed * dt);
      this.position = this.position.add(movement);
    }

    // 월드 경계 제한
    this.position.x = clamp(this.position.x, this.radius, CONFIG.WORLD.WIDTH - this.radius);
    this.position.y = clamp(this.position.y, this.radius, CONFIG.WORLD.HEIGHT - this.radius);

    // 최대 크기 기록
    if (this.mass > this.maxMass) {
      this.maxMass = this.mass;
    }
  }
}
