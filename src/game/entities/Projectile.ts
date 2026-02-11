import { Vector2 } from "../utils/Vector2";

let projectileId = 0;

export class Projectile {
  id: string;
  position: Vector2;
  velocity: Vector2;
  ownerId: string;
  color: string;
  radius: number = 4;
  damage: number = 3; // 공격력 조정 (5 -> 3)
  speed: number = 2000; // 투사체 속도 상향 (600 -> 900)
  lifetime: number = 2;
  isAlive: boolean = true;

  constructor(position: Vector2, direction: Vector2, ownerId: string, color: string) {
    this.id = `proj_${projectileId++}`;
    this.position = position.clone();
    this.velocity = direction.normalize().scale(this.speed);
    this.ownerId = ownerId;
    this.color = color;
  }

  update(dt: number): void {
    if (!this.isAlive) return;
    this.position = this.position.add(this.velocity.scale(dt));
    this.lifetime -= dt;
    if (this.lifetime <= 0) {
      this.isAlive = false;
    }
  }
}
