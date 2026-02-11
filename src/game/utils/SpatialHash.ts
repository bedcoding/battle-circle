import { Vector2 } from "./Vector2";

export interface SpatialEntity {
  id: string;
  position: Vector2;
  radius: number;
}

export class SpatialHash<T extends SpatialEntity> {
  private cellSize: number;
  private grid: Map<string, T[]> = new Map();

  constructor(cellSize: number = 200) {
    this.cellSize = cellSize;
  }

  clear(): void {
    this.grid.clear();
  }

  private getKey(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  insert(entity: T): void {
    const r = entity.radius;
    const minCX = Math.floor((entity.position.x - r) / this.cellSize);
    const maxCX = Math.floor((entity.position.x + r) / this.cellSize);
    const minCY = Math.floor((entity.position.y - r) / this.cellSize);
    const maxCY = Math.floor((entity.position.y + r) / this.cellSize);

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const key = this.getKey(cx, cy);
        let cell = this.grid.get(key);
        if (!cell) {
          cell = [];
          this.grid.set(key, cell);
        }
        cell.push(entity);
      }
    }
  }

  queryArea(position: Vector2, radius: number): T[] {
    const seen = new Set<string>();
    const results: T[] = [];

    const minCX = Math.floor((position.x - radius) / this.cellSize);
    const maxCX = Math.floor((position.x + radius) / this.cellSize);
    const minCY = Math.floor((position.y - radius) / this.cellSize);
    const maxCY = Math.floor((position.y + radius) / this.cellSize);

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const cell = this.grid.get(this.getKey(cx, cy));
        if (!cell) continue;
        for (const entity of cell) {
          if (!seen.has(entity.id)) {
            seen.add(entity.id);
            results.push(entity);
          }
        }
      }
    }
    return results;
  }
}
