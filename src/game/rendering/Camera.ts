import { Vector2 } from "../utils/Vector2";
import { lerp } from "../utils/MathUtils";

export class Camera {
  x: number = 0;
  y: number = 0;
  zoom: number = 1;
  private targetZoom: number = 1;
  screenWidth: number;
  screenHeight: number;

  constructor(screenWidth: number, screenHeight: number) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
  }

  follow(target: Vector2, targetRadius: number, dt: number): void {
    // 부드러운 추적
    const smoothing = 3;
    this.x = lerp(this.x, target.x, smoothing * dt);
    this.y = lerp(this.y, target.y, smoothing * dt);

    // 크기에 따른 줌아웃
    this.targetZoom = Math.max(0.3, Math.min(1, 80 / (targetRadius + 30)));
    this.zoom = lerp(this.zoom, this.targetZoom, 2 * dt);
  }

  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: (worldX - this.x) * this.zoom + this.screenWidth / 2,
      y: (worldY - this.y) * this.zoom + this.screenHeight / 2,
    };
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.screenWidth / 2) / this.zoom + this.x,
      y: (screenY - this.screenHeight / 2) / this.zoom + this.y,
    };
  }

  getVisibleBounds(): { left: number; top: number; right: number; bottom: number } {
    const hw = (this.screenWidth / 2) / this.zoom;
    const hh = (this.screenHeight / 2) / this.zoom;
    return {
      left: this.x - hw,
      top: this.y - hh,
      right: this.x + hw,
      bottom: this.y + hh,
    };
  }

  resize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
  }
}
