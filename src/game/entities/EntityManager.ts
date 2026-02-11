import { Entity } from "./Entity";
import { Player } from "./Player";
import { Bot } from "./Bot";
import { FoodItem } from "./FoodItem";
import { Obstacle } from "./Obstacle";
import { Vector2 } from "../utils/Vector2";
import { SpatialHash } from "../utils/SpatialHash";
import { CONFIG } from "../core/GameConfig";
import { randomRange, randomColor, randomPointInCircle } from "../utils/MathUtils";

const OBSTACLE_COUNT = 30;
const OBSTACLE_MIN_RADIUS = 25;
const OBSTACLE_MAX_RADIUS = 60;

export class EntityManager {
  player: Player | null = null;
  bots: Bot[] = [];
  food: FoodItem[] = [];
  obstacles: Obstacle[] = [];
  entityHash: SpatialHash<Entity> = new SpatialHash(200);

  initPlayer(name: string): Player {
    const pos = new Vector2(
      randomRange(200, CONFIG.WORLD.WIDTH - 200),
      randomRange(200, CONFIG.WORLD.HEIGHT - 200)
    );
    // 무조건 '제이미'로 설정 요청에 따름 (혹은 입력받은 이름이 없으면 '제이미')
    const finalName = name && name !== "Player" ? name : "제이미";
    this.player = new Player(pos, finalName, randomColor());
    return this.player;
  }

  spawnBots(count: number): void {
    for (let i = 0; i < count; i++) {
      const pos = new Vector2(
        randomRange(200, CONFIG.WORLD.WIDTH - 200),
        randomRange(200, CONFIG.WORLD.HEIGHT - 200)
      );
      // 코잉이1, 코잉이2, ... 형식으로 이름 지정
      const name = `${CONFIG.BOT.NAME_PREFIX}${i + 1}`;
      const bot = new Bot(pos, name, randomColor());
      this.bots.push(bot);
    }
  }

  spawnObstacles(): void {
    for (let i = 0; i < OBSTACLE_COUNT; i++) {
      const pos = new Vector2(
        randomRange(200, CONFIG.WORLD.WIDTH - 200),
        randomRange(200, CONFIG.WORLD.HEIGHT - 200)
      );
      const radius = randomRange(OBSTACLE_MIN_RADIUS, OBSTACLE_MAX_RADIUS);
      this.obstacles.push(new Obstacle(pos, radius));
    }
  }

  spawnFood(count: number): void {
    for (let i = 0; i < count; i++) {
      this.spawnSingleFood();
    }
  }

  spawnSingleFood(): void {
    const pos = new Vector2(
      randomRange(50, CONFIG.WORLD.WIDTH - 50),
      randomRange(50, CONFIG.WORLD.HEIGHT - 50)
    );
    const isLarge = Math.random() < CONFIG.WORLD.LARGE_FOOD_CHANCE;
    const food = new FoodItem(pos, isLarge ? 5 : 1);
    this.food.push(food);
  }

  spawnFoodInArea(center: Vector2, radius: number): void {
    const pos = randomPointInCircle(center, radius);
    pos.x = Math.max(50, Math.min(CONFIG.WORLD.WIDTH - 50, pos.x));
    pos.y = Math.max(50, Math.min(CONFIG.WORLD.HEIGHT - 50, pos.y));
    const food = new FoodItem(pos);
    this.food.push(food);
  }

  getAllEntities(): Entity[] {
    const entities: Entity[] = [];
    if (this.player && this.player.isAlive) entities.push(this.player);
    for (const bot of this.bots) {
      if (bot.isAlive) entities.push(bot);
    }
    return entities;
  }

  getAliveCount(): number {
    let count = this.player && this.player.isAlive ? 1 : 0;
    for (const bot of this.bots) {
      if (bot.isAlive) count++;
    }
    return count;
  }

  rebuildHash(): void {
    this.entityHash.clear();
    for (const entity of this.getAllEntities()) {
      this.entityHash.insert(entity);
    }
  }

  cleanup(): void {
    this.food = this.food.filter((f) => f.isAlive);
  }

  getRanking(): { name: string; mass: number; kills: number }[] {
    const entities = this.getAllEntities() as (Player | Bot)[];
    return entities
      .map((e) => ({ name: e.name, mass: e.mass, kills: (e as Player | Bot).kills }))
      .sort((a, b) => b.mass - a.mass);
  }
}
