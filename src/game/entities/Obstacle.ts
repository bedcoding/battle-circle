import { Vector2 } from "../utils/Vector2";

let obstacleId = 0;

export class Obstacle {
  id: string;
  position: Vector2;
  radius: number;
  color: string;
  health: number;

  constructor(position: Vector2, radius: number) {
    this.id = `obs_${obstacleId++}`;
    this.position = position;
    this.radius = radius;
    this.health = radius * 2; // 크기에 비례하는 내구도
    this.color = `hsl(${30 + Math.random() * 20}, 20%, ${25 + Math.random() * 15}%)`;
  }
}
